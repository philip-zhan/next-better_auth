import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  tool,
} from "ai";
import { findRelevantContent, generateEmbeddings } from "@/lib/embedding";
import { z } from "zod";
import { db } from "@/database/db";
import { conversations } from "@/database/schema/conversations";
import { messages, messageEmbeddings } from "@/database/schema/messages";
import { getSession } from "@/lib/auth";
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

export async function POST(req: Request) {
  const {
    messages: chatMessages,
    model,
    webSearch,
    conversationId,
  }: {
    messages: UIMessage[];
    model: string;
    webSearch: boolean;
    conversationId?: number;
  } = await req.json();

  // Get the current user session
  const session = await getSession();
  const userId = session.session.userId;
  const organizationId = session.session.activeOrganizationId;

  // Get the latest user message
  const latestUserMessage = chatMessages
    .filter((m) => m.role === "user")
    .pop();
  const userContent =
    latestUserMessage?.parts?.find((p) => p.type === "text")?.text || "";

  // Get or create conversation
  const activeConversationId = await getOrCreateConversation(
    userId,
    organizationId ?? null,
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

  const result = streamText({
    model: model,
    messages: convertToModelMessages(chatMessages),
    stopWhen: stepCountIs(10),
    tools: {
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
    onFinish: async ({ text }) => {
      // Save the assistant message
      if (text) {
        await saveMessage(activeConversationId, "assistant", text);
      }
    },
  });

  // Return the stream response with the conversation ID in headers
  const response = result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });

  // Add conversation ID to response headers
  response.headers.set("X-Conversation-Id", String(activeConversationId));

  return response;
}
