---
name: Enterprise Chat with Embedding-Level Knowledge Sharing
overview: ""
todos:
  - id: schema-conversations
    content: Create conversations and messages schema with chunkIndex support
    status: pending
  - id: schema-knowledge
    content: Create knowledge_requests/shares schemas with embeddingId references
    status: pending
  - id: migration
    content: Generate and run Drizzle migration for new tables
    status: pending
  - id: chat-persistence
    content: Modify chat API to persist and chunk messages into embeddings
    status: pending
  - id: enhanced-search
    content: Update embedding.ts with embedding-level search and share checking
    status: pending
  - id: ai-knowledge-tool
    content: Add requestKnowledge tool targeting specific embeddingIds
    status: pending
  - id: knowledge-api
    content: Create API routes for embedding-level request/respond workflow
    status: pending
  - id: chunk-preview-ui
    content: Build chunk-preview component showing chunk with parent message context
    status: pending
  - id: notification-system
    content: Create notifications API and bell component
    status: pending
  - id: chat-ui-updates
    content: Update chat page with knowledge sharing UI for embedding-level requests
    status: pending
---

# Enterprise Chat with Embedding-Level Knowledge Sharing

## Architecture Overview

Every conversation is persisted and chunked into embeddings for semantic search. Knowledge is user-private by default. Sharing operates at the **embedding/chunk level** for fine-grained control, with parent message context shown in UI.

## Database Schema Changes

Create new tables in [`src/database/schema/`](src/database/schema/):

**1. `conversations.ts`** - Chat sessions

```typescript
conversations: { id, userId, organizationId, title, createdAt, updatedAt }
```

**2. `messages.ts`** - Individual messages with embeddings

```typescript
messages: { id, conversationId, role, content, createdAt }
message_embeddings: { id, messageId, content, embedding, chunkIndex }
```

Note: `chunkIndex` tracks order when a message is split into multiple chunks.

**3. `knowledge-sharing.ts`** - Sharing workflow at embedding level

```typescript
// Request targets a specific embedding chunk
knowledge_requests: { 
  id, requesterId, ownerId, 
  embeddingId,  // Changed from messageId
  question, status, responseContent, 
  createdAt, respondedAt 
}

// Shares grant access to specific embedding chunks
knowledge_shares: { 
  id, 
  embeddingId,  // Changed from messageId
  ownerId, sharedWithUserId, 
  createdAt 
}
```

**4. `notifications.ts`** - In-app notifications

```typescript
notifications: { id, userId, type, payload, read, createdAt }
```

## Key Architectural Decisions

### Why Embedding-Level Sharing?

1. **Fine-grained control**: Users can share only the relevant chunk from a long message
2. **Privacy preservation**: Multiple topics in one message don't require all-or-nothing sharing
3. **Better semantic matching**: Search finds the exact relevant chunk, sharing targets that specific piece

### UI Considerations

- When requesting knowledge, show the matched **chunk** with **parent message context** (greyed out or collapsed)
- Owner sees: "User A wants access to this chunk: [chunk content]" with option to expand full message
- This preserves context while keeping the sharing decision focused

## Core Implementation

### 1. Conversation Persistence

- Modify [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) to save messages
- Auto-generate conversation title from first message
- Chunk messages and generate embeddings with `chunkIndex` for ordering

### 2. Enhanced Semantic Search

- Update [`src/lib/embedding.ts`](src/lib/embedding.ts):
  - **Phase 1**: Search user's own embeddings
  - **Phase 2**: If no match, search other org members' embeddings
  - Return results with attribution: embedding content, parent message, owner info, share status

### 3. AI Response Logic

- When relevant content found in another user's non-shared embedding:
  - AI responds: "It looks like [User B] may have information about this topic. Would you like me to ask them if they can share this specific piece?"
- New tool: `requestKnowledge(embeddingId)` - creates request for specific chunk

### 4. Knowledge Request Flow

- **API routes** in `src/app/api/knowledge/`:
  - `POST /request` - Create knowledge request for specific embeddingId
  - `GET /requests` - List pending requests showing chunk + parent message context
  - `POST /respond` - Approve/deny; approval creates `knowledge_shares` record for that embedding

### 5. Sharing Propagation

When User A's request for embedding X is approved:

- New `knowledge_shares` record: `{ embeddingId: X, sharedWithUserId: A }`
- User A's future searches now include embedding X in results
- No automatic sharing of other chunks from same message

## File Structure

```
src/
├── database/schema/
│   ├── conversations.ts      (new)
│   ├── messages.ts           (new) - includes message_embeddings with chunkIndex
│   ├── knowledge-sharing.ts  (new) - embeddingId references
│   └── notifications.ts      (new)
├── app/api/
│   ├── chat/route.ts         (modify - persistence + chunking)
│   ├── knowledge/
│   │   ├── request/route.ts  (new - request specific embedding)
│   │   ├── respond/route.ts  (new)
│   │   └── requests/route.ts (new)
│   └── notifications/
│       └── route.ts          (new)
├── lib/
│   └── embedding.ts          (modify - chunk-aware search)
└── components/
    └── knowledge/
        ├── chunk-preview.tsx       (new - shows chunk with message context)
        └── share-request-card.tsx  (new - uses chunk-preview)
```

## Chunking Strategy

For user messages:

- Short messages (under ~500 tokens): single embedding
- Long messages: split into semantic chunks with overlap
- Each chunk stored with `chunkIndex` for reassembly if needed
- Assistant responses: optionally chunk, or skip (derived knowledge)