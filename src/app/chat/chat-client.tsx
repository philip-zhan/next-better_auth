"use client";

import { useState, useCallback } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
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
  const [pendingToolCalls, setPendingToolCalls] = useState<Set<string>>(
    new Set()
  );

  const {
    messages,
    sendMessage,
    status,
    regenerate,
    setMessages,
    addToolResult,
  } = useChat({
    id: conversationId ? String(conversationId) : undefined,
    messages: initialMessages,
    // Automatically send when all tool results are available
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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

  // Handler for knowledge confirmation
  const handleKnowledgeConfirm = useCallback(
    async (
      embeddingId: number,
      question: string
    ): Promise<{ requestSent: boolean; error?: string }> => {
      try {
        const response = await fetch("/api/knowledge/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeddingId, question }),
        });

        if (response.ok) {
          return { requestSent: true };
        }
        const data = await response.json();
        return { requestSent: false, error: data.error || "Request failed" };
      } catch {
        return { requestSent: false, error: "Failed to send request" };
      }
    },
    []
  );

  const handleToolConfirm = useCallback(
    async (toolCallId: string, embeddingId: number, question: string) => {
      setPendingToolCalls((prev) => new Set(prev).add(toolCallId));
      const result = await handleKnowledgeConfirm(embeddingId, question);
      setPendingToolCalls((prev) => {
        const next = new Set(prev);
        next.delete(toolCallId);
        return next;
      });
      addToolResult({
        tool: "askForConfirmation",
        toolCallId,
        output: { confirmed: true, ...result },
      });
    },
    [addToolResult, handleKnowledgeConfirm]
  );

  const handleToolDecline = useCallback(
    (toolCallId: string) => {
      addToolResult({
        tool: "askForConfirmation",
        toolCallId,
        output: { confirmed: false },
      });
    },
    [addToolResult]
  );

  const isToolCallPending = useCallback(
    (toolCallId: string) => pendingToolCalls.has(toolCallId),
    [pendingToolCalls]
  );

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
                onToolConfirm={handleToolConfirm}
                onToolDecline={handleToolDecline}
                isToolCallPending={isToolCallPending}
              />

              <ChatInput status={status} onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
