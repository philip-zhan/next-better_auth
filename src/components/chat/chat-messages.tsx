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
  onToolConfirm?: (
    toolCallId: string,
    embeddingId: number,
    question: string,
    ownerName: string
  ) => void;
  onToolDecline?: (toolCallId: string) => void;
  isToolCallPending?: (toolCallId: string) => boolean;
};

// Hidden system messages that shouldn't be displayed
const HIDDEN_MESSAGE_PATTERNS = [
  /^\[User declined to request knowledge from that person\]$/,
  /^\[Knowledge request approved - please search again and answer my original question: ".*"\]$/,
];

function isHiddenMessage(text: string): boolean {
  return HIDDEN_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function ChatMessages({
  messages,
  status,
  onRegenerate,
  onToolConfirm,
  onToolDecline,
  isToolCallPending,
}: ChatMessagesProps) {
  // Filter out hidden system messages
  const visibleMessages = messages.filter((msg) => {
    const textPart = msg.parts.find((p) => p.type === "text");
    if (textPart && "text" in textPart) {
      return !isHiddenMessage(textPart.text);
    }
    return true;
  });

  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent>
        {visibleMessages.length === 0 ? (
          <ConversationEmptyState
            title="Start a conversation"
            description="Ask me anything! I'm here to help."
            icon={<MessageSquareIcon className="size-12" />}
          />
        ) : (
          <>
            {visibleMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={status === "streaming"}
                isLastMessage={index === visibleMessages.length - 1}
                onRegenerate={onRegenerate}
                onToolConfirm={onToolConfirm}
                onToolDecline={onToolDecline}
                isToolCallPending={isToolCallPending}
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
