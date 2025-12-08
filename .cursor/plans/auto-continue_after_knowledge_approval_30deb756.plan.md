---
name: Auto-continue after knowledge approval
overview: When a knowledge request is approved, show a badge on the relevant conversation in the sidebar. When the user clicks on it, the AI automatically continues with the newly shared knowledge.
todos:
  - id: add-conversation-id-schema
    content: Add conversationId to knowledgeRequests schema and create migration
    status: completed
  - id: store-conversation-id
    content: Update request API to accept and store conversationId
    status: completed
  - id: pass-conversation-id
    content: Update chat-client to pass conversationId when sending request
    status: completed
  - id: include-in-pusher
    content: Include conversationId and question in approval Pusher event
    status: completed
  - id: track-pending
    content: Create state to track conversations with pending continuations
    status: completed
  - id: sidebar-badge
    content: Show badge on conversations with pending continuations
    status: completed
  - id: auto-continue
    content: Auto-continue chat when user opens flagged conversation
    status: completed
---

# Auto-Continue Chat After Knowledge Approval

## Changes Required

### 1. Database: Add `conversationId` to knowledge requests

- Modify [`src/database/schema/knowledge-sharing.ts`](src/database/schema/knowledge-sharing.ts) to add `conversationId` field to `knowledgeRequests` table
- Create a new migration

### 2. API: Store conversationId when creating request

- Update [`src/app/api/knowledge/request/route.ts`](src/app/api/knowledge/request/route.ts) to accept and store `conversationId`

### 3. Client: Pass conversationId when sending request

- Update [`src/app/chat/chat-client.tsx`](src/app/chat/chat-client.tsx) `handleKnowledgeConfirm` to include `conversationId`

### 4. API: Include conversationId in approval Pusher event

- Update [`src/app/api/knowledge/respond/route.ts`](src/app/api/knowledge/respond/route.ts) to include `conversationId` and `question` in the Pusher event

### 5. Client: Track conversations with pending continuations

- Update [`src/hooks/use-pusher.ts`](src/hooks/use-pusher.ts) to store pending continuation info when approval event received
- Create a new state/context to track which conversations have pending continuations

### 6. Sidebar: Show badge on conversations with pending continuations

- Update [`src/components/chat/chat-sidebar.tsx`](src/components/chat/chat-sidebar.tsx) to show a badge (e.g., sparkle icon) on flagged conversations

### 7. Chat: Auto-continue when user opens flagged conversation

- Update [`src/app/chat/chat-client.tsx`](src/app/chat/chat-client.tsx) to detect when opening a conversation with a pending continuation
- Automatically send a continuation message to trigger the AI to answer with the new knowledge