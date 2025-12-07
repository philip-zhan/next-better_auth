---
name: Fix Knowledge Permission Bug
overview: Fix the bug where other users' knowledge is included in AI responses without permission by filtering out unshared embeddings from the tool results.
todos:
  - id: filter-unshared
    content: Filter out unshared otherMembersResults from getInformation tool
    status: completed
---

# Pusher Realtime Share Request Notifications

## Approach

Use Pusher's private channels to deliver realtime notifications to specific users. When a share request is created or responded to, trigger a Pusher event that the recipient's browser receives instantly.

## Key Files to Create/Modify

- `src/lib/pusher.ts` - Server-side Pusher instance
- `src/hooks/use-pusher.ts` - Client-side subscription hook
- `src/app/api/pusher/auth/route.ts` - Private channel authentication endpoint
- `src/app/api/knowledge/request/route.ts` - Trigger event on request creation
- `src/app/api/knowledge/respond/route.ts` - Trigger event on response

## Implementation Steps

### 1. Install Dependencies

```bash
pnpm add pusher pusher-js
```

### 2. Environment Variables

Add to `.env.local`:

```
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
```

### 3. Server-side Pusher Instance

Create `src/lib/pusher.ts`:

- Initialize Pusher with credentials
- Export helper to trigger events to user channels

### 4. Pusher Auth Endpoint

Create `src/app/api/pusher/auth/route.ts`:

- Authenticate private channel subscriptions
- Verify user owns the channel they're subscribing to (e.g., `private-user-{userId}`)

### 5. Client Hook

Create `src/hooks/use-pusher.ts`:

- Initialize pusher-js client
- Subscribe to `private-user-{userId}` channel
- Bind to `knowledge-request` and `knowledge-response` events
- Integrate with React Query to invalidate/update cache on events

### 6. Trigger Events on Request Creation

Modify [`src/app/api/knowledge/request/route.ts`](src/app/api/knowledge/request/route.ts):

- After inserting the knowledge request, trigger `knowledge-request` event to the owner's channel

### 7. Trigger Events on Response

Modify [`src/app/api/knowledge/respond/route.ts`](src/app/api/knowledge/respond/route.ts):

- After responding, trigger `knowledge-response` event to the requester's channel

## Event Payload Structure

```typescript
// knowledge-request event
{
  type: "knowledge-request",
  requestId: number,
  question: string,
  requesterName: string,
  createdAt: string
}

// knowledge-response event  
{
  type: "knowledge-response",
  requestId: number,
  status: "approved" | "denied",
  responseContent?: string
}
```