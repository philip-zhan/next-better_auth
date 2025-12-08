import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { users, organizations } from "./auth-schema";
import { relations } from "drizzle-orm";
import { messages } from "./messages";

export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  publicId: text("public_id").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  ...timestamps,
});

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [conversations.organizationId],
      references: [organizations.id],
    }),
    messages: many(messages),
  })
);

