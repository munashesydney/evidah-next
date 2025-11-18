# Actions Quick Start Guide

## What Are Actions?

Actions are automated workflows that trigger when specific events occur in your system. When triggered, an AI employee processes the action with full autonomous capabilities, using tools and your knowledge base to complete the task.

## Quick Setup

### 1. Create an Action

1. Navigate to the **Actions** page from the sidebar
2. Scroll to the "Create New Action" card at the bottom
3. Select a trigger (e.g., "Ticket Reply Received")
4. Choose an AI employee (Emma, Marquavious, Sung Wen, or Charlie)
5. Write a prompt describing what should happen
6. Click "Create Action"

**Example Prompt:**
```
Analyze the customer's message and provide a helpful, professional response. 
Search the knowledge base for relevant information. If you can't find an answer, 
acknowledge this and offer to escalate to a human agent.
```

### 2. Enable/Disable Actions

- Use the toggle switch on each action card to enable or disable it
- Disabled actions won't trigger even when their event occurs

### 3. View Action History

1. Click on any action card to open the Event Viewer
2. See all events (executions) for that action
3. Click on an event to view the full AI conversation
4. See what tools were used and the final result

## How Actions Work

### When a Trigger Occurs

1. **Event Detection**: System detects the trigger (e.g., ticket reply)
2. **Action Matching**: Finds all enabled actions with that trigger
3. **Event Creation**: Creates an event record for each action
4. **AI Processing**: AI employee processes the event with:
   - Your custom prompt
   - Full conversation history
   - Access to knowledge base
   - All available tools
5. **Message Saving**: All AI messages and tool calls are saved
6. **Status Update**: Event marked as completed or failed

### What the AI Can Do

During action processing, the AI employee can:
- Search your knowledge base (file search)
- Search the web for information
- Call custom functions
- Run code (if enabled)
- Make multiple iterations (up to 10)
- Use accumulated context from previous steps

## Available Triggers

Currently supported:
- **Ticket Reply Received** - When a customer replies to a ticket
- **New Ticket Created** - When a new ticket is created
- **New Chat Started** - When a new chat conversation begins
- **Chat Message Received** - When a chat message is received
- **Article Created** - When a knowledge base article is created
- **Article Updated** - When a knowledge base article is updated

## Best Practices

### Writing Good Prompts

✅ **Good:**
```
When a ticket reply is received, analyze the customer's question and search 
our knowledge base for relevant articles. Provide a clear, helpful response 
with links to relevant documentation. If the issue requires human attention, 
explain why and suggest next steps.
```

❌ **Bad:**
```
Answer the question
```

### Tips

1. **Be Specific**: Clearly describe what the AI should do
2. **Set Expectations**: Tell the AI what to do if it can't complete the task
3. **Use Context**: The AI has access to conversation history
4. **Leverage Tools**: Mention if you want it to search knowledge base or web
5. **Define Tone**: Specify if responses should be formal, friendly, technical, etc.

## Viewing Results

### Event List
- **Status Badges**: 
  - 🟢 Completed - Successfully processed
  - 🔵 Processing - Currently running
  - 🔴 Failed - Error occurred
  - ⚪ Pending - Waiting to process

### Event Details
- **Trigger Data**: See what caused the action to trigger
- **Messages**: Full conversation between system and AI
- **Tool Calls**: See what tools were used (file search, functions, etc.)
- **Timestamps**: When event was created and completed

## Troubleshooting

### Action Not Triggering

1. Check if action is **enabled** (toggle switch)
2. Verify the trigger type matches the event
3. Check Firebase function logs for errors
4. Ensure `FUNCTIONS_MODE` is not set to 'test'

### Event Failed

1. Click the event to view error message
2. Check if AI had access to required tools
3. Verify knowledge base is properly configured
4. Review the prompt for clarity

### No Messages in Event

1. Event may still be processing
2. Check event status
3. Review API logs for errors
4. Verify employee processor is working

## Example Use Cases

### Auto-Response to Tickets
**Trigger**: Ticket Reply Received  
**Employee**: Charlie (Customer Support)  
**Prompt**: "Provide a helpful response to the customer's question. Search the knowledge base first. Be friendly and professional."

### Knowledge Base Updates
**Trigger**: Article Updated  
**Employee**: Emma (Knowledge Management)  
**Prompt**: "Review the updated article for accuracy and completeness. Suggest improvements if needed."

### Chat Greeting
**Trigger**: New Chat Started  
**Employee**: Marquavious (Live Chat)  
**Prompt**: "Greet the customer warmly and ask how you can help them today."

### Ticket Categorization
**Trigger**: New Ticket Created  
**Employee**: Sung Wen (Training Specialist)  
**Prompt**: "Analyze the ticket content and suggest appropriate categories and priority level."

## Advanced Features

### Conversation History
Actions automatically receive the full conversation history, allowing the AI to:
- Reference previous messages
- Maintain context across interactions
- Provide more relevant responses

### Tool Integration
The AI can use multiple tools in sequence:
1. Search knowledge base for information
2. Call a function to get data
3. Search web for additional context
4. Formulate comprehensive response

### Autonomous Loop
The AI can iterate up to 10 times, allowing it to:
- Gather information from multiple sources
- Refine its approach based on results
- Complete complex multi-step tasks

## API Integration

For programmatic access, see the API documentation:
- `/api/actions` - Manage actions
- `/api/actions/events` - View and create events
- `/api/actions/events/{eventId}/respond` - Process events
- `/api/actions/events/{eventId}/messages` - View event messages

## Need Help?

- Check the full documentation in `ACTIONS_SETUP.md`
- Review implementation details in `ACTION_EVENTS_IMPLEMENTATION.md`
- Check Firebase function logs for trigger issues
- Review API logs for processing errors
