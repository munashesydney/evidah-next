# Actions Feature

The Actions feature allows users to automate tasks by creating actions that trigger when specific events occur in the system.

## Overview

Users can create automated actions that:
- Trigger on specific events (new tickets, chat messages, article updates, etc.)
- Assign tasks to specific AI employees (Emma, Marquavious, Sung Wen, or Charlie)
- Execute custom prompts when triggered

## Files Created

### Frontend
- `app/(main)/[selectedCompany]/actions/page.tsx` - Main actions page with UI for creating and managing actions

### Backend
- `app/api/actions/route.ts` - API endpoints for CRUD operations on actions
  - `GET` - Fetch all actions for a user/company
  - `POST` - Create a new action
  - `PUT` - Update an existing action (toggle enabled/disabled, edit details)
  - `DELETE` - Delete an action

### Navigation
- Updated `app/(main)/[selectedCompany]/sidebar.tsx` to include "Actions" tab under "Automation" section

## Database Structure

Actions are stored in Firestore at:
```
Users/{uid}/knowledgebases/{selectedCompany}/actions/{actionId}
```

Each action document contains:
- `trigger` - Event that triggers the action (e.g., 'new_ticket', 'chat_message')
- `employee` - AI employee assigned to handle the action (e.g., 'emma', 'charlie')
- `prompt` - Custom instructions for what the employee should do
- `enabled` - Boolean flag to enable/disable the action
- `createdAt` - ISO timestamp of creation
- `updatedAt` - ISO timestamp of last update

## Available Triggers

- `new_ticket` - New Ticket Created
- `ticket_reply` - Ticket Reply Received
- `new_chat` - New Chat Started
- `chat_message` - Chat Message Received
- `article_created` - Article Created
- `article_updated` - Article Updated

## Available Employees

- Emma - Knowledge Management
- Marquavious - Live Chat Specialist
- Sung Wen - Training Specialist
- Charlie - Customer Support

## UI Features

### Actions List
- Displays all created actions with employee avatar, trigger type, and prompt
- Toggle switch to enable/disable actions
- Delete button for removing actions
- Empty state when no actions exist

### Create Action Card
- Dropdown to select trigger event
- Visual employee selector with avatars
- Text area for custom prompt
- Create button (disabled until all fields are filled)

## Design

The UI follows the design inspiration provided, featuring:
- Clean card-based layout
- Employee avatars with gradient backgrounds
- Input card at the bottom for creating new actions
- Actions displayed above the input card
- Smooth transitions and hover effects
- Dark mode support

## Usage

1. Navigate to the Actions page from the sidebar
2. Select a trigger event from the dropdown
3. Choose an AI employee by clicking their avatar
4. Enter a custom prompt describing what should happen
5. Click "Create Action" to save
6. Toggle actions on/off using the switch
7. Delete actions using the trash icon
