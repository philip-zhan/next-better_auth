import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/database/db";
import { cosineDistance, asc, lt, sql, eq, and, isNull, gt } from "drizzle-orm";
import { embeddings } from "@/database/schema/embeddings";
import { resources } from "@/database/schema/resources";
import { getOrganizationId, getUserId } from "./auth";
import { messageEmbeddings, messages } from "@/database/schema/messages";
import { conversations } from "@/database/schema/conversations";
import { knowledgeShares } from "@/database/schema/knowledge-sharing";
import { users, members } from "@/database/schema/auth-schema";

const embeddingModel = openai.embedding("text-embedding-3-small");

const generateChunks = (input: string): string[] => {
  // don't chunk for now
  return [input];
};

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value.trim());
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
  const input = value.trim().replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

// Original function for resource-based knowledge base search
export const findRelevantContent = async (
  userQuery: string,
  similarityThreshold = 0.5
) => {
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
        lt(similarity, similarityThreshold),
        isNull(resources.deletedAt)
      )
    )
    .orderBy((t) => asc(t.similarity))
    .limit(4);
  return similarContents;
};

export type KnowledgeSource = {
  embeddingId: number;
  embeddingContent: string;
  ownerId: string;
  ownerName: string | null;
};

export type KnowledgeSourceSuggestion = {
  embeddingId: number;
  ownerName: string | null;
  ownerId: string;
};

// Phase 1: Search user's own message embeddings
export const findUserOwnEmbeddings = async (
  userQuery: string,
  userId: string,
  limit: number,
  distanceLowerBound: number,
  distanceUpperBound: number
): Promise<KnowledgeSource[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const distance = sql<number>`${cosineDistance(
    messageEmbeddings.embedding,
    userQueryEmbedded
  )}`;

  const results = await db
    .select({
      embeddingId: messageEmbeddings.id,
      embeddingContent: messageEmbeddings.content,
      ownerId: conversations.userId,
      ownerName: users.name,
      distance,
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(
      and(
        eq(conversations.userId, userId),
        gt(distance, distanceLowerBound),
        lt(distance, distanceUpperBound)
      )
    )
    .orderBy(asc(distance))
    .limit(limit);

  console.log(
    "[findUserOwnEmbeddings] Found results:",
    results.map((r) => ({
      embeddingId: r.embeddingId,
      ownerName: r.ownerName,
      distance: r.distance,
    }))
  );

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
  limit: number,
  distanceLowerBound: number,
  distanceUpperBound: number
): Promise<KnowledgeSource[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const distance = sql<number>`${cosineDistance(
    messageEmbeddings.embedding,
    userQueryEmbedded
  )}`;

  const results = await db
    .select({
      embeddingId: messageEmbeddings.id,
      embeddingContent: messageEmbeddings.content,
      ownerId: knowledgeShares.ownerId,
      ownerName: users.name,
      distance,
    })
    .from(knowledgeShares)
    .innerJoin(
      messageEmbeddings,
      eq(knowledgeShares.embeddingId, messageEmbeddings.id)
    )
    .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
    .innerJoin(users, eq(knowledgeShares.ownerId, users.id))
    .where(
      and(
        eq(knowledgeShares.sharedWithUserId, userId),
        gt(distance, distanceLowerBound),
        lt(distance, distanceUpperBound)
      )
    )
    .orderBy(asc(distance))
    .limit(limit);

  console.log(
    "[findSharedEmbeddings] Found results:",
    results.map((r) => ({
      embeddingId: r.embeddingId,
      ownerName: r.ownerName,
      distance: r.distance,
    }))
  );

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
  limit: number,
  distanceLowerBound: number,
  distanceUpperBound: number
): Promise<KnowledgeSourceSuggestion[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const distance = sql<number>`${cosineDistance(
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
      ownerId: conversations.userId,
      ownerName: users.name,
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
        gt(distance, distanceLowerBound),
        lt(distance, distanceUpperBound),
        excludeCondition
      )
    )
    .orderBy(asc(distance))
    .limit(limit);

  console.log(
    "[findOrgMembersEmbeddings] Found results:",
    results.map((r) => ({
      embeddingId: r.embeddingId,
      ownerName: r.ownerName,
    }))
  );

  return results.map((r) => ({
    ...r,
    isOwn: false,
    isShared: false,
  }));
};

// Enhanced search that combines all phases
export const findEnhancedRelevantContent = async (
  userQuery: string,
  distanceLowerBound = 0.01, // exclude content that's too similar to the user query
  distanceUpperBound = 0.5
): Promise<{
  knowledgeSources: KnowledgeSource[];
  knowledgeSourceSuggestions: KnowledgeSourceSuggestion[];
}> => {
  console.log("findEnhancedRelevantContent:", userQuery);

  const userId = await getUserId();
  // For POC: getOrganizationId always returns the default org if no active org
  const organizationId = await getOrganizationId();

  // Phase 1: Search user's own embeddings
  const ownResults = await findUserOwnEmbeddings(
    userQuery,
    userId,
    4,
    distanceLowerBound,
    distanceUpperBound
  );

  // Phase 2: Search shared embeddings
  const sharedResults = await findSharedEmbeddings(
    userQuery,
    userId,
    4,
    distanceLowerBound,
    distanceUpperBound
  );

  // Phase 3: Search other org members' embeddings
  const excludeIds = [
    ...ownResults.map((r) => r.embeddingId),
    ...sharedResults.map((r) => r.embeddingId),
  ];
  const knowledgeSourceSuggestions = await findOrgMembersEmbeddings(
    userQuery,
    userId,
    organizationId,
    excludeIds,
    2,
    distanceLowerBound,
    distanceUpperBound
  );

  return {
    knowledgeSources: [...ownResults, ...sharedResults],
    knowledgeSourceSuggestions,
  };
};
