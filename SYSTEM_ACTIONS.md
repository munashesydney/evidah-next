# System Actions Feature

## Overview
System Actions are predefined, recommended automation actions that provide essential workflows for all users. They're designed to be easy to install and provide immediate value.

## Features

### 1. **Three Core System Actions**

#### New Ticket Auto-Draft
- **Trigger:** `new_ticket`
- **Employee:** Charlie
- **Purpose:** Automatically creates draft email responses for new support tickets
- **Behavior:**
  - Searches knowledge base first
  - Escalates to human if uncertain
  - Keeps responses brief (2-4 sentences)
  - Provides actionable next steps

#### Ticket Reply Auto-Draft
- **Trigger:** `ticket_reply`
- **Employee:** Charlie
- **Purpose:** Automatically creates draft email responses when customers reply
- **Behavior:**
  - Reviews full conversation history
  - Searches knowledge base for answers
  - Escalates to human if uncertain
  - Maintains context from previous messages

#### Question Answered Auto-Response
- **Trigger:** `question_answered`
- **Employee:** Charlie
- **Purpose:** Automatically responds to tickets when related questions are answered by humans
- **Behavior:**
  - Reviews the human-provided answer
  - Crafts a brief, helpful response
  - Sends immediately (no confirmation needed)
  - Uses authoritative answer from human

### 2. **Smart Detection Banner**
- Automatically detects if user is missing system actions
- Shows a prominent banner with:
  - List of included actions
  - One-click installation button
  - Dismissible interface

### 3. **System Action Labels**
- System actions are marked with a "SYSTEM" badge
- Cannot be edited or deleted (only enabled/disabled)
- Clearly distinguished from custom actions

### 4. **Easy Installation**
- Single button installs all three actions
- Prevents duplicates automatically
- Marks actions as system-managed

## Technical Implementation

### Files Created/Modified

1. **`lib/services/system-actions.ts`**
   - Defines all system actions
   - Provides helper functions for detection
   - Centralized configuration

2. **`app/api/actions/install-system/route.ts`**
   - API endpoint for installing system actions
   - Handles duplicate prevention
   - Marks actions with `isSystem` flag

3. **`app/(main)/[selectedCompany]/actions/page.tsx`**
   - Updated to show system banner
   - Added SYSTEM labels
   - Prevents editing/deleting system actions

### Database Schema

System actions are stored with additional fields:
```typescript
{
  trigger: string;
  employee: string;
  prompt: string;
  enabled: boolean;
  isSystem: true;           // Marks as system action
  systemActionId: string;   // Reference to system action definition
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Prompt Design

All system action prompts follow a consistent structure:

1. **Context** - What triggered this action
2. **Critical Instructions** - Key rules to follow
3. **Workflow** - Step-by-step process
4. **Response Style** - How to communicate (brief, friendly, professional)
5. **Escalation** - When and how to escalate to humans

### Key Principles:
- **Honesty First** - Always escalate when uncertain
- **Brevity** - Keep responses concise (2-4 sentences when possible)
- **Search First** - Always check knowledge base before responding
- **Actionable** - Provide clear next steps
- **Professional** - Warm but professional tone

## Future Extensibility

Adding new system actions is straightforward:

1. Add to `SYSTEM_ACTIONS` array in `lib/services/system-actions.ts`
2. Define trigger, employee, prompt, name, and description
3. System will automatically detect and offer installation

Example:
```typescript
{
  id: 'system_new_action',
  trigger: 'some_trigger',
  employee: 'employee_id',
  name: 'Action Name',
  description: 'What this action does',
  prompt: 'Detailed instructions...'
}
```

## User Experience

1. User visits Actions page
2. If missing system actions, sees prominent banner
3. Clicks "Install System Actions"
4. All three actions installed instantly
5. Actions appear in list with SYSTEM badge
6. Can enable/disable but not edit/delete
7. Can view event history like any other action

## Benefits

- **Quick Setup** - Get started with automation in seconds
- **Best Practices** - Prompts designed for optimal results
- **Consistency** - Same experience across all users
- **Maintainable** - Easy to update prompts centrally
- **Extensible** - Simple to add more system actions
