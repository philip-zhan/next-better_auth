"use client";

import { authClient } from "@/lib/auth-client";
import { usePusher } from "@/hooks/use-pusher";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.session.userId;

  // Set up Pusher subscription for authenticated users
  usePusher({
    userId,
    enabled: !!userId,
  });

  return <>{children}</>;
}
