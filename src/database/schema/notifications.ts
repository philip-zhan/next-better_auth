import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { users } from "./auth-schema";
import { relations } from "drizzle-orm";

export const notificationTypeEnum = pgEnum("notification_type", [
  "knowledge_request",
  "knowledge_approved",
  "knowledge_denied",
  "general",
]);

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  payload: jsonb("payload"),
  read: boolean("read").notNull().default(false),
  ...timestamps,
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

