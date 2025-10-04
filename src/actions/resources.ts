"use server";

import {
  type ResourceInsertType,
  resourceInsertSchema,
  resources,
} from "@/database/schema/resources";
import { db } from "@/database/db";
import { generateEmbeddings } from "@/lib/embedding";
import { embeddings as embeddingsTable } from "@/database/schema/embeddings";
import { eq, and, isNull } from "drizzle-orm";
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

export const updateResource = async (resourceId: number, content: string) => {
  try {
    const organizationId = await getOrganizationId();
    // Verify the resource belongs to the user's organization before updating
    const [resource] = await db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.id, resourceId),
          eq(resources.organizationId, organizationId),
          isNull(resources.deletedAt) // Don't allow updating soft-deleted resources
        )
      )
      .limit(1);

    if (!resource) {
      return { success: false, message: "Resource not found or access denied." };
    }

    // Update the resource content
    await db
      .update(resources)
      .set({ content, updatedAt: new Date() })
      .where(eq(resources.id, resourceId));

    // Delete old embeddings and create new ones
    await db.delete(embeddingsTable).where(eq(embeddingsTable.resourceId, resourceId));
    
    const newEmbeddings = await generateEmbeddings(content);
    await db.insert(embeddingsTable).values(
      newEmbeddings.map((embedding) => ({
        resourceId: resourceId,
        ...embedding,
      }))
    );

    return { success: true, message: "Resource updated successfully." };
  } catch (error) {
    console.error("Error updating resource:", error);
    return {
      success: false,
      message: error instanceof Error && error.message.length > 0
        ? error.message
        : "Error updating resource. Please try again.",
    };
  }
};
