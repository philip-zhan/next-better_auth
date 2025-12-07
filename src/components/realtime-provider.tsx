"use client";

import { useSession } from "@daveyplate/better-auth-ui";
import { usePusher } from "@/hooks/use-pusher";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Set up Pusher subscription for authenticated users
  usePusher({
    userId,
    enabled: !!userId,
  });

  return <>{children}</>;
}

