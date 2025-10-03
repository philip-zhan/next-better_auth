import type { Metadata } from "next";
import { ChatBot } from "@/components/chat-bot";

export const metadata: Metadata = {
  title: "Chat",
};

export default function ChatPage() {
  return (
    <div>
      <ChatBot />
    </div>
  );
}
