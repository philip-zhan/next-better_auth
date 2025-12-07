"use client";

import type { UIMessage } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { MessageSquareIcon } from "lucide-react";
import { ChatMessage } from "./chat-message";

type ChatMessagesProps = {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  onRegenerate: () => void;
};

export function ChatMessages({
  messages,
  status,
  onRegenerate,
}: ChatMessagesProps) {
  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent>
        {messages.length === 0 ? (
          <ConversationEmptyState
            title="Start a conversation"
            description="Ask me anything! I'm here to help."
            icon={<MessageSquareIcon className="size-12" />}
          />
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={status === "streaming"}
                isLastMessage={index === messages.length - 1}
                onRegenerate={onRegenerate}
              />
            ))}

            {/* Loading indicator */}
            {status === "submitted" && (
              <div className="flex items-center gap-2 py-4">
                <Loader />
              </div>
            )}
          </>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
