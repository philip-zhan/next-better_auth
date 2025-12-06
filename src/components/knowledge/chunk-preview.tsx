"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon, QuoteIcon } from "lucide-react";
import { useState } from "react";

interface ChunkPreviewProps {
  chunkContent: string;
  parentMessageContent: string;
  parentMessageRole: "user" | "assistant" | "system";
  className?: string;
  showParentByDefault?: boolean;
}

export function ChunkPreview({
  chunkContent,
  parentMessageContent,
  parentMessageRole,
  className,
  showParentByDefault = false,
}: ChunkPreviewProps) {
  const [showParent, setShowParent] = useState(showParentByDefault);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "user":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "assistant":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "system":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Highlighted Chunk */}
      <div className="relative rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
        <div className="absolute -top-2.5 left-3 flex items-center gap-1.5 bg-background px-2 text-xs font-medium text-primary">
          <QuoteIcon className="size-3" />
          <span>Matched Chunk</span>
        </div>
        <p className="text-sm leading-relaxed">{chunkContent}</p>
      </div>

      {/* Parent Message Context */}
      <div>
        <button
          type="button"
          onClick={() => setShowParent(!showParent)}
          className="flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showParent ? (
            <ChevronUpIcon className="size-3" />
          ) : (
            <ChevronDownIcon className="size-3" />
          )}
          <span>
            {showParent ? "Hide" : "Show"} full message context
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
              getRoleBadgeColor(parentMessageRole)
            )}
          >
            {parentMessageRole}
          </span>
        </button>

        {showParent && (
          <div className="mt-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {parentMessageContent}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChunkPreviewCompactProps {
  chunkContent: string;
  maxLength?: number;
  className?: string;
}

export function ChunkPreviewCompact({
  chunkContent,
  maxLength = 100,
  className,
}: ChunkPreviewCompactProps) {
  const truncated =
    chunkContent.length > maxLength
      ? `${chunkContent.slice(0, maxLength)}...`
      : chunkContent;

  return (
    <div
      className={cn(
        "rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
        className
      )}
    >
      <QuoteIcon className="inline-block size-3 mr-1.5 opacity-50" />
      {truncated}
    </div>
  );
}

