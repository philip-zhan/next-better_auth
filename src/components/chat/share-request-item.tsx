"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { CheckIcon, XIcon, SendIcon, ClockIcon } from "lucide-react";

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

interface ShareRequestItemProps {
  request: KnowledgeRequest;
  onRespond: (
    requestId: number,
    action: "approve" | "deny",
    responseContent?: string
  ) => Promise<void>;
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function ShareRequestItem({
  request,
  onRespond,
}: ShareRequestItemProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requester = request.requester;

  const handleRespond = async (action: "approve" | "deny") => {
    setIsLoading(true);
    try {
      await onRespond(request.id, action, responseContent || undefined);
      setIsSheetOpen(false);
      setResponseContent("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setIsSheetOpen(true)}
          className="h-auto py-2 px-2"
        >
          <div className="flex items-start gap-2 w-full min-w-0">
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={requester.image || undefined} />
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-700 dark:text-amber-300">
                {getInitials(requester.name, requester.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {requester.name || requester.email}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {request.question}
              </p>
            </div>
            <ClockIcon className="size-3 shrink-0 text-amber-500" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={requester.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                  {getInitials(requester.name, requester.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold">
                  {requester.name || requester.email}
                </span>
                <SheetDescription className="mt-0">
                  wants access to your knowledge
                </SheetDescription>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 space-y-4">
            {/* Question */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Their question:
              </p>
              <p className="text-sm">{request.question}</p>
            </div>

            {/* Knowledge chunk preview */}
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Requested knowledge:
              </p>
              <p className="text-sm text-muted-foreground line-clamp-4">
                {request.embedding.content}
              </p>
            </div>

            {/* Context from parent message */}
            <div className="rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Original context:
              </p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {request.parentMessage.content}
              </p>
            </div>

            {/* Response input */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Add an optional message:
              </p>
              <Textarea
                placeholder="Add context or conditions for sharing..."
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRespond("deny")}
              disabled={isLoading}
              className="flex-1"
            >
              <XIcon className="size-4" />
              Deny
            </Button>
            <Button
              onClick={() => handleRespond("approve")}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckIcon className="size-4" />
              Approve
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface ShareRequestListProps {
  requests: KnowledgeRequest[];
  onRespond: (
    requestId: number,
    action: "approve" | "deny",
    responseContent?: string
  ) => Promise<void>;
}

export function ShareRequestSidebarList({
  requests,
  onRespond,
}: ShareRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center px-4">
        <div className="rounded-full bg-muted p-2 mb-2">
          <SendIcon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">No pending requests</p>
      </div>
    );
  }

  return (
    <>
      {requests.map((request) => (
        <ShareRequestItem
          key={request.id}
          request={request}
          onRespond={onRespond}
        />
      ))}
    </>
  );
}

