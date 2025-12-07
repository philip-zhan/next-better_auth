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
import {
  knowledgeRequests,
  knowledgeShares,
} from "@/database/schema/knowledge-sharing";
import { notifications } from "@/database/schema/notifications";
import { users } from "@/database/schema/auth-schema";
import { getSession, DEFAULT_ORGANIZATION_ID } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { triggerKnowledgeRequest } from "@/lib/pusher";

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
    conversationId,
  }: {
    messages: UIMessage[];
    model: string;
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

  const systemPrompt = `You are a helpful AI assistant with access to a knowledge base.

When searching for information using the getInformation tool:
1. First check your own knowledge (ownResults) and shared knowledge (sharedResults)
2. If the answer is found in ownResults or sharedResults, use that information to respond
3. If ownResults and sharedResults don't have the answer, but potentialSources shows someone who might know:
   - Inform the user that a colleague may have relevant knowledge
   - For example: "[Name] may know about this. Would you like me to ask them?"
   - Wait for the user's confirmation before calling requestKnowledge
   - A UI button will also appear for the user to click directly
4. Only call requestKnowledge if the user explicitly confirms (says "yes", "sure", "please ask them", etc.)
5. Never reveal the actual content of knowledge that hasn't been shared yet - only mention who might have it`;

  const result = streamText({
    model: model,
    system: systemPrompt,
    messages: convertToModelMessages(chatMessages),
    stopWhen: stepCountIs(10),
    tools: {
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => {
          const { ownResults, sharedResults, otherMembersResults } =
            await findEnhancedRelevantContent(question);
          // Return authorized knowledge - user's own and explicitly shared
          // For otherMembersResults, return only metadata (no content) for privacy
          // The AI can suggest requesting access from these users
          const potentialSources = otherMembersResults.map((r) => ({
            embeddingId: r.embeddingId,
            ownerName: r.ownerName,
            ownerEmail: r.ownerEmail,
            ownerId: r.ownerId,
            similarity: r.similarity,
            // Content is intentionally omitted for privacy
          }));
          return {
            ownResults,
            sharedResults,
            potentialSources, // Other org members who may have relevant knowledge
          };
        },
      }),
      requestKnowledge: tool({
        description: `Request access to knowledge from another organization member. Use this when the user confirms they want to ask someone for knowledge after you've suggested it. Only call this after the user explicitly agrees.`,
        inputSchema: z.object({
          embeddingId: z
            .number()
            .describe("The embedding ID of the knowledge to request"),
          ownerName: z
            .string()
            .describe("The name of the knowledge owner for confirmation"),
          question: z
            .string()
            .describe("The original question that led to this request"),
        }),
        execute: async ({ embeddingId, ownerName, question }) => {
          console.log("[requestKnowledge] Tool called with:", {
            embeddingId,
            ownerName,
            question,
            requesterId: userId,
          });

          try {
            // Get the embedding and find the owner
            console.log("[requestKnowledge] Looking up embedding:", embeddingId);
            const embeddingData = await db
              .select({
                embeddingId: messageEmbeddings.id,
                ownerId: conversations.userId,
              })
              .from(messageEmbeddings)
              .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
              .innerJoin(
                conversations,
                eq(messages.conversationId, conversations.id)
              )
              .where(eq(messageEmbeddings.id, embeddingId))
              .limit(1);

            if (embeddingData.length === 0) {
              console.log("[requestKnowledge] Embedding not found:", embeddingId);
              return {
                success: false,
                error: "Knowledge source not found",
              };
            }

            const ownerId = embeddingData[0].ownerId;
            console.log("[requestKnowledge] Found embedding owner:", ownerId);

            // Can't request your own knowledge
            if (ownerId === userId) {
              console.log("[requestKnowledge] User tried to request own knowledge");
              return {
                success: false,
                error: "This is your own knowledge",
              };
            }

            // Check if already shared
            console.log("[requestKnowledge] Checking if already shared...");
            const existingShare = await db
              .select()
              .from(knowledgeShares)
              .where(
                and(
                  eq(knowledgeShares.embeddingId, embeddingId),
                  eq(knowledgeShares.sharedWithUserId, userId)
                )
              )
              .limit(1);

            if (existingShare.length > 0) {
              console.log("[requestKnowledge] Knowledge already shared with user");
              return {
                success: false,
                error: "This knowledge is already shared with you",
              };
            }

            // Check if pending request already exists
            console.log("[requestKnowledge] Checking for pending request...");
            const existingRequest = await db
              .select()
              .from(knowledgeRequests)
              .where(
                and(
                  eq(knowledgeRequests.embeddingId, embeddingId),
                  eq(knowledgeRequests.requesterId, userId),
                  eq(knowledgeRequests.status, "pending")
                )
              )
              .limit(1);

            if (existingRequest.length > 0) {
              console.log("[requestKnowledge] Pending request already exists");
              return {
                success: false,
                error: "You already have a pending request for this knowledge",
              };
            }

            // Create the knowledge request
            console.log("[requestKnowledge] Creating new knowledge request...");
            const [newRequest] = await db
              .insert(knowledgeRequests)
              .values({
                requesterId: userId,
                ownerId,
                embeddingId,
                question,
                status: "pending",
              })
              .returning();
            console.log("[requestKnowledge] Created request:", newRequest.id);

            // Create notification for the owner
            console.log("[requestKnowledge] Creating notification for owner...");
            const embeddingContent = await db
              .select({ content: messageEmbeddings.content })
              .from(messageEmbeddings)
              .where(eq(messageEmbeddings.id, embeddingId))
              .limit(1);

            await db.insert(notifications).values({
              userId: ownerId,
              type: "knowledge_request",
              payload: {
                requestId: newRequest.id,
                requesterId: userId,
                embeddingId,
                question,
                chunkContent: embeddingContent[0]?.content || "",
              },
            });
            console.log("[requestKnowledge] Notification created");

            // Get requester info for Pusher event
            const [requesterInfo] = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            // Trigger realtime notification via Pusher
            console.log("[requestKnowledge] Triggering Pusher event for owner:", ownerId);
            await triggerKnowledgeRequest(ownerId, {
              requestId: newRequest.id,
              question,
              requesterName: requesterInfo?.name || "",
              requesterEmail: requesterInfo?.email || "",
              createdAt: new Date().toISOString(),
            });
            console.log("[requestKnowledge] Pusher event triggered");

            console.log("[requestKnowledge] Success! Request ID:", newRequest.id);
            return {
              success: true,
              message: `Knowledge request sent to ${ownerName}. They will be notified and can choose to share their knowledge with you.`,
              requestId: newRequest.id,
            };
          } catch (error) {
            console.error("[requestKnowledge] Error:", error);
            return {
              success: false,
              error: "Failed to send knowledge request",
            };
          }
        },
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
