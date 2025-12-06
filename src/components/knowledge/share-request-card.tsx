"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChunkPreview } from "./chunk-preview";
import {
  CheckIcon,
  XIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  SendIcon,
} from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface KnowledgeRequest {
  id: number;
  question: string;
  status: "pending" | "approved" | "denied";
  responseContent: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  isOwner: boolean;
  embedding: {
    id: number;
    content: string;
    chunkIndex: number;
  };
  parentMessage: {
    content: string;
    role: "user" | "assistant" | "system";
  };
  requester: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ShareRequestCardProps {
  request: KnowledgeRequest;
  onRespond?: (requestId: number, action: "approve" | "deny", responseContent?: string) => Promise<void>;
  className?: string;
}

export function ShareRequestCard({
  request,
  onRespond,
  className,
}: ShareRequestCardProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRespond = async (action: "approve" | "deny") => {
    if (!onRespond) return;
    
    setIsLoading(true);
    try {
      await onRespond(request.id, action, responseContent || undefined);
    } finally {
      setIsLoading(false);
      setIsResponding(false);
      setResponseContent("");
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <ClockIcon className="size-3" />
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircleIcon className="size-3" />
            Approved
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <XCircleIcon className="size-3" />
            Denied
          </span>
        );
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const otherUser = request.isOwner ? request.requester : request.owner;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={otherUser.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {getInitials(otherUser.name, otherUser.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {request.isOwner ? (
                  <>
                    <span className="font-semibold">{otherUser.name || otherUser.email}</span>
                    <span className="text-muted-foreground font-normal"> wants access</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground font-normal">Request to </span>
                    <span className="font-semibold">{otherUser.name || otherUser.email}</span>
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {formatDate(request.createdAt)}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {request.isOwner ? "Their question:" : "Your question:"}
          </p>
          <p className="text-sm">{request.question}</p>
        </div>

        {/* Chunk Preview */}
        <ChunkPreview
          chunkContent={request.embedding.content}
          parentMessageContent={request.parentMessage.content}
          parentMessageRole={request.parentMessage.role}
        />

        {/* Response content (if exists) */}
        {request.responseContent && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Response:
            </p>
            <p className="text-sm">{request.responseContent}</p>
          </div>
        )}

        {/* Response input (for owner responding) */}
        {request.isOwner && request.status === "pending" && isResponding && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add an optional message with your response..."
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        )}
      </CardContent>

      {/* Actions for owner with pending request */}
      {request.isOwner && request.status === "pending" && onRespond && (
        <CardFooter className="flex gap-2 pt-0">
          {isResponding ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsResponding(false);
                  setResponseContent("");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRespond("deny")}
                disabled={isLoading}
              >
                <XIcon className="size-4" />
                Deny
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond("approve")}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckIcon className="size-4" />
                Approve
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResponding(true)}
              className="w-full"
            >
              <SendIcon className="size-4" />
              Respond to Request
            </Button>
          )}
        </CardFooter>
      )}

      {/* Status info for requester */}
      {!request.isOwner && request.status === "pending" && (
        <CardFooter className="pt-0">
          <p className="text-xs text-muted-foreground">
            Waiting for {request.owner.name || request.owner.email} to respond...
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

interface ShareRequestListProps {
  requests: KnowledgeRequest[];
  onRespond?: (requestId: number, action: "approve" | "deny", responseContent?: string) => Promise<void>;
  emptyMessage?: string;
  className?: string;
}

export function ShareRequestList({
  requests,
  onRespond,
  emptyMessage = "No knowledge requests",
  className,
}: ShareRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="rounded-full bg-muted p-4 mb-4">
          <SendIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {requests.map((request) => (
        <ShareRequestCard
          key={request.id}
          request={request}
          onRespond={onRespond}
        />
      ))}
    </div>
  );
}

