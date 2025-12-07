---
name: AI Knowledge Request Suggestion
overview: Enable the AI to suggest asking other organization members for knowledge when relevant unshared embeddings are found, with both UI button and text-based confirmation options.
todos:
  - id: modify-tool-response
    content: Return otherMembersResults (redacted) from getInformation tool
    status: completed
  - id: add-request-tool
    content: Add requestKnowledge tool for text-based "yes" confirmation
    status: completed
  - id: create-suggestion-component
    content: Create KnowledgeSuggestion UI component with request button
    status: completed
  - id: extend-message-rendering
    content: Extend chat-message.tsx to render knowledge suggestions
    status: completed
  - id: add-system-prompt
    content: Add system prompt to guide AI on suggesting knowledge requests
    status: completed
---

# AI Knowledge Request Suggestion Feature

## Current State

The system already has:

- `findEnhancedRelevantContent()` in [`src/lib/embedding.ts`](src/lib/embedding.ts) that returns `otherMembersResults` (unshared knowledge from org members)
- Knowledge request API at [`src/app/api/knowledge/request/route.ts`](src/app/api/knowledge/request/route.ts)
- Pusher-based realtime notifications for knowledge requests

Currently, `otherMembersResults` is fetched but intentionally excluded from the AI response in [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts).

## Implementation

### 1. Return potential knowledge sources to AI

Modify the `getInformation` tool in [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) to include `otherMembersResults` with limited info (owner name, embedding ID, similarity score - but NOT the actual content for privacy).

### 2. Add `requestKnowledge` tool for text-based confirmation  

Add a new AI tool in [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) that:

- Takes `embeddingId` and `question` parameters
- Calls the knowledge request API internally
- Returns success/failure status to the AI

### 3. Create knowledge suggestion UI component

Create a new component `src/components/chat/knowledge-suggestion.tsx` that:

- Renders as an interactive card showing "Alice may know about this"
- Includes a "Request Knowledge" button
- Handles the API call to `/api/knowledge/request` on click
- Shows loading/success/error states

### 4. Extend message rendering

Modify [`src/components/chat/chat-message.tsx`](src/components/chat/chat-message.tsx) to:

- Detect knowledge suggestion data in tool results
- Render the `KnowledgeSuggestion` component when detected

### 5. Add system prompt guidance

Add instructions to the AI (in the chat route) explaining when to suggest asking other users and how to format the suggestion.