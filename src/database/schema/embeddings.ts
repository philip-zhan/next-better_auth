import { index, pgTable, text, vector, integer } from "drizzle-orm/pg-core";
import { resources } from "./resources";
import { timestamps } from "./_timestamps";
import { relations } from "drizzle-orm";

export const embeddings = pgTable(
  "embeddings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    resourceId: integer("resource_id").references(() => resources.id, {
      onDelete: "cascade",
    }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    ...timestamps,
  },
  (table) => [index().using("hnsw", table.embedding.op("vector_cosine_ops"))]
);

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  resource: one(resources, {
    fields: [embeddings.resourceId],
    references: [resources.id],
  }),
}));