import type { Metadata } from "next";
import { KnowledgeBaseCreateForm } from "@/components/knowledge-base/create";
import { KnowledgeBaseList } from "@/components/knowledge-base/list";

export const metadata: Metadata = {
  title: "Knowledge Base",
};

export default async function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <KnowledgeBaseList />
      <KnowledgeBaseCreateForm />
    </div>
  );
}
