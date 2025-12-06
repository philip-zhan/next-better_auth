import {
  pgTable,
  text,
  integer,
  vector,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { conversations } from "./conversations";
import { relations } from "drizzle-orm";

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  ...timestamps,
});

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  embeddings: many(messageEmbeddings),
}));

export const messageEmbeddings = pgTable(
  "message_embeddings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    chunkIndex: integer("chunk_index").notNull().default(0),
    ...timestamps,
  },
  (table) => [index().using("hnsw", table.embedding.op("vector_cosine_ops"))]
);

export const messageEmbeddingsRelations = relations(
  messageEmbeddings,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageEmbeddings.messageId],
      references: [messages.id],
    }),
  })
);

