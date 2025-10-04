import { text, pgTable, integer } from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { organizations, users } from "./auth-schema";

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  organizationId: text("organization_id").references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  ...timestamps,
});

export const resourceInsertSchema = createSelectSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ResourceInsertType = z.infer<typeof resourceInsertSchema>;
