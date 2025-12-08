"use client";

import { createContext, useContext } from "react";
import { authClient } from "@/lib/auth-client";
import {
  usePusher,
  type PendingContinuation,
} from "@/hooks/use-pusher";

interface RealtimeContextValue {
  pendingContinuations: Map<string, PendingContinuation>;
  hasPendingContinuation: (conversationId: string) => boolean;
  getPendingContinuation: (
    conversationId: string
  ) => PendingContinuation | undefined;
  removePendingContinuation: (conversationId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.session.userId;

  // Set up Pusher subscription for authenticated users
  const {
    pendingContinuations,
    hasPendingContinuation,
    getPendingContinuation,
    removePendingContinuation,
  } = usePusher({
    userId,
    enabled: !!userId,
  });

  return (
    <RealtimeContext.Provider
      value={{
        pendingContinuations,
        hasPendingContinuation,
        getPendingContinuation,
        removePendingContinuation,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
