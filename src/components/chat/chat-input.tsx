"use client";

import { useState } from "react";
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
import { GlobeIcon } from "lucide-react";

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

type ChatInputProps = {
  status: "ready" | "submitted" | "streaming" | "error";
  onSubmit: (
    message: PromptInputMessage,
    model: string,
    webSearch: boolean
  ) => void;
};

export function ChatInput({ status, onSubmit }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    onSubmit(message, model, webSearch);
    setInput("");
  };

  return (
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
                  <PromptInputModelSelectItem key={m.value} value={m.value}>
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
  );
}
