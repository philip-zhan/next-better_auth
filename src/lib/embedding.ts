import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/database/db";
import { cosineDistance, asc, lt, sql, eq, and } from "drizzle-orm";
import { embeddings } from "@/database/schema/embeddings";
import { resources } from "@/database/schema/resources";
import { getOrganizationId } from "./auth";

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
      and(eq(resources.organizationId, organizationId), lt(similarity, 0.5))
    )
    .orderBy((t) => asc(t.similarity))
    .limit(4);
  return similarContents;
};
