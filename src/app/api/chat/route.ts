import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  tool,
} from "ai";
import {
  findEnhancedRelevantContent,
  generateEmbeddings,
} from "@/lib/embedding";
import { z } from "zod";
import { db } from "@/database/db";
import { conversations } from "@/database/schema/conversations";
import { messages, messageEmbeddings } from "@/database/schema/messages";
import { getSession, DEFAULT_ORGANIZATION_ID } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

async function getOrCreateConversation(
  userId: string,
  organizationId: string | null,
  conversationId: number | null,
  firstMessage: string
): Promise<number> {
  if (conversationId) {
    // Verify the conversation belongs to this user
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return conversationId;
    }
  }

  // Create a new conversation with auto-generated title from first message
  const title =
    firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
  const [newConversation] = await db
    .insert(conversations)
    .values({
      userId,
      organizationId,
      title,
    })
    .returning({ id: conversations.id });

  return newConversation.id;
}

async function saveMessage(
  conversationId: number,
  role: "user" | "assistant" | "system",
  content: string
): Promise<number> {
  const [savedMessage] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
    })
    .returning({ id: messages.id });

  return savedMessage.id;
}

async function generateAndSaveEmbeddings(
  messageId: number,
  content: string
): Promise<void> {
  const embeddingsData = await generateEmbeddings(content);

  if (embeddingsData.length > 0) {
    await db.insert(messageEmbeddings).values(
      embeddingsData.map((e, index) => ({
        messageId,
        content: e.content,
        embedding: e.embedding,
        chunkIndex: index,
      }))
    );
  }
}

const DEFAULT_MODEL = "openai/gpt-5.1-thinking";

export async function POST(req: Request) {
  const {
    messages: chatMessages,
    model = DEFAULT_MODEL,
    conversationId,
  }: {
    messages: UIMessage[];
    model?: string;
    conversationId?: number;
  } = await req.json();

  // Get the current user session
  const session = await getSession();
  const userId = session.session.userId;
  // For POC: use default organization if no active org is set
  const organizationId =
    session.session.activeOrganizationId || DEFAULT_ORGANIZATION_ID;

  // Get the latest user message
  const latestUserMessage = chatMessages.filter((m) => m.role === "user").pop();
  const userContent =
    latestUserMessage?.parts?.find((p) => p.type === "text")?.text || "";

  // Get or create conversation
  const activeConversationId = await getOrCreateConversation(
    userId,
    organizationId,
    conversationId ?? null,
    userContent
  );

  // Save the user message and generate embeddings
  const savedUserMessageId = await saveMessage(
    activeConversationId,
    "user",
    userContent
  );

  // Generate embeddings for user message (non-blocking)
  generateAndSaveEmbeddings(savedUserMessageId, userContent).catch((err) =>
    console.error("Failed to generate embeddings:", err)
  );

  const systemPrompt = `
  You are a helpful AI assistant with access to a knowledge base.
  When searching for information using the getInformation tool:
  1. If the answer is found in knowledgeSources, use that information to respond
  2. If knowledgeSources don't have the answer, but knowledgeSourceSuggestions shows someone who might know:
    - Call the askForConfirmation tool to ask the user if they want to request knowledge from that person
    - The tool will display a UI for the user to confirm or decline
  3. Do NOT mention asking for confirmation in your text response - just call the askForConfirmation tool
  `;

  const result = streamText({
    model: model,
    system: systemPrompt,
    messages: convertToModelMessages(chatMessages),
    stopWhen: stepCountIs(10),
    tools: {
      getInformation: tool({
        description: `get information from your knowledge base to answer questions. Return the knowledge sources and knowledge source suggestions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => {
          console.log("[getInformation] Searching for:", question);
          const { knowledgeSources, knowledgeSourceSuggestions } =
            await findEnhancedRelevantContent(question);
          console.log(
            "[getInformation] knowledgeSources count:",
            knowledgeSources.length
          );
          console.log(
            "[getInformation] knowledgeSourceSuggestions count:",
            knowledgeSourceSuggestions.length
          );
          return {
            knowledgeSources,
            knowledgeSourceSuggestions,
          };
        },
      }),
      // Client-side tool that shows confirmation UI - no execute function
      askForConfirmation: tool({
        description: `Ask the user for confirmation to request knowledge from another organization member. This will display a UI with the person's name and buttons for the user to confirm or decline.`,
        inputSchema: z.object({
          ownerName: z
            .string()
            .describe("The name of the person who may have the knowledge"),
          embeddingId: z
            .number()
            .describe("The embedding ID of the knowledge to request"),
          question: z
            .string()
            .describe("The original question that led to this suggestion"),
        }),
        // No execute function - this is handled client-side
      }),
    },
    onFinish: async ({ text }) => {
      // Save the assistant message
      if (text) {
        await saveMessage(activeConversationId, "assistant", text);
      }
    },
  });

  // Return the stream response with the conversation ID in message metadata
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
    messageMetadata: ({ part }) => {
      // Include conversation ID in the message start metadata
      if (part.type === "start") {
        return { conversationId: activeConversationId };
      }
      return undefined;
    },
  });
}
