import type { Metadata } from "next";
import { KnowledgeBase } from "@/components/knowledge-base";

export const metadata: Metadata = {
  title: "Knowledge Base",
};

export default function KnowledgeBasePage() {
  return (
    <div>
      <KnowledgeBase />
    </div>
  );
}
