import type { Metadata } from "next";
import { Chat } from "@/components/chat";

export const metadata: Metadata = {
    title: "Chat",
};

export default function ChatPage() {
    return (
        <div className="space-y-6">
            <Chat />
        </div>
    );
}
