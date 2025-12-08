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
  onToolConfirm?: (toolCallId: string, embeddingId: number, question: string) => void;
  onToolDecline?: (toolCallId: string) => void;
};

export function ChatMessage({
  message,
  isStreaming,
  isLastMessage,
  onRegenerate,
  onToolConfirm,
  onToolDecline,
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

          // Handle askForConfirmation tool
          case "tool-askForConfirmation": {
            const toolPart = part as unknown as {
              type: "tool-askForConfirmation";
              toolCallId: string;
              state: "partial-call" | "call" | "result";
              input?: ConfirmationInput;
              output?: { confirmed: boolean; requestSent?: boolean; error?: string };
            };

            // Don't render while still streaming the tool call
            if (toolPart.state === "partial-call") {
              return null;
            }

            const input = toolPart.input;
            if (!input) return null;

            const state =
              toolPart.state === "result" ? "output-available" : "input-available";

            return (
              <div key={`${message.id}-tool-${partIndex}`} className="my-3 ml-10">
                <KnowledgeConfirmation
                  input={input}
                  state={state}
                  output={toolPart.output}
                  onConfirm={() =>
                    onToolConfirm?.(
                      toolPart.toolCallId,
                      input.embeddingId,
                      input.question
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
