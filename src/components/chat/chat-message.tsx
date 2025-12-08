"use client";

import { Fragment } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Actions, Action } from "@/components/ai-elements/actions";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { RefreshCcwIcon, CopyIcon } from "lucide-react";
import {
  KnowledgeConfirmation,
  type ConfirmationInput,
} from "./knowledge-confirmation";

type ChatMessageProps = {
  message: UIMessage;
  isStreaming: boolean;
  isLastMessage: boolean;
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

export function ChatMessage({
  message,
  isStreaming,
  isLastMessage,
  onRegenerate,
  onToolConfirm,
  onToolDecline,
  isToolCallPending,
}: ChatMessageProps) {
  const sourceParts = message.parts.filter(
    (part) => part.type === "source-url"
  );
  const hasSources = message.role === "assistant" && sourceParts.length > 0;

  return (
    <div className="w-full">
      {/* Sources (if any) */}
      {hasSources && (
        <Sources className="mb-2">
          <SourcesTrigger count={sourceParts.length} />
          {sourceParts.map((part, i) => (
            <SourcesContent key={`${message.id}-source-${i}`}>
              <Source
                href={(part as { type: "source-url"; url: string }).url}
                title={(part as { type: "source-url"; url: string }).url}
              />
            </SourcesContent>
          ))}
        </Sources>
      )}

      {/* Message parts */}
      {message.parts.map((part, partIndex) => {
        // Debug: log part types to help diagnose issues
        console.log("[ChatMessage] Part type:", part.type, part);
        switch (part.type) {
          case "text":
            return (
              <Fragment key={`${message.id}-text-${partIndex}`}>
                <Message from={message.role}>
                  <MessageContent variant="flat">
                    <Response>{part.text}</Response>
                  </MessageContent>
                </Message>

                {/* Actions for assistant messages */}
                {message.role === "assistant" &&
                  partIndex ===
                    message.parts.filter((p) => p.type === "text").length -
                      1 && (
                    <Actions className="mt-2 ml-10">
                      <Action
                        onClick={onRegenerate}
                        label="Regenerate response"
                        tooltip="Regenerate response"
                      >
                        <RefreshCcwIcon className="size-4" />
                      </Action>
                      <Action
                        onClick={() => navigator.clipboard.writeText(part.text)}
                        label="Copy to clipboard"
                        tooltip="Copy to clipboard"
                      >
                        <CopyIcon className="size-4" />
                      </Action>
                    </Actions>
                  )}
              </Fragment>
            );

          case "reasoning":
            return (
              <Reasoning
                key={`${message.id}-reasoning-${partIndex}`}
                className="mb-2 w-full"
                isStreaming={
                  isStreaming &&
                  partIndex === message.parts.length - 1 &&
                  isLastMessage
                }
              >
                <ReasoningTrigger />
                <ReasoningContent>
                  {(part as { type: "reasoning"; text: string }).text}
                </ReasoningContent>
              </Reasoning>
            );

          // Handle getInformation tool with requiresConfirmation
          case "tool-getInformation": {
            const toolPart = part as unknown as {
              type: "tool-getInformation";
              toolCallId: string;
              state: "partial-call" | "call" | "result" | "output-available";
              output?: {
                requiresConfirmation?: boolean;
                confirmationData?: ConfirmationInput;
                userConfirmed?: boolean;
                requestSent?: boolean;
                error?: string;
              };
            };

            // Only render if we have output with requiresConfirmation
            if (!toolPart.output?.requiresConfirmation) {
              return null;
            }

            const confirmationData = toolPart.output.confirmationData;
            if (!confirmationData) return null;

            // Determine the state for the confirmation component
            const isPending = isToolCallPending?.(toolPart.toolCallId) ?? false;
            let confirmationState:
              | "input-available"
              | "output-available"
              | "loading";
            if (isPending) {
              confirmationState = "loading";
            } else if (toolPart.output.userConfirmed !== undefined) {
              confirmationState = "output-available";
            } else {
              confirmationState = "input-available";
            }

            return (
              <div
                key={`${message.id}-tool-${partIndex}`}
                className="my-3 ml-10"
              >
                <KnowledgeConfirmation
                  input={confirmationData}
                  state={confirmationState}
                  output={
                    toolPart.output.userConfirmed !== undefined
                      ? {
                          confirmed: toolPart.output.userConfirmed,
                          requestSent: toolPart.output.requestSent,
                          error: toolPart.output.error,
                        }
                      : undefined
                  }
                  onConfirm={() =>
                    onToolConfirm?.(
                      toolPart.toolCallId,
                      confirmationData.embeddingId,
                      confirmationData.question,
                      confirmationData.ownerName
                    )
                  }
                  onDecline={() => onToolDecline?.(toolPart.toolCallId)}
                />
              </div>
            );
          }

          // Handle askForConfirmation tool (legacy)
          case "tool-askForConfirmation": {
            const toolPart = part as unknown as {
              type: "tool-askForConfirmation";
              toolCallId: string;
              state: "partial-call" | "call" | "result";
              input?: ConfirmationInput;
              output?: {
                confirmed: boolean;
                requestSent?: boolean;
                error?: string;
              };
            };

            // Don't render while still streaming the tool call
            if (toolPart.state === "partial-call") {
              return null;
            }

            const input = toolPart.input;
            if (!input) return null;

            // Determine the state for the confirmation component
            const isPending = isToolCallPending?.(toolPart.toolCallId) ?? false;
            let confirmationState:
              | "input-available"
              | "output-available"
              | "loading";
            if (isPending) {
              confirmationState = "loading";
            } else if (toolPart.state === "result") {
              confirmationState = "output-available";
            } else {
              confirmationState = "input-available";
            }

            return (
              <div
                key={`${message.id}-tool-${partIndex}`}
                className="my-3 ml-10"
              >
                <KnowledgeConfirmation
                  input={input}
                  state={confirmationState}
                  output={toolPart.output}
                  onConfirm={() =>
                    onToolConfirm?.(
                      toolPart.toolCallId,
                      input.embeddingId,
                      input.question,
                      input.ownerName
                    )
                  }
                  onDecline={() => onToolDecline?.(toolPart.toolCallId)}
                />
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
