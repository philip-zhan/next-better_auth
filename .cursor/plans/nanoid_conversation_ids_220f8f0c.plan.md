---
name: Nanoid Conversation IDs
overview: Add a new `publicId` column (nanoid) to the conversations table for client-side use, enabling instant navigation when creating new chats instead of waiting for backend response.
todos:
  - id: schema
    content: Add publicId column to conversations schema and create migration
    status: completed
  - id: api
    content: Update /api/chat/route.ts to accept and use publicId
    status: completed
  - id: page
    content: Update chat page.tsx to query by publicId from URL
    status: completed
  - id: client
    content: Update chat-client.tsx to generate publicId and navigate immediately
    status: completed
  - id: sidebar
    content: Update chat-sidebar.tsx to use publicId in links
    status: completed
  - id: types
    content: Update ConversationItem type and related types for publicId
    status: completed
---

# Proactive Nanoid Conversation IDs

## Overview

Currently, when creating a new chat, the frontend waits for the backend to generate the conversation ID and return it before navigating. This creates a slow UX. By generating a nanoid on the frontend and using it for immediate navigation, we can eliminate this delay.

## Key Files

- [`src/database/schema/conversations.ts`](src/database/schema/conversations.ts) - Add `publicId` column
- [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) - Accept/use `publicId` for new conversations
- [`src/app/chat/page.tsx`](src/app/chat/page.tsx) - Query by `publicId` from URL
- [`src/app/chat/chat-client.tsx`](src/app/chat/chat-client.tsx) - Generate and use `publicId` for navigation
- [`src/components/chat/chat-sidebar.tsx`](src/components/chat/chat-sidebar.tsx) - Use `publicId` in links

## Implementation

### 1. Database Schema Change

Add `publicId` column to conversations table:

- Type: `text`, unique, not null
- For existing rows: generate nanoids via migration

### 2. Backend Changes (`/api/chat/route.ts`)

- Accept optional `publicId` from request body
- In `getOrCreateConversation`: lookup by `publicId` if provided, or generate one if not
- Store `publicId` in new conversations
- Return `publicId` instead of `id` in response metadata

### 3. Page and Routing Changes

- Update URL parameter from `c=<integer>` to `c=<publicId>`
- Query conversations by `publicId` instead of `id`
- Update `ConversationItem` type to include `publicId`

### 4. Client-Side Changes (`chat-client.tsx`)

- Generate nanoid when starting a new chat
- Navigate immediately to `/chat?c=${publicId}`
- Pass `publicId` to backend in request body

### 5. Sidebar Updates

- Use `publicId` for conversation links instead of `id`

### 6. Internal References

- Keep integer `id` for internal foreign keys (messages, knowledge-sharing)
- Only expose `publicId` to client/URLs

## Dependencies

- Install `nanoid` package (or use existing if present)