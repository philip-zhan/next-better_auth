import { NextResponse } from "next/server";
import { db } from "@/database/db";
import { knowledgeRequests } from "@/database/schema/knowledge-sharing";
import { messageEmbeddings, messages } from "@/database/schema/messages";
import { users } from "@/database/schema/auth-schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const userId = session.session.userId;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "received"; // received | sent | all
    const status = searchParams.get("status"); // pending | approved | denied

    // Create aliases for the users table to join both requester and owner
    const requesterUser = alias(users, "requester_user");
    const ownerUser = alias(users, "owner_user");

    let whereCondition;
    if (type === "received") {
      whereCondition = eq(knowledgeRequests.ownerId, userId);
    } else if (type === "sent") {
      whereCondition = eq(knowledgeRequests.requesterId, userId);
    } else {
      whereCondition = or(
        eq(knowledgeRequests.ownerId, userId),
        eq(knowledgeRequests.requesterId, userId)
      );
    }

    if (status) {
      whereCondition = and(
        whereCondition,
        eq(
          knowledgeRequests.status,
          status as "pending" | "approved" | "denied"
        )
      );
    }

    const requests = await db
      .select({
        id: knowledgeRequests.id,
        requesterId: knowledgeRequests.requesterId,
        ownerId: knowledgeRequests.ownerId,
        embeddingId: knowledgeRequests.embeddingId,
        question: knowledgeRequests.question,
        status: knowledgeRequests.status,
        responseContent: knowledgeRequests.responseContent,
        createdAt: knowledgeRequests.createdAt,
        respondedAt: knowledgeRequests.respondedAt,
        // Embedding content (chunk)
        chunkContent: messageEmbeddings.content,
        chunkIndex: messageEmbeddings.chunkIndex,
        // Parent message content
        parentMessageContent: messages.content,
        parentMessageRole: messages.role,
        // Requester info
        requesterName: requesterUser.name,
        requesterEmail: requesterUser.email,
        requesterImage: requesterUser.image,
        // Owner info
        ownerName: ownerUser.name,
        ownerEmail: ownerUser.email,
        ownerImage: ownerUser.image,
      })
      .from(knowledgeRequests)
      .innerJoin(
        messageEmbeddings,
        eq(knowledgeRequests.embeddingId, messageEmbeddings.id)
      )
      .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
      .innerJoin(requesterUser, eq(knowledgeRequests.requesterId, requesterUser.id))
      .innerJoin(ownerUser, eq(knowledgeRequests.ownerId, ownerUser.id))
      .where(whereCondition)
      .orderBy(desc(knowledgeRequests.createdAt));

    // Format the response
    const formattedRequests = requests.map((r) => ({
      id: r.id,
      question: r.question,
      status: r.status,
      responseContent: r.responseContent,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      isOwner: r.ownerId === userId,
      embedding: {
        id: r.embeddingId,
        content: r.chunkContent,
        chunkIndex: r.chunkIndex,
      },
      parentMessage: {
        content: r.parentMessageContent,
        role: r.parentMessageRole,
      },
      requester: {
        id: r.requesterId,
        name: r.requesterName,
        email: r.requesterEmail,
        image: r.requesterImage,
      },
      owner: {
        id: r.ownerId,
        name: r.ownerName,
        email: r.ownerEmail,
        image: r.ownerImage,
      },
    }));

    return NextResponse.json({
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("Error fetching knowledge requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge requests" },
      { status: 500 }
    );
  }
}

