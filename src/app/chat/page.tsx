"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Actions, Action } from "@/components/ai-elements/actions";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import {
  GlobeIcon,
  RefreshCcwIcon,
  CopyIcon,
  MessageSquareIcon,
} from "lucide-react";
import { UserButton } from "@daveyplate/better-auth-ui";
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
import { Loader } from "@/components/ai-elements/loader";
import { Fragment } from "react";

const models = [
  {
    name: "GPT 5.1 Thinking",
    value: "openai/gpt-5.1-thinking",
  },
  {
    name: "GPT 5.1 Instant",
    value: "openai/gpt-5.1-instant",
  },
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const { messages, sendMessage, status, regenerate } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
        },
      }
    );
    setInput("");
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Chat with AI</h1>
          <UserButton size="icon" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
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
                  {messages.map((message) => (
                    <div key={message.id} className="w-full">
                      {/* Sources (if any) */}
                      {message.role === "assistant" &&
                        message.parts.filter(
                          (part) => part.type === "source-url"
                        ).length > 0 && (
                          <Sources className="mb-2">
                            <SourcesTrigger
                              count={
                                message.parts.filter(
                                  (part) => part.type === "source-url"
                                ).length
                              }
                            />
                            {message.parts
                              .filter((part) => part.type === "source-url")
                              .map((part, i) => (
                                <SourcesContent
                                  key={`${message.id}-source-${i}`}
                                >
                                  <Source href={part.url} title={part.url} />
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
                                    message.parts.filter(
                                      (p) => p.type === "text"
                                    ).length -
                                      1 && (
                                    <Actions className="mt-2 ml-10">
                                      <Action
                                        onClick={() => regenerate()}
                                        label="Regenerate response"
                                        tooltip="Regenerate response"
                                      >
                                        <RefreshCcwIcon className="size-4" />
                                      </Action>
                                      <Action
                                        onClick={() =>
                                          navigator.clipboard.writeText(
                                            part.text
                                          )
                                        }
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
                                  status === "streaming" &&
                                  partIndex === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );

                          default:
                            return null;
                        }
                      })}
                    </div>
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

          {/* Input Area */}
          <div className="shrink-0 p-4">
            <PromptInput
              onSubmit={handleSubmit}
              globalDrop
              multiple
              accept="image/*"
              maxFiles={10}
              maxFileSize={10 * 1024 * 1024} // 10MB
            >
              <PromptInputBody>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  placeholder="Message ChatGPT..."
                />
              </PromptInputBody>
              <PromptInputToolbar>
                <PromptInputTools>
                  {/* Add Attachments Menu */}
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments label="Add images" />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>

                  {/* Web Search Toggle */}
                  <PromptInputButton
                    variant={webSearch ? "default" : "ghost"}
                    onClick={() => setWebSearch(!webSearch)}
                  >
                    <GlobeIcon className="size-4" />
                    <span className="hidden sm:inline">Search</span>
                  </PromptInputButton>

                  {/* Model Selection */}
                  <PromptInputModelSelect
                    onValueChange={(value) => setModel(value)}
                    value={model}
                  >
                    <PromptInputModelSelectTrigger>
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((m) => (
                        <PromptInputModelSelectItem
                          key={m.value}
                          value={m.value}
                        >
                          {m.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>

                {/* Submit Button */}
                <PromptInputSubmit
                  disabled={!input.trim() && status !== "streaming"}
                  status={status}
                />
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}
