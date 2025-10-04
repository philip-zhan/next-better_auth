import { db } from "@/database/db";
import { resources } from "@/database/schema/resources";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeBaseCreateForm } from "./create";

async function getResources(organizationId: string) {
  const resourcesList = await db
    .select()
    .from(resources)
    .where(eq(resources.organizationId, organizationId))
    .orderBy(desc(resources.createdAt));

  return resourcesList;
}

export async function KnowledgeBaseList() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session?.activeOrganizationId;

  const resourcesList = organizationId
    ? await getResources(organizationId)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Manage your knowledge base content. Content is automatically embedded for semantic search."
      >
        <KnowledgeBaseCreateForm />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            {resourcesList.length === 0
              ? "No resources yet. Add your first knowledge base entry."
              : `${resourcesList.length} resource${resourcesList.length === 1 ? "" : "s"} in your knowledge base`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resourcesList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Your knowledge base is empty</p>
              <p className="text-sm">
                Add content to get started with semantic search
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resourcesList.map((resource) => (
                <Card key={resource.id} className="border-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(resource.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {resource.content}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        ID: {resource.id}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
