"use server";

import {
  type ResourceInsertType,
  resourceInsertSchema,
  resources,
} from "@/database/schema/resources";
import { db } from "@/database/db";
import { generateEmbeddings } from "@/lib/embedding";
import { embeddings as embeddingsTable } from "@/database/schema/embeddings";
import { eq, and } from "drizzle-orm";
import { getOrganizationId } from "@/lib/auth";

export const createResource = async (input: ResourceInsertType) => {
  try {
    const { content, organizationId, userId } =
      resourceInsertSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({
        content: content,
        organizationId: organizationId,
        userId: userId,
      })
      .returning();

    const embeddings = await generateEmbeddings(content);
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
      }))
    );

    return "Resource successfully created and embedded.";
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : "Error, please try again.";
  }
};

export const deleteResource = async (resourceId: number) => {
  try {
    const organizationId = await getOrganizationId();
    // Verify the resource belongs to the user's organization before deleting
    const [resource] = await db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.id, resourceId),
          eq(resources.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!resource) {
      return { success: false, message: "Resource not found or access denied." };
    }

    // Soft delete the resource
    await db
      .update(resources)
      .set({ deletedAt: new Date() })
      .where(eq(resources.id, resourceId));

    return { success: true, message: "Resource deleted successfully." };
  } catch (error) {
    console.error("Error deleting resource:", error);
    return {
      success: false,
      message: error instanceof Error && error.message.length > 0
        ? error.message
        : "Error deleting resource. Please try again.",
    };
  }
};
