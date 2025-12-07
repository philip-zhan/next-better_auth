import Pusher from "pusher";

// Server-side Pusher instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Helper to get user channel name
export function getUserChannel(userId: string) {
  return `private-user-${userId}`;
}

// Event types
export const PUSHER_EVENTS = {
  KNOWLEDGE_REQUEST: "knowledge-request",
  KNOWLEDGE_RESPONSE: "knowledge-response",
} as const;

// Event payload types
export interface KnowledgeRequestEvent {
  type: "knowledge-request";
  requestId: number;
  question: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
}

export interface KnowledgeResponseEvent {
  type: "knowledge-response";
  requestId: number;
  status: "approved" | "denied";
  responseContent?: string;
  respondedAt: string;
}

// Helper functions to trigger events
export async function triggerKnowledgeRequest(
  ownerId: string,
  payload: Omit<KnowledgeRequestEvent, "type">
) {
  const channel = getUserChannel(ownerId);
  await pusher.trigger(channel, PUSHER_EVENTS.KNOWLEDGE_REQUEST, {
    type: "knowledge-request",
    ...payload,
  });
}

export async function triggerKnowledgeResponse(
  requesterId: string,
  payload: Omit<KnowledgeResponseEvent, "type">
) {
  const channel = getUserChannel(requesterId);
  await pusher.trigger(channel, PUSHER_EVENTS.KNOWLEDGE_RESPONSE, {
    type: "knowledge-response",
    ...payload,
  });
}
