import { NextResponse } from "next/server";
import { db } from "@/database/db";
import { notifications } from "@/database/schema/notifications";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

// GET - Fetch notifications for current user
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const userId = session.session.userId;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    let whereCondition = eq(notifications.userId, userId);
    if (unreadOnly) {
      whereCondition = and(whereCondition, eq(notifications.read, false))!;
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(whereCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Count unread
    const unreadCount = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount: unreadCount.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

const markReadSchema = z.object({
  notificationIds: z.array(z.number()).optional(),
  markAllRead: z.boolean().optional(),
});

// PATCH - Mark notifications as read
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    const userId = session.session.userId;

    const body = await req.json();
    const { notificationIds, markAllRead } = markReadSchema.parse(body);

    if (markAllRead) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(eq(notifications.userId, userId), eq(notifications.read, false))
        );
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      for (const notificationId of notificationIds) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(
            and(
              eq(notifications.id, notificationId),
              eq(notifications.userId, userId)
            )
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a notification
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const userId = session.session.userId;

    const { searchParams } = new URL(req.url);
    const notificationId = Number(searchParams.get("id"));

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}

