"use client";

import { useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PUSHER_EVENTS,
  type KnowledgeRequestEvent,
  type KnowledgeResponseEvent,
} from "@/lib/pusher";

interface UsePusherOptions {
  userId: string | undefined;
  enabled?: boolean;
}

// Singleton Pusher instance
let pusherInstance: Pusher | null = null;

function getPusherInstance(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherInstance;
}

export function usePusher({ userId, enabled = true }: UsePusherOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<Channel | null>(null);

  const handleKnowledgeRequest = useCallback(
    (data: KnowledgeRequestEvent) => {
      // Show toast notification
      toast.info("New Knowledge Request", {
        description: `${data.requesterName || data.requesterEmail} wants access to your knowledge`,
        action: {
          label: "View",
          onClick: () => {
            // Navigate to requests page or open modal
            window.location.href = "/dashboard/knowledge-base?tab=requests";
          },
        },
      });

      // Invalidate knowledge requests query to refetch
      queryClient.invalidateQueries({ queryKey: ["knowledge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient]
  );

  const handleKnowledgeResponse = useCallback(
    (data: KnowledgeResponseEvent) => {
      const statusText = data.status === "approved" ? "approved" : "denied";
      const toastFn = data.status === "approved" ? toast.success : toast.error;

      toastFn(
        `Knowledge Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        {
          description:
            data.responseContent || `Your request has been ${statusText}`,
        }
      );

      // Invalidate knowledge requests query to refetch
      queryClient.invalidateQueries({ queryKey: ["knowledge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient]
  );

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const pusher = getPusherInstance();
    const channelName = `private-user-${userId}`;

    // Subscribe to the user's private channel
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Bind event handlers
    channel.bind(PUSHER_EVENTS.KNOWLEDGE_REQUEST, handleKnowledgeRequest);
    channel.bind(PUSHER_EVENTS.KNOWLEDGE_RESPONSE, handleKnowledgeResponse);

    // Cleanup on unmount
    return () => {
      channel.unbind(PUSHER_EVENTS.KNOWLEDGE_REQUEST, handleKnowledgeRequest);
      channel.unbind(PUSHER_EVENTS.KNOWLEDGE_RESPONSE, handleKnowledgeResponse);
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [userId, enabled, handleKnowledgeRequest, handleKnowledgeResponse]);

  return {
    isConnected: channelRef.current?.subscribed ?? false,
  };
}
