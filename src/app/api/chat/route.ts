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
import { nanoid } from "nanoid";
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
  publicId: string | null,
  firstMessage: string
): Promise<{ id: number; publicId: string }> {
  if (publicId) {
    // Verify the conversation belongs to this user
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.publicId, publicId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { id: existing[0].id, publicId: existing[0].publicId };
    }
  }

  // Create a new conversation with auto-generated title from first message
  const title =
    firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
  const newPublicId = publicId || nanoid();
  const [newConversation] = await db
    .insert(conversations)
    .values({
      userId,
      organizationId,
      title,
      publicId: newPublicId,
    })
    .returning({ id: conversations.id, publicId: conversations.publicId });

  return { id: newConversation.id, publicId: newConversation.publicId };
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

const DEFAULT_MODEL = "openai/gpt-5.1-instant";

export async function POST(req: Request) {
  const {
    messages: chatMessages,
    model = DEFAULT_MODEL,
    conversationId,
    publicId,
  }: {
    messages: UIMessage[];
    model?: string;
    conversationId?: number; // Legacy support
    publicId?: string;
  } = await req.json();

  console.log("[chat/route] Received request with model:", model);
  console.log("[chat/route] Message count:", chatMessages.length);
  console.log("[chat/route] Messages:", JSON.stringify(chatMessages.map(m => ({ role: m.role, partsCount: m.parts?.length }))));

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

  // Get or create conversation (use publicId if provided, fallback to conversationId for legacy support)
  // For legacy support: if conversationId is provided but no publicId, we need to look it up
  let finalPublicId = publicId ?? null;
  if (!finalPublicId && conversationId) {
    const [legacyConv] = await db
      .select({ publicId: conversations.publicId })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);
    if (legacyConv) {
      finalPublicId = legacyConv.publicId;
    }
  }
  
  const conversation = await getOrCreateConversation(
    userId,
    organizationId,
    finalPublicId,
    userContent
  );
  const activeConversationId = conversation.id;

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
  When using the getInformation tool:
  1. If the result has requiresConfirmation: true, do NOT output any text. The system will handle the confirmation.
  2. If the result has requiresConfirmation: false and knowledgeSources has content, use it to respond.
  3. If the result has requiresConfirmation: false and knowledgeSources is empty, provide helpful alternatives.
  
  If you see a message like "[User declined to request knowledge from that person]", 
  the user chose not to ask someone else. Respond helpfully by suggesting where they might 
  find the information themselves (contracts, invoices, CRM, etc.). Do NOT repeat the decline message.
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

          // If there are suggestions, return them with a flag for the client to show confirmation UI
          if (knowledgeSourceSuggestions.length > 0) {
            const suggestion = knowledgeSourceSuggestions[0];
            return {
              knowledgeSources: [],
              requiresConfirmation: true,
              confirmationData: {
                ownerName: suggestion.ownerName,
                embeddingId: suggestion.embeddingId,
                question: question,
              },
            };
          }

          return {
            knowledgeSources,
            requiresConfirmation: false,
          };
        },
      }),
      // Client-side tool that shows confirmation UI - no execute function
      // askForConfirmation: tool({
      //   description: `Ask the user for confirmation to request knowledge from another organization member. This will display a UI with the person's name and buttons for the user to confirm or decline.`,
      //   inputSchema: z.object({
      //     ownerName: z
      //       .string()
      //       .describe("The name of the person who may have the knowledge"),
      //     embeddingId: z
      //       .number()
      //       .describe("The embedding ID of the knowledge to request"),
      //     question: z
      //       .string()
      //       .describe("The original question that led to this suggestion"),
      //   }),
      //   // No execute function - this is handled client-side
      // }),
    },
    onFinish: async ({ text }) => {
      // Save the assistant message
      if (text) {
        await saveMessage(activeConversationId, "assistant", text);
      }
    },
  });

  // Return the stream response with the conversation publicId in message metadata
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
    messageMetadata: ({ part }) => {
      // Include conversation publicId in the message start metadata
      if (part.type === "start") {
        return { conversationId: conversation.publicId };
      }
      return undefined;
    },
  });
}
