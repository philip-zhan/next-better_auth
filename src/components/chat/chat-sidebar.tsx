"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareIcon, PlusIcon, InboxIcon, Loader2Icon } from "lucide-react";
import type { ConversationItem } from "../../app/chat/types";
import { UserButton } from "@daveyplate/better-auth-ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShareRequestSidebarList } from "./share-request-item";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type ChatSidebarProps = {
  conversations: ConversationItem[];
  currentConversationId: number | null;
  onNewChat: () => void;
  onSelectConversation: (id: number) => void;
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

// Fetch pending knowledge requests
async function fetchPendingRequests() {
  const response = await fetch("/api/knowledge/requests?type=received&status=pending");
  if (!response.ok) {
    throw new Error("Failed to fetch requests");
  }
  const data = await response.json();
  return data.requests;
}

// Respond to a knowledge request
async function respondToRequest(
  requestId: number,
  action: "approve" | "deny",
  responseContent?: string
) {
  const response = await fetch("/api/knowledge/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, action, responseContent }),
  });
  if (!response.ok) {
    throw new Error("Failed to respond to request");
  }
  return response.json();
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  onNewChat,
  onSelectConversation,
}: ChatSidebarProps) {
  const groupedConversations = groupConversationsByTime(conversations);
  const [requestsOpen, setRequestsOpen] = useState(true);
  const queryClient = useQueryClient();

  // Fetch pending knowledge requests - will be invalidated by Pusher on new requests
  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["knowledge-requests", "received", "pending"],
    queryFn: fetchPendingRequests,
    refetchInterval: 60000, // Fallback polling every 60 seconds
  });

  const handleRespond = async (
    requestId: number,
    action: "approve" | "deny",
    responseContent?: string
  ) => {
    await respondToRequest(requestId, action, responseContent);
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ["knowledge-requests"] });
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <PlusIcon className="size-4" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        {/* Conversations Section */}
        <div className="flex-1 min-h-0">
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
                          onClick={() => onSelectConversation(conv.id)}
                          isActive={currentConversationId === conv.id}
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
        </div>

        <SidebarSeparator />

        {/* Knowledge Requests Section */}
        <Collapsible open={requestsOpen} onOpenChange={setRequestsOpen}>
          <SidebarGroup className="py-0">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <InboxIcon className="size-3.5" />
                  Knowledge Requests
                  {pendingRequests.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="size-5 p-0 justify-center text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    >
                      {pendingRequests.length}
                    </Badge>
                  )}
                </span>
                <ChevronDownIcon
                  className={`size-4 transition-transform ${
                    requestsOpen ? "" : "-rotate-90"
                  }`}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <ScrollArea className="max-h-[200px]">
                  <SidebarMenu>
                    {requestsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ShareRequestSidebarList
                        requests={pendingRequests}
                        onRespond={handleRespond}
                      />
                    )}
                  </SidebarMenu>
                </ScrollArea>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        <UserButton size="sm" />
      </SidebarFooter>
    </Sidebar>
  );
}
