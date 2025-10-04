import { text, pgTable, integer, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { organizations, users } from "./auth-schema";
import { relations } from "drizzle-orm";
import { embeddings } from "./embeddings";

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  organizationId: text("organization_id").references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  ...timestamps,
  deletedAt: timestamp("deleted_at"),
});

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [resources.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [resources.userId],
    references: [users.id],
  }),
  embeddings: many(embeddings),
}));

export const resourceInsertSchema = createSelectSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type ResourceInsertType = z.infer<typeof resourceInsertSchema>;
