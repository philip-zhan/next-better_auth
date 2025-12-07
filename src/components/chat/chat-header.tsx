"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserButton } from "@daveyplate/better-auth-ui";

export function ChatHeader() {
  return (
    <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">Chat with AI</h1>
        </div>
        <UserButton size="icon" />
      </div>
    </header>
  );
}
