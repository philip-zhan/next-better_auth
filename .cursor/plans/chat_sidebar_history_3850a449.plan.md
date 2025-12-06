---
name: Chat Sidebar History
overview: Add a conversation sidebar to the chat page that displays past conversations, shows message history for the selected conversation, defaults to the latest conversation, and tracks the conversation ID via URL params.
todos:
  - id: server-page
    content: Convert src/app/chat/page.tsx to server component with data fetching
    status: completed
  - id: client-component
    content: Create src/app/chat/chat-client.tsx with sidebar and chat UI
    status: completed
    dependencies:
      - server-page
  - id: conversation-sync
    content: Handle new conversation ID sync from API response to URL
    status: completed
    dependencies:
      - client-component
---

# Chat Sidebar with Conversation History

## Key Files

- [`src/app/chat/page.tsx`](src/app/chat/page.tsx) - Server component for data fetching
- [`src/app/chat/chat-client.tsx`](src/app/chat/chat-client.tsx) - New client component for chat UI
- [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) - Existing API route (minor update)

## Architecture

Use Next.js server components for initial data fetching, passing data as props to client components. The `useChat` hook from `@ai-sdk/react` accepts `id` and `messages` props for initializing with existing conversation data.

## Implementation

### 1. Create Server Component Page (`src/app/chat/page.tsx`)

Convert to a server component that:

- Reads `searchParams.c` for conversation ID
- Fetches all conversations for current user from database (ordered by most recent)
- If no `c` param but conversations exist, redirect to latest conversation
- If `c` param provided, fetch messages for that conversation
- Pass conversations list and initial messages to client component

### 2. Create Client Component (`src/app/chat/chat-client.tsx`)

Extract current chat UI into a client component that:

- Receives `conversations`, `initialMessages`, and `conversationId` as props
- Uses `useChat` with `id` and `messages` props for conversation persistence
- Uses `useRouter` to update URL when new conversation is created
- Wraps content in `SidebarProvider` with conversation list sidebar
- Handles "New Chat" button that clears URL param

### 3. Conversation Sidebar Structure

- Header with "New Chat" button (uses `PlusIcon`)
- Scrollable list of conversations grouped by time:
- Today
- Yesterday  
- Previous 7 days
- Older
- Each item shows conversation title, clicking navigates via `router.push`
- Active conversation highlighted based on current `conversationId`

### 4. Sync New Conversation ID from API

Use `useChat`'s `onFinish` callback combined with custom fetch headers to:

- Capture `X-Conversation-Id` from API response
- Update URL with new conversation ID when first message creates a conversation