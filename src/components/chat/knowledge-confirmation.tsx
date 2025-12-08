"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserIcon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmationInput = {
  ownerName: string;
  embeddingId: number;
  question: string;
};

type KnowledgeConfirmationProps = {
  input: ConfirmationInput;
  state: "input-available" | "output-available" | "output-error";
  output?: { confirmed: boolean; requestSent?: boolean; error?: string };
  onConfirm: () => void;
  onDecline: () => void;
  className?: string;
};

export function KnowledgeConfirmation({
  input,
  state,
  output,
  onConfirm,
  onDecline,
  className,
}: KnowledgeConfirmationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    onConfirm();
  };

  const handleDecline = () => {
    onDecline();
  };

  // Already has output - show result
  if (state === "output-available" && output) {
    if (output.confirmed && output.requestSent) {
      return (
        <Card
          className={cn(
            "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
            className
          )}
        >
          <CardContent className="flex items-center gap-3 py-3">
            <CheckIcon className="size-5 text-green-600" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Request sent to {input.ownerName}. They&apos;ll be notified and
              can choose to share their knowledge with you.
            </p>
          </CardContent>
        </Card>
      );
    }
    if (output.confirmed && output.error) {
      return (
        <Card
          className={cn(
            "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
            className
          )}
        >
          <CardContent className="flex items-center gap-3 py-3">
            <XIcon className="size-5 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {output.error}
            </p>
          </CardContent>
        </Card>
      );
    }
    if (!output.confirmed) {
      return (
        <Card
          className={cn(
            "border-muted bg-muted/30",
            className
          )}
        >
          <CardContent className="flex items-center gap-3 py-3">
            <p className="text-sm text-muted-foreground">
              Request to {input.ownerName} was cancelled.
            </p>
          </CardContent>
        </Card>
      );
    }
  }

  // Waiting for user input
  return (
    <Card
      className={cn(
        "border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
        className
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <UserIcon className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="mb-3 text-sm font-medium">
              {input.ownerName} may know about this. Would you like me to ask
              them?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                Yes, ask them
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={isLoading}
              >
                Never mind
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

