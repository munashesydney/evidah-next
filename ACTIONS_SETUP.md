# Actions Feature

The Actions feature allows users to automate tasks by creating actions that trigger when specific events occur in the system. When triggered, actions create events that are processed by AI employees with full autonomous loop capabilities.

## Overview

Users can create automated actions that:
- Trigger on specific events (new tickets, chat messages, article updates, etc.)
- Assign tasks to specific AI employees (Emma, Marquavious, Sung Wen, or Charlie)
- Execute custom prompts when triggered
- Track execution history through events
- View AI processing messages for each event

## Files Created

### Frontend
- `app/(main)/[selectedCompany]/actions/page.tsx` - Main actions page with UI for creating and managing actions
- `components/actions/action-event-viewer.tsx` - Modal component for viewing action events and their messages

### Backend - Actions
- `app/api/actions/route.ts` - API endpoints for CRUD operations on actions
  - `GET` - Fetch all actions for a user/company
  - `POST` - Create a new action
  - `PUT` - Update an existing action (toggle enabled/disabled, edit details)
  - `DELETE` - Delete an action

### Backend - Events
- `app/api/actions/events/route.ts` - API endpoints for action events
  - `GET` - Fetch all events for a specific action
  - `POST` - Create a new event for an action
- `app/api/actions/events/[eventId]/respond/route.ts` - Process an event with AI (SSE stream)
- `app/api/actions/events/[eventId]/messages/route.ts` - Fetch messages for a specific event

### Services
- `lib/services/action-handler.ts` - Service for triggering and managing actions
- `lib/services/message-service.ts` - Extended to support action event messages

### Integration
- `evidah-node-scripts/functions/api/listenToNewMessages.js` - Updated to check for and trigger actions on ticket replies

### Navigation
- Updated `app/(main)/[selectedCompany]/sidebar.tsx` to include "Actions" tab under "Automation" section

## Database Structure

### Actions
Actions are stored in Firestore at:
```
Users/{uid}/knowledgebases/{selectedCompany}/actions/{actionId}
```

Each action document contains:
- `trigger` - Event that triggers the action (e.g., 'new_ticket', 'ticket_reply')
- `employee` - AI employee assigned to handle the action (e.g., 'emma', 'charlie')
- `prompt` - Custom instructions for what the employee should do
- `enabled` - Boolean flag to enable/disable the action
- `createdAt` - ISO timestamp of creation
- `updatedAt` - ISO timestamp of last update

### Events
Events are stored as subcollections under actions:
```
Users/{uid}/knowledgebases/{selectedCompany}/actions/{actionId}/events/{eventId}
```

Each event document contains:
- `actionId` - Reference to the parent action
- `triggerData` - Data about what triggered the action (ticket info, message content, etc.)
- `status` - Current status: 'pending', 'processing', 'completed', or 'failed'
- `createdAt` - ISO timestamp of creation
- `updatedAt` - ISO timestamp of last update
- `completedAt` - ISO timestamp of completion (null if not completed)
- `messagesSaved` - Number of messages saved during processing
- `error` - Error message if failed (null otherwise)

### Event Messages
Messages are stored as subcollections under events:
```
Users/{uid}/knowledgebases/{selectedCompany}/actions/{actionId}/events/{eventId}/messages/{messageId}
```

Each message document contains:
- `role` - 'user' or 'assistant'
- `content` - Message text content
- `timestamp` - Firestore timestamp
- `createdAt` - ISO timestamp string
- `toolCalls` - Array of tool calls made (optional)
- `metadata` - Additional metadata (optional)

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


## How It Works

### 1. Action Creation
Users create actions through the UI by:
1. Selecting a trigger event (e.g., "Ticket Reply Received")
2. Choosing an AI employee to handle the action
3. Writing a custom prompt describing what should happen
4. Clicking "Create Action"

### 2. Action Triggering
When a trigger event occurs (e.g., a new ticket reply):
1. The Firebase function `listenToNewMessages` detects the event
2. It queries for all enabled actions with matching trigger
3. For each matching action:
   - Creates a new event document
   - Calls the event respond API with context data
   - Passes conversation history and trigger data

### 3. Event Processing
The event respond API:
1. Updates event status to 'processing'
2. Builds a user message with action prompt and trigger data
3. Calls `processEmployeeChat` with the employee processor
4. Streams responses back to the caller via SSE
5. Saves all messages to the event's messages subcollection
6. Updates event status to 'completed' or 'failed'

### 4. Autonomous Loop
The employee processor:
1. Loads the company's knowledge base (vector store)
2. Generates system prompt for the employee
3. Enables tools (file search, web search, functions)
4. Runs autonomous loop with up to 10 iterations
5. Executes tool calls as needed
6. Saves assistant messages with tool call history
7. Continues until no more tool calls are needed

### 5. Viewing Results
Users can:
1. Click on any action to view its event history
2. See all events with status indicators
3. Click on an event to view the full message conversation
4. See what tools were used during processing
5. Review trigger data and completion status

## Integration with listenToNewMessages

The `listenToNewMessages` Firebase function now:
1. Checks for actions with 'ticket_reply' trigger after receiving a new message
2. Creates an event for each matching enabled action
3. Calls the event respond API with:
   - Ticket information (subject, from, ID)
   - Message content
   - Full conversation history
   - Action prompt and employee assignment
4. Processes the response stream asynchronously
5. Logs completion or errors

## API Endpoints

### Actions
- `GET /api/actions?uid={uid}&selectedCompany={company}` - List all actions
- `POST /api/actions` - Create a new action
- `PUT /api/actions` - Update an action
- `DELETE /api/actions` - Delete an action

### Events
- `GET /api/actions/events?uid={uid}&selectedCompany={company}&actionId={actionId}` - List events for an action
- `POST /api/actions/events` - Create a new event
- `POST /api/actions/events/{eventId}/respond` - Process an event with AI (SSE stream)
- `GET /api/actions/events/{eventId}/messages?uid={uid}&selectedCompany={company}&actionId={actionId}` - Get messages for an event

## UI Features

### Actions Page
- List of all created actions with employee avatars
- Status indicators (enabled/disabled toggle)
- Click action to view event history
- Create new actions with form at bottom
- Delete actions with confirmation

### Event Viewer Modal
- Split view: events list on left, messages on right
- Event list shows status, timestamp, and trigger data
- Click event to view full message conversation
- Messages displayed like chat interface
- Tool calls shown with each message
- Status badges (pending, processing, completed, failed)
- Trigger data details (ticket info, etc.)

## Future Enhancements

Potential improvements:
- More trigger types (new_chat, article_created, etc.)
- Action conditions/filters (only trigger if X)
- Action chaining (trigger other actions)
- Scheduled actions (run at specific times)
- Action templates (pre-built common actions)
- Analytics dashboard (action performance metrics)
- Retry failed events
- Manual event triggering
- Action testing/preview mode
