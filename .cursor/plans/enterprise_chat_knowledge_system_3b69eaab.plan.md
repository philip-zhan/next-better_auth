---
name: Enterprise Chat Knowledge System
overview: Build a full-featured enterprise chat system where conversations are automatically saved as searchable knowledge, with cross-user knowledge discovery and consent-based sharing between organization members.
todos:
  - id: schema-conversations
    content: Create conversations and messages database schema with relations
    status: pending
  - id: schema-knowledge
    content: Create knowledge_requests, knowledge_shares, and notifications schemas
    status: pending
  - id: migration
    content: Generate and run Drizzle migration for new tables
    status: pending
  - id: chat-persistence
    content: Modify chat API route to persist conversations and messages
    status: pending
  - id: message-embeddings
    content: Auto-generate embeddings for user messages on save
    status: pending
  - id: enhanced-search
    content: Update embedding.ts with multi-phase search (own -> others -> shared)
    status: pending
  - id: ai-knowledge-tool
    content: Add requestKnowledge tool to AI for cross-user knowledge discovery
    status: pending
  - id: knowledge-api
    content: Create API routes for knowledge request/respond workflow
    status: pending
  - id: notifications-api
    content: Create notifications API route with polling support
    status: pending
  - id: notification-ui
    content: Build notification bell component with dropdown list
    status: pending
  - id: chat-ui-updates
    content: Update chat page with knowledge sharing UI and conversation history
    status: pending
---

# Enterprise Chat with Knowledge Base and Cross-User Sharing

## Architecture Overview

Every conversation is persisted and embedded for semantic search. Knowledge is user-private by default. When User A asks about something User B discussed before, the system offers to broker a knowledge-sharing request with B's consent.

## Database Schema Changes

Create new tables in [`src/database/schema/`](src/database/schema/):

**1. `conversations.ts`** - Chat sessions

```typescript
conversations: { id, userId, organizationId, title, createdAt, updatedAt }
```

**2. `messages.ts`** - Individual messages with embeddings

```typescript
messages: { id, conversationId, role, content, createdAt }
message_embeddings: { id, messageId, content, embedding }
```

**3. `knowledge-sharing.ts`** - Sharing workflow

```typescript
knowledge_requests: { id, requesterId, ownerId, messageId, question, status, responseContent, createdAt, respondedAt }
knowledge_shares: { id, messageId, ownerId, sharedWithUserId, createdAt }
```

**4. `notifications.ts`** - In-app notifications

```typescript
notifications: { id, userId, type, payload, read, createdAt }
```

## Core Implementation

### 1. Conversation Persistence

- Modify [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) to save messages
- Auto-generate conversation title from first message
- Generate embeddings for user messages (assistant messages are derived, not original knowledge)

### 2. Enhanced Semantic Search

- Update [`src/lib/embedding.ts`](src/lib/embedding.ts) with new search function:
  - **Phase 1**: Search user's own message history
  - **Phase 2**: If no match, search other org members' messages
  - Return results with attribution (who said it, when, is it shared with me?)

### 3. AI Response Logic

- When relevant content found in another user's non-shared messages:
  - AI responds: "It looks like [User B] may have information about this topic. Would you like me to ask them if they can share?"
- New tool: `requestKnowledge` - creates request and notification

### 4. Knowledge Request Flow

- **API routes** in `src/app/api/knowledge/`:
  - `POST /request` - Create knowledge request
  - `GET /requests` - List pending requests for current user
  - `POST /respond` - Approve/deny request
- **UI components** for request/response dialogs

### 5. Notifications System

- API route: `GET /api/notifications` - fetch user's notifications
- React Query polling every 30s for new notifications
- Notification bell component in nav showing unread count
- Notification dropdown listing recent requests

### 6. Chat UI Updates

- Modify [`src/app/chat/page.tsx`](src/app/chat/page.tsx):
  - Show "Ask [User]?" button when AI suggests knowledge sharing
  - Handle knowledge request responses inline
  - Show conversation history sidebar

## File Structure

```
src/
├── database/schema/
│   ├── conversations.ts      (new)
│   ├── messages.ts           (new)
│   ├── knowledge-sharing.ts  (new)
│   └── notifications.ts      (new)
├── app/api/
│   ├── chat/route.ts         (modify - persistence)
│   ├── conversations/
│   │   └── route.ts          (new - list conversations)
│   ├── knowledge/
│   │   ├── request/route.ts  (new)
│   │   ├── respond/route.ts  (new)
│   │   └── requests/route.ts (new)
│   └── notifications/
│       └── route.ts          (new)
├── lib/
│   └── embedding.ts          (modify - enhanced search)
└── components/
    ├── notifications/
    │   ├── notification-bell.tsx    (new)
    │   └── notification-list.tsx    (new)
    └── knowledge/
        ├── ask-user-dialog.tsx      (new)
        └── share-request-card.tsx   (new)
```

## Migration Strategy

1. Create database migration for new tables
2. Keep existing `resources`/`embeddings` for manual KB entries
3. New `messages`/`message_embeddings` for conversation-derived knowledge
4. Both are searchable, with clear attribution