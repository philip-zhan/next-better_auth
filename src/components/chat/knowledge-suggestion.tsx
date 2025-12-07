"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserIcon, SendIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PotentialSource = {
  embeddingId: number;
  ownerName: string | null;
  ownerEmail: string;
  ownerId: string;
  similarity: number;
};

type KnowledgeSuggestionProps = {
  sources: PotentialSource[];
  question: string;
  className?: string;
};

type RequestState = {
  [embeddingId: number]: "idle" | "loading" | "success" | "error";
};

export function KnowledgeSuggestion({
  sources,
  question,
  className,
}: KnowledgeSuggestionProps) {
  const [requestStates, setRequestStates] = useState<RequestState>({});

  if (!sources || sources.length === 0) {
    return null;
  }

  const handleRequest = async (source: PotentialSource) => {
    setRequestStates((prev) => ({ ...prev, [source.embeddingId]: "loading" }));

    try {
      const response = await fetch("/api/knowledge/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddingId: source.embeddingId,
          question,
        }),
      });

      if (response.ok) {
        setRequestStates((prev) => ({
          ...prev,
          [source.embeddingId]: "success",
        }));
      } else {
        const data = await response.json();
        console.error("Request failed:", data.error);
        setRequestStates((prev) => ({
          ...prev,
          [source.embeddingId]: "error",
        }));
      }
    } catch (error) {
      console.error("Request failed:", error);
      setRequestStates((prev) => ({
        ...prev,
        [source.embeddingId]: "error",
      }));
    }
  };

  // Group by unique owners
  const uniqueOwners = sources.reduce(
    (acc, source) => {
      if (!acc.find((s) => s.ownerId === source.ownerId)) {
        acc.push(source);
      }
      return acc;
    },
    [] as PotentialSource[]
  );

  return (
    <Card className={cn("border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20", className)}>
      <CardContent className="py-3">
        <p className="mb-3 text-sm text-muted-foreground">
          Someone in your organization may know about this:
        </p>
        <div className="flex flex-wrap gap-2">
          {uniqueOwners.map((source) => {
            const state = requestStates[source.embeddingId] || "idle";
            const displayName = source.ownerName || source.ownerEmail.split("@")[0];

            return (
              <Button
                key={source.embeddingId}
                variant="outline"
                size="sm"
                disabled={state === "loading" || state === "success"}
                onClick={() => handleRequest(source)}
                className={cn(
                  "gap-2 transition-all",
                  state === "success" && "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                )}
              >
                {state === "loading" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : state === "success" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <UserIcon className="size-4" />
                )}
                <span>
                  {state === "success"
                    ? `Request sent to ${displayName}`
                    : `Ask ${displayName}`}
                </span>
                {state === "idle" && <SendIcon className="size-3 opacity-50" />}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

