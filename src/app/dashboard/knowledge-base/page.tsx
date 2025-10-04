import type { Metadata } from "next";
import { KnowledgeBaseCreateForm } from "@/components/knowledge-base-create";

export const metadata: Metadata = {
  title: "Knowledge Base",
};

export default function KnowledgeBasePage() {
  return (
    <div>
      <KnowledgeBaseCreateForm />
    </div>
  );
}
