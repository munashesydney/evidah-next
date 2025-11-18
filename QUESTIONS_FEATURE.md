# Questions Feature

## Overview

The Questions feature allows AI employees to escalate uncertainties to human users. When an AI assistant (like Marquavious or Charlie) encounters something they're not 100% certain about, they can create a question that gets routed to Sung Wen for human review.

## How It Works

### 1. AI Escalation
When a public-facing AI assistant needs help:
1. Calls the `escalate_to_human` tool with:
   - `reason`: Why escalation is needed
   - `urgency`: low, medium, or high
   - `summary`: Brief description of the issue
   - `conversationContext`: Optional conversation history

### 2. Question Creation
The system automatically:
1. Creates a new chat with Sung Wen employee
2. Marks it as type: 'question' in metadata
3. Adds an initial message describing the question
4. Sends email notification to the user

### 3. User Notification
User receives an email with:
- Urgency indicator (🚨 high, ⚠️ medium, 💬 low)
- Reason for escalation
- Summary of the issue
- Direct link to review the question

### 4. Question Review
User can:
- View all questions in the Questions tab
- Click any question to open chat with Sung Wen
- Review context and provide guidance
- Chat continues with full AI capabilities

## Files Created

### Frontend
- `app/(main)/[selectedCompany]/questions/page.tsx` - Questions list page

### Backend
- `app/api/notify/question/route.ts` - Email notification endpoint
- `app/api/chat/list/route.ts` - List chats with filtering
- Updated `app/api/chat/create/route.ts` - Support uid parameter
- Updated `app/api/chat/[chatId]/messages/create/route.ts` - Support uid parameter

### Services
- Updated `lib/public-assistant/tools.ts` - Implemented escalate_to_human function

### Navigation
- Updated `app/(main)/[selectedCompany]/sidebar.tsx` - Added Questions tab

## API Endpoints

### Create Question (Internal)
Automatically called by `escalate_to_human` tool:
1. `POST /api/chat/create` - Creates question chat
2. `POST /api/chat/{chatId}/messages/create` - Adds initial message
3. `POST /api/notify/question` - Sends email notification

### List Questions
```
GET /api/chat/list?uid={uid}&companyId={company}&employeeId=sung-wen
```
Returns all chats with Sung Wen, filtered for type: 'question'

## Database Structure

Questions are stored as regular chats with special metadata:

```
Users/{uid}/knowledgebases/{company}/aiChats/{chatId}
{
  title: "Question: {reason}",
  agentId: "sung-wen",
  metadata: {
    type: "question",
    escalation: true,
    reason: "Unable to find pricing information",
    urgency: "medium",
    summary: "Customer asking about enterprise pricing",
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## UI Features

### Questions Page
- List of all escalated questions
- Urgency indicators with icons and colors
- Timestamp and reason display
- Click to open chat with Sung Wen
- Empty state when no questions
- Info box explaining the feature

### Question Cards
- Urgency badge (color-coded)
- Emoji indicator (🚨 ⚠️ 💬)
- Reason as title
- Summary preview
- Timestamp
- Hover effects and cursor pointer

### Email Notification
- Professional HTML email
- Gradient header
- Urgency-specific styling
- Question details box
- Direct CTA button to review
- Responsive design

## Usage Example

### From Public Assistant
```typescript
// AI assistant calls this when uncertain
await executePublicAssistantTool('escalate_to_human', {
  reason: 'Unable to find specific pricing information',
  urgency: 'medium',
  summary: 'Customer asking about enterprise plan pricing for 100+ users',
  uid: 'user123',
  companyId: 'company456',
  conversationContext: 'Previous messages...'
});
```

### Result
1. Question chat created with Sung Wen
2. Email sent to user
3. Question appears in Questions tab
4. User clicks to review
5. Redirected to: `/{company}/chat/sung-wen?chatId={chatId}`

## Integration Points

### Public Assistant Tools
- `lib/public-assistant/tools.ts` - Defines escalate_to_human tool
- Called automatically by AI when needed
- Requires uid and companyId to be passed

### Chat System
- Uses existing chat infrastructure
- Sung Wen employee handles all questions
- Full AI capabilities available for responses
- Conversation history maintained

### Email System
- Uses existing SMTP configuration
- Professional HTML templates
- Urgency-based styling
- Direct links to questions

## Configuration

### Environment Variables
Required for email notifications:
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `NEXT_PUBLIC_BASE_URL` - Base URL for links

### Employee Assignment
Questions are always assigned to Sung Wen:
- Employee ID: `sung-wen`
- Role: Training Specialist
- Avatar: `/images/characters/sw.png`
- Gradient: `from-emerald-500 to-emerald-700`

## Best Practices

### For AI Assistants
- Escalate when not 100% certain
- Provide clear reason for escalation
- Include relevant context
- Set appropriate urgency level
- Add helpful summary

### For Users
- Review questions promptly
- Provide clear guidance
- Update knowledge base if needed
- Use chat for back-and-forth
- Mark as resolved when done

## Future Enhancements

Potential improvements:
- Question status tracking (open, in-progress, resolved)
- Assignment to different employees
- Question categories/tags
- Search and filtering
- Analytics dashboard
- Bulk actions
- Question templates
- Auto-resolution suggestions
- Integration with training system
- Question history and trends
