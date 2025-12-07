"use client";

import { useState, useCallback } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { ChatSidebar } from "../../components/chat/chat-sidebar";
import { ChatMessages } from "../../components/chat/chat-messages";
import { ChatInput } from "../../components/chat/chat-input";
import type { ConversationItem } from "./types";

type ChatClientProps = {
  conversations: ConversationItem[];
  initialMessages: UIMessage[];
  conversationId: number | null;
};

export function ChatClient({
  conversations,
  initialMessages,
  conversationId,
}: ChatClientProps) {
  const router = useRouter();
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(conversationId);

  const { messages, sendMessage, status, regenerate, setMessages } = useChat({
    id: conversationId ? String(conversationId) : undefined,
    messages: initialMessages,
    onFinish: useCallback(
      (options: { message: UIMessage }) => {
        // Extract conversation ID from message metadata
        const metadata = options.message.metadata as
          | { conversationId?: number }
          | undefined;
        const newConversationId = metadata?.conversationId;

        // If we got a new conversation ID and don't have one yet, redirect to it
        if (newConversationId && !currentConversationId) {
          setCurrentConversationId(newConversationId);
          router.replace(`/chat?c=${newConversationId}`);
        }
      },
      [currentConversationId, router]
    ),
  });

  const handleSubmit = (
    message: PromptInputMessage,
    model: string,
    webSearch: boolean
  ) => {
    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
          conversationId: currentConversationId,
        },
      }
    );
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    router.push("/chat");
  };

  const handleSelectConversation = (id: number) => {
    router.push(`/chat?c=${id}`);
  };

  return (
    <SidebarProvider>
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />

      <SidebarInset>
        <div className="flex h-screen w-full flex-col bg-background">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
              <ChatMessages
                messages={messages}
                status={status}
                onRegenerate={regenerate}
              />

              <ChatInput status={status} onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
