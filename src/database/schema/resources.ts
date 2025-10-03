import { text, pgTable, integer } from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  ...timestamps,
});

// Schema for resources - used to validate API requests
export const insertResourceSchema = createSelectSchema(resources as any)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Type for resources - used to type API request params and within Components
export type NewResourceParams = z.infer<typeof insertResourceSchema>;
