import type { Metadata } from "next";
import { KnowledgeBaseList } from "@/components/knowledge-base/list";
import { KnowledgeBaseCreateForm } from "@/components/knowledge-base/create";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Knowledge Base",
};

export default async function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Manage your knowledge base content. Content is automatically embedded for semantic search."
      >
        <KnowledgeBaseCreateForm />
      </PageHeader>
      <KnowledgeBaseList />
    </div>
  );
}
