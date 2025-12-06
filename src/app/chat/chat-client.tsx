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
import { Fragment, useState, useCallback } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import {
  GlobeIcon,
  RefreshCcwIcon,
  CopyIcon,
  MessageSquareIcon,
  PlusIcon,
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

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

type ConversationItem = {
  id: number;
  title: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type ChatClientProps = {
  conversations: ConversationItem[];
  initialMessages: UIMessage[];
  conversationId: number | null;
};

// Helper function to group conversations by time
function groupConversationsByTime(conversations: ConversationItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; conversations: ConversationItem[] }[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Previous 7 days", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  for (const conv of conversations) {
    const date = conv.updatedAt ? new Date(conv.updatedAt) : new Date(0);
    if (date >= today) {
      groups[0].conversations.push(conv);
    } else if (date >= yesterday) {
      groups[1].conversations.push(conv);
    } else if (date >= lastWeek) {
      groups[2].conversations.push(conv);
    } else {
      groups[3].conversations.push(conv);
    }
  }

  return groups.filter((g) => g.conversations.length > 0);
}

export function ChatClient({
  conversations,
  initialMessages,
  conversationId,
}: ChatClientProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(conversationId);

  const { messages, sendMessage, status, regenerate, setMessages } = useChat({
    id: conversationId ? String(conversationId) : undefined,
    messages: initialMessages,
    onFinish: useCallback(
      (options: { message: UIMessage }) => {
        // After receiving a response, if we don't have a conversation ID yet,
        // we need to refresh to get the new conversation in the sidebar
        if (!currentConversationId) {
          router.refresh();
        }
      },
      [currentConversationId, router]
    ),
  });

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Send the message with conversation ID in the body
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
    setInput("");
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    router.push("/chat");
  };

  const handleSelectConversation = (id: number) => {
    router.push(`/chat?c=${id}`);
  };

  const groupedConversations = groupConversationsByTime(conversations);

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <PlusIcon className="size-4" />
            New Chat
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            {groupedConversations.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-xs text-muted-foreground">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.conversations.map((conv) => (
                      <SidebarMenuItem key={conv.id}>
                        <SidebarMenuButton
                          onClick={() => handleSelectConversation(conv.id)}
                          isActive={conversationId === conv.id}
                          className="w-full justify-start"
                        >
                          <MessageSquareIcon className="size-4 shrink-0" />
                          <span className="truncate">{conv.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
            {conversations.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </ScrollArea>
        </SidebarContent>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset>
        <div className="flex h-screen w-full flex-col bg-background">
          {/* Header */}
          <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-xl font-semibold">Chat with AI</h1>
              </div>
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
                                  <Fragment
                                    key={`${message.id}-text-${partIndex}`}
                                  >
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
                                    <ReasoningContent>
                                      {(part as { type: "reasoning"; text: string }).text}
                                    </ReasoningContent>
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
                      {(attachment) => (
                        <PromptInputAttachment data={attachment} />
                      )}
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
      </SidebarInset>
    </SidebarProvider>
  );
}

