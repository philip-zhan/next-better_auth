import type { Metadata } from "next";
import { KnowledgeBaseList } from "@/components/knowledge-base/list";

export const metadata: Metadata = {
  title: "Knowledge Base",
};

export default async function KnowledgeBasePage() {
  return <KnowledgeBaseList />;
}
