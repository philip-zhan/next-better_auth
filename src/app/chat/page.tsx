import { db } from "@/database/db";
import { conversations } from "@/database/schema/conversations";
import { messages } from "@/database/schema/messages";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { ChatClient } from "./chat-client";
import type { UIMessage } from "ai";

type SearchParams = Promise<{ c?: string }>;

async function getConversations(userId: string) {
  return db
    .select({
      id: conversations.id,
      publicId: conversations.publicId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

async function getConversationMessages(publicId: string, userId: string) {
  // First verify the conversation belongs to this user
  const conversation = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.publicId, publicId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (conversation.length === 0) {
    return null;
  }

  const conversationId = conversation[0].id;

  const dbMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  // Convert to UIMessage format for useChat
  const uiMessages: UIMessage[] = dbMessages.map((msg) => ({
    id: String(msg.id),
    role: msg.role as "user" | "assistant" | "system",
    parts: [{ type: "text" as const, text: msg.content }],
  }));

  return uiMessages;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  const userId = session.session.userId;
  const params = await searchParams;

  // Fetch all conversations for this user
  const userConversations = await getConversations(userId);

  // Get conversation publicId from URL params
  const publicId = params.c || null;

  // Fetch messages if we have a valid conversation publicId
  let initialMessages: UIMessage[] = [];
  let validPublicId: string | null = publicId;
  
  if (publicId) {
    const messages = await getConversationMessages(publicId, userId);
    if (messages === null) {
      // Conversation doesn't exist or doesn't belong to user, show new chat
      validPublicId = null;
    } else {
      initialMessages = messages;
    }
  }

  return (
    <ChatClient
      conversations={userConversations}
      initialMessages={initialMessages}
      conversationId={validPublicId}
    />
  );
}
