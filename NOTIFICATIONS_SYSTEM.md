# Notifications System

## Overview
A comprehensive in-app notification system that tracks unread questions and AI drafts, displaying badge counts in the sidebar and automatically marking items as read when viewed.

## Features

### 1. **Notification Types**
- **Questions** (`question`) - When AI employees escalate questions to humans
- **AI Drafts** (`ai_draft`) - When AI creates draft email responses
- **Inbox** (`inbox`) - When new tickets or replies are received

### 2. **Sidebar Badges**
- Real-time unread counts displayed on Inbox, Questions, and AI Drafts links
- Auto-updates every 30 seconds
- Shows "99+" for counts over 99
- Badges only appear when there are unread notifications

### 3. **Auto-Read Marking**
- Notifications automatically marked as read when user visits the page
- Inbox page marks all inbox notifications as read
- Questions page marks all question notifications as read
- AI Drafts page marks all draft notifications as read

### 4. **Notification Lifecycle**
- **Created** - When question is escalated or draft is generated
- **Read** - When user visits the respective page
- **Deleted** - When the source item (draft/question) is deleted

## Technical Implementation

### Database Schema

Notifications are stored in a root-level `notifications` collection:

```typescript
{
  id: string;                                // Auto-generated
  uid: string;                               // User ID
  companyId: string;                         // Company/knowledge base ID
  type: 'question' | 'ai_draft' | 'inbox';   // Notification type
  referenceId: string;                       // ID of the question chat, draft, or ticket
  title: string;                             // Notification title
  message: string;                           // Notification message
  read: boolean;                             // Read status
  createdAt: Timestamp;                      // Creation timestamp
  updatedAt: Timestamp;                      // Last update timestamp
}
```

### Files Created

1. **`lib/services/notification-service.ts`**
   - Core notification service with CRUD operations
   - Methods for creating, reading, updating, and deleting notifications
   - Unread count aggregation
   - Bulk operations (mark all as read, delete by reference)

2. **`app/api/notifications/route.ts`**
   - GET: Fetch notifications with filtering
   - PUT: Mark notifications as read
   - DELETE: Delete notifications

3. **`app/api/notifications/count/route.ts`**
   - GET: Fetch unread counts by type or total

### Files Modified

1. **`app/api/notify/question/route.ts`**
   - Added notification creation when questions are escalated
   - Creates notification after sending email

2. **`app/api/inbox/drafts/route.ts`**
   - Added notification creation when drafts are generated
   - Deletes notifications when drafts are deleted
   - Prevents duplicate notifications

3. **`app/(main)/[selectedCompany]/sidebar.tsx`**
   - Added notification count state
   - Fetches counts on mount and every 30 seconds
   - Displays badges on Questions and AI Drafts links

4. **`app/(main)/[selectedCompany]/questions/page.tsx`**
   - Marks all question notifications as read on page visit

5. **`app/(main)/[selectedCompany]/ai-drafts/page.tsx`**
   - Marks all draft notifications as read on page visit

## API Endpoints

### Get Notifications
```
GET /api/notifications?uid={uid}&companyId={companyId}&type={type}&unreadOnly={true|false}&limit={number}
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif123",
      "uid": "user123",
      "companyId": "company123",
      "type": "question",
      "referenceId": "chat123",
      "title": "New Question from AI Employee",
      "message": "I need help with...",
      "read": false,
      "createdAt": {...},
      "updatedAt": {...}
    }
  ]
}
```

### Get Unread Counts
```
GET /api/notifications/count?uid={uid}&companyId={companyId}&type={type}
```

**Response (all types):**
```json
{
  "success": true,
  "counts": {
    "question": 5,
    "ai_draft": 3,
    "inbox": 2,
    "total": 10
  }
}
```

**Response (specific type):**
```json
{
  "success": true,
  "count": 5,
  "type": "question"
}
```

### Mark as Read
```
PUT /api/notifications
Content-Type: application/json

{
  "notificationId": "notif123"  // Mark specific notification
}
```

OR

```json
{
  "uid": "user123",
  "companyId": "company123",
  "type": "question",  // Optional: specific type
  "markAll": true      // Mark all as read
}
```

### Delete Notification
```
DELETE /api/notifications
Content-Type: application/json

{
  "notificationId": "notif123"  // Delete specific notification
}
```

OR

```json
{
  "uid": "user123",
  "companyId": "company123",
  "referenceId": "draft123"  // Delete all for reference
}
```

## Usage Examples

### Creating a Notification
```typescript
import { NotificationService } from '@/lib/services/notification-service';

await NotificationService.create({
  uid: 'user123',
  companyId: 'company123',
  type: 'question',
  referenceId: 'chat123',
  title: 'New Question from AI Employee',
  message: 'I need help understanding...',
});
```

### Getting Unread Count
```typescript
const count = await NotificationService.getUnreadCount(
  'user123',
  'company123',
  'question' // Optional: specific type
);
```

### Marking All as Read
```typescript
const markedCount = await NotificationService.markAllAsRead(
  'user123',
  'company123',
  'ai_draft' // Optional: specific type
);
```

### Deleting by Reference
```typescript
const deletedCount = await NotificationService.deleteByReference(
  'user123',
  'company123',
  'draft123'
);
```

## Firestore Indexes Required

For optimal performance, create these composite indexes:

1. **Notifications by User/Company/Type/Read**
   - Collection: `notifications`
   - Fields:
     - `uid` (Ascending)
     - `companyId` (Ascending)
     - `type` (Ascending)
     - `read` (Ascending)
     - `createdAt` (Descending)

2. **Notifications by User/Company/Read**
   - Collection: `notifications`
   - Fields:
     - `uid` (Ascending)
     - `companyId` (Ascending)
     - `read` (Ascending)
     - `createdAt` (Descending)

3. **Notifications by Reference**
   - Collection: `notifications`
   - Fields:
     - `uid` (Ascending)
     - `companyId` (Ascending)
     - `referenceId` (Ascending)

## Future Enhancements

### Potential Additions:
1. **Real-time Updates** - Use Firestore listeners for instant badge updates
2. **Notification Center** - Dedicated page to view all notifications
3. **Push Notifications** - Browser push notifications for important items
4. **Email Digests** - Daily/weekly email summaries of unread notifications
5. **Notification Preferences** - User settings to control notification types
6. **Mark as Unread** - Allow users to mark items as unread
7. **Notification History** - Keep read notifications for a period
8. **Priority Levels** - Different badge colors for urgent notifications
9. **Action Buttons** - Quick actions directly from notifications
10. **Grouping** - Group similar notifications together

### Adding New Notification Types:
1. Add new type to `NotificationType` in `notification-service.ts`
2. Create notification when the event occurs
3. Add badge to sidebar if needed
4. Add mark-as-read logic to the destination page

Example:
```typescript
// In your event handler
await NotificationService.create({
  uid,
  companyId,
  type: 'new_type',
  referenceId: itemId,
  title: 'New Event',
  message: 'Something happened',
});
```

## Performance Considerations

- **Polling Interval**: Currently 30 seconds, adjust based on needs
- **Batch Operations**: Use `markAllAsRead` instead of individual updates
- **Cleanup**: Consider implementing a cleanup job for old read notifications
- **Caching**: Consider caching counts on the client side
- **Indexes**: Ensure all required Firestore indexes are created

## Security

- All API endpoints should validate user authentication
- Users can only access their own notifications
- CompanyId is validated to ensure user has access
- Reference IDs are validated before creating notifications
