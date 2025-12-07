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
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

async function getConversationMessages(conversationId: number, userId: string) {
  // First verify the conversation belongs to this user
  const conversation = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (conversation.length === 0) {
    return null;
  }

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

  // Get conversation ID from URL params
  const conversationId = params.c ? Number.parseInt(params.c, 10) : null;

  // Fetch messages if we have a valid conversation ID
  let initialMessages: UIMessage[] = [];
  let validConversationId: number | null = conversationId;
  
  if (conversationId) {
    const messages = await getConversationMessages(conversationId, userId);
    if (messages === null) {
      // Conversation doesn't exist or doesn't belong to user, show new chat
      validConversationId = null;
    } else {
      initialMessages = messages;
    }
  }

  return (
    <ChatClient
      conversations={userConversations}
      initialMessages={initialMessages}
      conversationId={validConversationId}
    />
  );
}
