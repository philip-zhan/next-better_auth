"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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

// Pending continuation info for auto-continuing after knowledge approval
export interface PendingContinuation {
  conversationId: string; // publicId
  question: string;
  approvedAt: string;
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
  const [pendingContinuations, setPendingContinuations] = useState<
    Map<string, PendingContinuation>
  >(new Map());

  // Add a pending continuation for a conversation
  const addPendingContinuation = useCallback(
    (continuation: PendingContinuation) => {
      console.log("[use-pusher] addPendingContinuation called:", continuation);
      setPendingContinuations((prev) => {
        const next = new Map(prev);
        next.set(continuation.conversationId, continuation);
        console.log("[use-pusher] Updated pendingContinuations map:", Array.from(next.entries()));
        return next;
      });
    },
    []
  );

  // Remove a pending continuation (after it's been processed)
  const removePendingContinuation = useCallback((conversationId: string) => {
    setPendingContinuations((prev) => {
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  // Check if a conversation has a pending continuation
  const hasPendingContinuation = useCallback(
    (conversationId: string) => {
      return pendingContinuations.has(conversationId);
    },
    [pendingContinuations]
  );

  // Get a pending continuation for a conversation
  const getPendingContinuation = useCallback(
    (conversationId: string) => {
      const result = pendingContinuations.get(conversationId);
      console.log("[use-pusher] getPendingContinuation:", { conversationId, result, mapSize: pendingContinuations.size });
      return result;
    },
    [pendingContinuations]
  );

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
      console.log("[use-pusher] Received knowledge response:", data);
      
      const statusText = data.status === "approved" ? "approved" : "denied";
      const toastFn = data.status === "approved" ? toast.success : toast.error;

      toastFn(
        `Knowledge Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
        {
          description:
            data.responseContent || `Your request has been ${statusText}`,
        }
      );

      // If approved and we have a conversationId, add a pending continuation
      if (
        data.status === "approved" &&
        data.conversationId &&
        data.question
      ) {
        console.log("[use-pusher] Adding pending continuation:", {
          conversationId: data.conversationId,
          question: data.question,
        });
        addPendingContinuation({
          conversationId: data.conversationId,
          question: data.question,
          approvedAt: data.respondedAt,
        });
      } else {
        console.log("[use-pusher] Not adding pending continuation - missing data:", {
          status: data.status,
          conversationId: data.conversationId,
          question: data.question,
        });
      }

      // Invalidate knowledge requests query to refetch
      queryClient.invalidateQueries({ queryKey: ["knowledge-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient, addPendingContinuation]
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
    pendingContinuations,
    hasPendingContinuation,
    getPendingContinuation,
    removePendingContinuation,
  };
}
