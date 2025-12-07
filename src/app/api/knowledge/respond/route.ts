import { NextResponse } from "next/server";
import { db } from "@/database/db";
import {
  knowledgeRequests,
  knowledgeShares,
} from "@/database/schema/knowledge-sharing";
import { notifications } from "@/database/schema/notifications";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { triggerKnowledgeResponse } from "@/lib/pusher";

const respondSchema = z.object({
  requestId: z.number(),
  action: z.enum(["approve", "deny"]),
  responseContent: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.session.userId;

    const body = await req.json();
    const { requestId, action, responseContent } = respondSchema.parse(body);

    // Get the request and verify ownership
    const [request] = await db
      .select()
      .from(knowledgeRequests)
      .where(
        and(
          eq(knowledgeRequests.id, requestId),
          eq(knowledgeRequests.ownerId, userId),
          eq(knowledgeRequests.status, "pending")
        )
      )
      .limit(1);

    if (!request) {
      return NextResponse.json(
        { error: "Request not found or already processed" },
        { status: 404 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "denied";

    // Update the request status
    await db
      .update(knowledgeRequests)
      .set({
        status: newStatus,
        responseContent: responseContent || null,
        respondedAt: new Date(),
      })
      .where(eq(knowledgeRequests.id, requestId));

    // If approved, create a knowledge share record
    if (action === "approve") {
      await db.insert(knowledgeShares).values({
        embeddingId: request.embeddingId,
        ownerId: userId,
        sharedWithUserId: request.requesterId,
      });
    }

    // Create notification for the requester
    await db.insert(notifications).values({
      userId: request.requesterId,
      type: action === "approve" ? "knowledge_approved" : "knowledge_denied",
      payload: {
        requestId,
        embeddingId: request.embeddingId,
        responseContent: responseContent || null,
      },
    });

    // Trigger realtime notification via Pusher
    await triggerKnowledgeResponse(request.requesterId, {
      requestId,
      status: newStatus as "approved" | "denied",
      responseContent: responseContent || undefined,
      respondedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error responding to knowledge request:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to respond to knowledge request" },
      { status: 500 }
    );
  }
}

