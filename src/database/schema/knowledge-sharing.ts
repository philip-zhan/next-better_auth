import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { users } from "./auth-schema";
import { messageEmbeddings } from "./messages";
import { conversations } from "./conversations";
import { relations } from "drizzle-orm";

export const knowledgeRequestStatusEnum = pgEnum("knowledge_request_status", [
  "pending",
  "approved",
  "denied",
]);

export const knowledgeRequests = pgTable("knowledge_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  embeddingId: integer("embedding_id")
    .notNull()
    .references(() => messageEmbeddings.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  question: text("question").notNull(),
  status: knowledgeRequestStatusEnum("status").notNull().default("pending"),
  responseContent: text("response_content"),
  respondedAt: timestamp("responded_at"),
  ...timestamps,
});

export const knowledgeRequestsRelations = relations(
  knowledgeRequests,
  ({ one }) => ({
    requester: one(users, {
      fields: [knowledgeRequests.requesterId],
      references: [users.id],
      relationName: "requester",
    }),
    owner: one(users, {
      fields: [knowledgeRequests.ownerId],
      references: [users.id],
      relationName: "owner",
    }),
    embedding: one(messageEmbeddings, {
      fields: [knowledgeRequests.embeddingId],
      references: [messageEmbeddings.id],
    }),
    conversation: one(conversations, {
      fields: [knowledgeRequests.conversationId],
      references: [conversations.id],
    }),
  })
);

export const knowledgeShares = pgTable("knowledge_shares", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  embeddingId: integer("embedding_id")
    .notNull()
    .references(() => messageEmbeddings.id, { onDelete: "cascade" }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sharedWithUserId: text("shared_with_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const knowledgeSharesRelations = relations(
  knowledgeShares,
  ({ one }) => ({
    owner: one(users, {
      fields: [knowledgeShares.ownerId],
      references: [users.id],
      relationName: "shareOwner",
    }),
    sharedWithUser: one(users, {
      fields: [knowledgeShares.sharedWithUserId],
      references: [users.id],
      relationName: "shareRecipient",
    }),
    embedding: one(messageEmbeddings, {
      fields: [knowledgeShares.embeddingId],
      references: [messageEmbeddings.id],
    }),
  })
);

