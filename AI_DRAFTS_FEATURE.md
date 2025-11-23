# AI Drafts Feature

## Overview
The AI Drafts feature allows the system to store AI-generated response suggestions for tickets and display them in a dedicated page under the Automation section.

## Components Created

### 1. API Endpoint: `/api/inbox/drafts`
**Location:** `aikd-next-clone/app/api/inbox/drafts/route.ts`

**Methods:**
- **GET**: Fetch drafts with pagination
  - Query params: `uid`, `selectedCompany`, `limit`, `lastDocId`
  - Returns: List of drafts with `hasMore` flag for pagination
  
- **POST**: Create a new draft
  - Body: `uid`, `selectedCompany`, `ticketId`, `aiResponse`
  - Creates draft document in Firestore
  - Updates ticket with `lastAISuggestion` and `lastAISuggestionTimestamp`
  
- **DELETE**: Delete a draft
  - Body: `uid`, `selectedCompany`, `draftId`

**Firestore Path:**
```
Users/{uid}/knowledgebases/{selectedCompany}/Helpdesk/default/drafts/{draftId}
```

**Draft Document Structure:**
```typescript
{
  ticketId: string,
  aiResponse: string,
  createdAt: Timestamp
}
```

**Ticket Update:**
When a draft is created, the corresponding ticket is updated with:
```typescript
{
  lastAISuggestion: string,
  lastAISuggestionTimestamp: Timestamp
}
```

### 2. AI Drafts Page
**Location:** `aikd-next-clone/app/(main)/[selectedCompany]/ai-drafts/page.tsx`

**Features:**
- Lists all AI-generated drafts with pagination
- Shows ticket ID, creation date, and preview of AI response
- Click on any draft to navigate to the ticket in inbox
- "Load More" button for pagination
- Empty state when no drafts exist

**Navigation:**
Clicking a draft navigates to: `/{selectedCompany}/inbox?ticketId={ticketId}`

### 3. Sidebar Integration
**Location:** `aikd-next-clone/app/(main)/[selectedCompany]/sidebar.tsx`

Added "AI Drafts" link under the "Automation" section, alongside Actions and Questions.

## Usage Example

### Creating a Draft (from your backend/cloud function):
```typescript
const response = await fetch('/api/inbox/drafts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: 'user-id',
    selectedCompany: 'company-id',
    ticketId: 'ticket-123',
    aiResponse: 'Here is the AI-generated response...'
  })
});
```

### Fetching Drafts:
```typescript
const response = await fetch(
  `/api/inbox/drafts?uid=${uid}&selectedCompany=${company}&limit=20`
);
const data = await response.json();
// data.drafts contains the list
// data.hasMore indicates if there are more pages
```

## Integration Points

1. **Mail Server**: When processing emails, you can call the drafts API to store AI suggestions
2. **Ticket System**: The inbox page should check for `lastAISuggestion` on tickets to display suggestions
3. **Cloud Functions**: Any automation that generates AI responses can store them as drafts

## Charlie's Tools

Charlie (the helpdesk AI employee) now has access to three new tools for managing drafts:

### 1. get_drafts
Retrieve AI-generated draft responses with pagination.
```typescript
{
  limit?: number,        // Optional, default 20
  lastDocId?: string     // Optional, for pagination
}
```

### 2. create_draft
Create a new AI-generated draft for a ticket.
```typescript
{
  ticketId: string,      // Required
  aiResponse: string     // Required
}
```

### 3. delete_draft
Delete a draft that's no longer needed.
```typescript
{
  draftId: string        // Required
}
```

**Files Modified:**
- `config/chat/tools-list.ts` - Added draft tools to Charlie's tool list
- `config/chat/functions.ts` - Implemented draft functions and added to functionsMap
- `lib/chat/tools/tools.ts` - Added required parameters for draft tools

Charlie can now autonomously:
- View all drafts when asked
- Create drafts for tickets with AI-generated responses
- Delete drafts that are no longer needed

## Future Enhancements

- Add ability to edit drafts before sending
- Add draft approval workflow
- Show draft status (pending, approved, sent)
- Add filtering and search
- Add bulk operations (approve all, delete all)
