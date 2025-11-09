# Inbox Setup Guide

## Overview
The inbox feature has been successfully implemented in the Next.js app following the old React app's design pattern with server-side API routes.

## What's Been Created

### 1. API Routes (`/api/inbox/*`)

#### **GET `/api/inbox/tickets`** - Retrieve Tickets
- Fetches all tickets for a user's help desk inbox
- Parameters: 
  - `uid` (required) - User ID
  - `selectedCompany` (optional, defaults to 'default')
  - `limit` (optional, defaults to 10)
  - `startAfter` (optional) - Timestamp for pagination
- Orders by `lastMessageDate` descending (newest first)
- Returns array of tickets with pagination info

#### **GET `/api/inbox/messages`** - Retrieve Ticket Messages
- Fetches all messages for a specific ticket
- Parameters:
  - `uid` (required) - User ID
  - `selectedCompany` (optional, defaults to 'default')
  - `ticketId` (required) - Ticket ID
- Orders messages by `date` descending
- Automatically marks ticket as read
- Returns messages, ticket data, and subdomain

### 2. Inbox Page (`(main)/[selectedCompany]/inbox/page.tsx`)

A fully functional inbox page with:

#### Features:
- **Ticket List Sidebar**: 
  - Displays all tickets with pagination
  - Search functionality to filter tickets
  - Shows unread indicator (orange dot)
  - Load more button for pagination
  - Avatar colors generated from email
  - Mobile responsive with slide-out sidebar

- **Message Display Area**:
  - Shows messages for selected ticket
  - Collapsible message cards
  - Displays sender/receiver info
  - Shows AI responses with special badge
  - Attachment support with download links
  - Empty state when no ticket is selected
  - Auto-selects and loads first ticket on page load

- **Ticket Header**:
  - Status badge (Open/Closed)
  - Subject and sender info
  - AI toggle indicator
  - Mobile menu button

#### UI Components:
- Search bar for filtering tickets
- Ticket list with avatars and preview
- Message cards with expand/collapse
- Loading states with skeletons
- Empty states with helpful messages
- Responsive design (mobile/tablet/desktop)

## Firestore Structure

### Tickets Collection Path:
```
Users/{uid}/knowledgebases/{selectedCompany}/Helpdesk/default/tickets/{ticketId}
```

### Ticket Document Fields:
- `subject` (string) - Ticket subject
- `from` (string) - Customer email
- `lastMessage` (string) - Preview of last message
- `date` (timestamp) - Ticket creation date
- `lastMessageDate` (timestamp) - Last message timestamp
- `read` (boolean) - Read status
- `status` (string) - "Open" or "Closed"
- `aiOn` (boolean) - AI assistance enabled/disabled

### Messages Collection Path:
```
Users/{uid}/knowledgebases/{selectedCompany}/Helpdesk/default/tickets/{ticketId}/messages/{messageId}
```

### Message Document Fields:
- `from` (string) - Sender email
- `to` (string) - Recipient email
- `subject` (string) - Message subject
- `body` (string) - Message content (HTML)
- `date` (timestamp) - Message timestamp
- `type` (string) - "AI", "humanSupport", or undefined
- `attachments` (array) - Array of {fileName, publicUrl}

## Key Improvements Over Old React App

### ✅ Server-Side API Routes
- All Firebase operations happen server-side
- Better security with Firebase Admin SDK
- No direct Firestore access from client

### ✅ Modern Next.js 14 Patterns
- App Router with route groups
- Client components with proper state management
- API routes with proper HTTP methods
- TypeScript throughout

### ✅ Better Code Organization
- Separated concerns (API, UI, components)
- MessageCard component for reusability
- Clean file structure following Next.js conventions

### ✅ Enhanced UX
- Loading skeletons for better perceived performance
- Empty states with helpful messages
- Smooth transitions and animations
- Auto-load first ticket on page load
- Better mobile responsiveness

### ✅ Improved Performance
- Pagination support for large ticket lists
- Efficient data fetching with proper caching
- Optimized re-renders with proper state management

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/
│   │   └── [selectedCompany]/
│   │       └── inbox/
│   │           └── page.tsx              # Complete inbox page
│   └── api/
│       └── inbox/
│           ├── tickets/
│           │   └── route.ts              # GET tickets
│           └── messages/
│               └── route.ts              # GET messages
```

## Usage

### Accessing the Page
Navigate to: `/{selectedCompany}/inbox`

Example: `/default/inbox`

### Features Available
1. **View Tickets**: All tickets are displayed in the sidebar
2. **Search Tickets**: Use search bar to filter by subject, sender, or content
3. **Select Ticket**: Click any ticket to view its messages
4. **View Messages**: Messages are displayed in collapsible cards
5. **See Status**: Ticket status (Open/Closed) and AI status are shown
6. **Download Attachments**: Click on attachments to download
7. **Load More**: Click "Load More" button to fetch additional tickets
8. **Auto-load**: First ticket is automatically selected and loaded

## What's NOT Included (For Future Implementation)

The following features from the old React app are NOT yet implemented:
- ❌ Sending replies/messages
- ❌ Creating new tickets
- ❌ Changing ticket status
- ❌ Toggling AI assistance
- ❌ Deleting tickets
- ❌ Email selection dropdown
- ❌ File attachments upload
- ❌ Response templates
- ❌ Quick article reference
- ❌ AI suggestions

These features can be added in future iterations following the same pattern.

## Testing Checklist

- [x] Can view all tickets
- [x] Can select a ticket and view messages
- [x] Can search/filter tickets
- [x] First ticket auto-loads on page load
- [x] Empty state shows when no tickets exist
- [x] Loading state shows while fetching
- [x] Pagination works correctly
- [x] Messages display correctly
- [x] Attachments show and link correctly
- [x] Authentication redirects to sign-in
- [x] All API routes work correctly
- [x] Responsive design works on all screen sizes
- [x] Dark mode support works

## Notes

- Inbox uses the same Firestore structure as the old React app
- All API routes follow REST conventions
- Firebase Admin SDK is used for server-side operations
- Client-side only handles UI and makes API calls
- selectedCompany is from URL params instead of localStorage
- The component follows Next.js 14 App Router patterns
- Messages are displayed in descending order (newest first)
- First message in a ticket is expanded by default

## Next Steps

Suggested features to implement next:
1. 📝 Sending reply messages
2. 📝 Creating new tickets
3. 📝 Changing ticket status (Open/Closed)
4. 📝 Toggling AI assistance
5. 📝 Deleting tickets
6. 📝 Email account selection
7. 📝 Response templates
8. 📝 Real-time updates with Firestore listeners

