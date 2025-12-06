import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/database/db";
import { cosineDistance, asc, lt, sql, eq, and, isNull } from "drizzle-orm";
import { embeddings } from "@/database/schema/embeddings";
import { resources } from "@/database/schema/resources";
import { getOrganizationId, getUserId } from "./auth";
import { messageEmbeddings, messages } from "@/database/schema/messages";
import { conversations } from "@/database/schema/conversations";
import { knowledgeShares } from "@/database/schema/knowledge-sharing";
import { users, members } from "@/database/schema/auth-schema";

const embeddingModel = openai.embedding("text-embedding-ada-002");

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split(".")
    .filter((i) => i !== "");
};

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  if (chunks.length === 0) {
    return [];
  }
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

// Original function for resource-based knowledge base search
export const findRelevantContent = async (userQuery: string) => {
  console.log("findRelevantContent:", userQuery);
  const organizationId = await getOrganizationId();
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )}`;
  const similarContents = await db
    .select({ content: resources.content, similarity })
    .from(embeddings)
    .innerJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(
      and(
        eq(resources.organizationId, organizationId),
        lt(similarity, 0.5),
        isNull(resources.deletedAt)
      )
    )
    .orderBy((t) => asc(t.similarity))
    .limit(4);
  return similarContents;
};

// Enhanced search result type
export type EnhancedSearchResult = {
  embeddingId: number;
  embeddingContent: string;
  parentMessageContent: string;
  parentMessageRole: "user" | "assistant" | "system";
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string;
  isOwn: boolean;
  isShared: boolean;
  similarity: number;
};

// Phase 1: Search user's own message embeddings
export const findUserOwnEmbeddings = async (
  userQuery: string,
  userId: string,
  limit = 4
): Promise<EnhancedSearchResult[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`${cosineDistance(
    messageEmbeddings.embedding,
    userQueryEmbedded
  )}`;

  const results = await db
    .select({
      embeddingId: messageEmbeddings.id,
      embeddingContent: messageEmbeddings.content,
      parentMessageContent: messages.content,
      parentMessageRole: messages.role,
      ownerId: conversations.userId,
      ownerName: users.name,
      ownerEmail: users.email,
      similarity,
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(and(eq(conversations.userId, userId), lt(similarity, 0.5)))
    .orderBy(asc(similarity))
    .limit(limit);

  return results.map((r) => ({
    ...r,
    isOwn: true,
    isShared: false,
  }));
};

// Phase 2: Search shared embeddings (embeddings shared with the user)
export const findSharedEmbeddings = async (
  userQuery: string,
  userId: string,
  limit = 4
): Promise<EnhancedSearchResult[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`${cosineDistance(
    messageEmbeddings.embedding,
    userQueryEmbedded
  )}`;

  const results = await db
    .select({
      embeddingId: messageEmbeddings.id,
      embeddingContent: messageEmbeddings.content,
      parentMessageContent: messages.content,
      parentMessageRole: messages.role,
      ownerId: knowledgeShares.ownerId,
      ownerName: users.name,
      ownerEmail: users.email,
      similarity,
    })
    .from(knowledgeShares)
    .innerJoin(
      messageEmbeddings,
      eq(knowledgeShares.embeddingId, messageEmbeddings.id)
    )
    .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
    .innerJoin(users, eq(knowledgeShares.ownerId, users.id))
    .where(
      and(eq(knowledgeShares.sharedWithUserId, userId), lt(similarity, 0.5))
    )
    .orderBy(asc(similarity))
    .limit(limit);

  return results.map((r) => ({
    ...r,
    isOwn: false,
    isShared: true,
  }));
};

// Phase 3: Search other org members' embeddings (not yet shared)
export const findOrgMembersEmbeddings = async (
  userQuery: string,
  userId: string,
  organizationId: string,
  excludeEmbeddingIds: number[],
  limit = 4
): Promise<EnhancedSearchResult[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`${cosineDistance(
    messageEmbeddings.embedding,
    userQueryEmbedded
  )}`;

  // Get all org member IDs except current user
  const orgMembers = await db
    .select({ userId: members.userId })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        sql`${members.userId} != ${userId}`
      )
    );

  const memberIds = orgMembers.map((m) => m.userId);

  if (memberIds.length === 0) {
    return [];
  }

  // Build condition for excluding already found embeddings
  const excludeCondition =
    excludeEmbeddingIds.length > 0
      ? sql`${messageEmbeddings.id} NOT IN (${sql.join(
          excludeEmbeddingIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      : sql`true`;

  const results = await db
    .select({
      embeddingId: messageEmbeddings.id,
      embeddingContent: messageEmbeddings.content,
      parentMessageContent: messages.content,
      parentMessageRole: messages.role,
      ownerId: conversations.userId,
      ownerName: users.name,
      ownerEmail: users.email,
      similarity,
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(
      and(
        sql`${conversations.userId} IN (${sql.join(
          memberIds.map((id) => sql`${id}`),
          sql`, `
        )})`,
        lt(similarity, 0.5),
        excludeCondition
      )
    )
    .orderBy(asc(similarity))
    .limit(limit);

  return results.map((r) => ({
    ...r,
    isOwn: false,
    isShared: false,
  }));
};

// Enhanced search that combines all phases
export const findEnhancedRelevantContent = async (
  userQuery: string
): Promise<{
  ownResults: EnhancedSearchResult[];
  sharedResults: EnhancedSearchResult[];
  otherMembersResults: EnhancedSearchResult[];
}> => {
  console.log("findEnhancedRelevantContent:", userQuery);

  const userId = await getUserId();
  let organizationId: string | null = null;

  try {
    organizationId = await getOrganizationId();
  } catch {
    // User might not be in an organization
  }

  // Phase 1: Search user's own embeddings
  const ownResults = await findUserOwnEmbeddings(userQuery, userId);

  // Phase 2: Search shared embeddings
  const sharedResults = await findSharedEmbeddings(userQuery, userId);

  // Phase 3: Search other org members' embeddings (if in an organization)
  let otherMembersResults: EnhancedSearchResult[] = [];
  if (organizationId) {
    const excludeIds = [
      ...ownResults.map((r) => r.embeddingId),
      ...sharedResults.map((r) => r.embeddingId),
    ];
    otherMembersResults = await findOrgMembersEmbeddings(
      userQuery,
      userId,
      organizationId,
      excludeIds
    );
  }

  return {
    ownResults,
    sharedResults,
    otherMembersResults,
  };
};
