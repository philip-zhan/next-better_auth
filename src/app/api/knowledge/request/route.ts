import { NextResponse } from "next/server";
import { db } from "@/database/db";
import {
  knowledgeRequests,
  knowledgeShares,
} from "@/database/schema/knowledge-sharing";
import { messageEmbeddings, messages } from "@/database/schema/messages";
import { conversations } from "@/database/schema/conversations";
import { notifications } from "@/database/schema/notifications";
import { getSession, getUserId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  embeddingId: z.number(),
  question: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const requesterId = session.session.userId;

    const body = await req.json();
    const { embeddingId, question } = requestSchema.parse(body);

    // Get the embedding and find the owner
    const embeddingData = await db
      .select({
        embeddingId: messageEmbeddings.id,
        messageId: messageEmbeddings.messageId,
        content: messageEmbeddings.content,
        ownerId: conversations.userId,
      })
      .from(messageEmbeddings)
      .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(messageEmbeddings.id, embeddingId))
      .limit(1);

    if (embeddingData.length === 0) {
      return NextResponse.json(
        { error: "Embedding not found" },
        { status: 404 }
      );
    }

    const ownerId = embeddingData[0].ownerId;

    // Can't request your own knowledge
    if (ownerId === requesterId) {
      return NextResponse.json(
        { error: "Cannot request your own knowledge" },
        { status: 400 }
      );
    }

    // Check if already shared
    const existingShare = await db
      .select()
      .from(knowledgeShares)
      .where(
        and(
          eq(knowledgeShares.embeddingId, embeddingId),
          eq(knowledgeShares.sharedWithUserId, requesterId)
        )
      )
      .limit(1);

    if (existingShare.length > 0) {
      return NextResponse.json(
        { error: "This knowledge is already shared with you" },
        { status: 400 }
      );
    }

    // Check if pending request already exists
    const existingRequest = await db
      .select()
      .from(knowledgeRequests)
      .where(
        and(
          eq(knowledgeRequests.embeddingId, embeddingId),
          eq(knowledgeRequests.requesterId, requesterId),
          eq(knowledgeRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending request for this knowledge" },
        { status: 400 }
      );
    }

    // Create the knowledge request
    const [newRequest] = await db
      .insert(knowledgeRequests)
      .values({
        requesterId,
        ownerId,
        embeddingId,
        question,
        status: "pending",
      })
      .returning();

    // Create notification for the owner
    await db.insert(notifications).values({
      userId: ownerId,
      type: "knowledge_request",
      payload: {
        requestId: newRequest.id,
        requesterId,
        embeddingId,
        question,
        chunkContent: embeddingData[0].content,
      },
    });

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
    });
  } catch (error) {
    console.error("Error creating knowledge request:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create knowledge request" },
      { status: 500 }
    );
  }
}

