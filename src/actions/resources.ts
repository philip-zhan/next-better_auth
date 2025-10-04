"use server";

import {
  type ResourceInsertType,
  resourceInsertSchema,
  resources,
} from "@/database/schema/resources";
import { db } from "@/database/db";
import { generateEmbeddings } from "@/lib/embedding";
import { embeddings as embeddingsTable } from "@/database/schema/embeddings";

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
