# AI Chat Implementation Guide

## Overview

A complete AI chat interface has been implemented at `(main)/[selectedCompany]/chat/[employeeId]` using the OpenAI Responses API with streaming support, web search, file search, code interpreter, and custom functions.

## What's Been Implemented

### ✅ Core Infrastructure

#### Library Files (`lib/chat/`)
- **`assistant.ts`** - Core message processing, streaming logic, and event handling
- **`tools/tools.ts`** - Tool configuration builder for enabling/disabling features
- **`tools/tools-handling.ts`** - Function execution handler
- **`utils.ts`** - Utility functions

#### Configuration Files (`config/chat/`)
- **`constants.ts`** - Model settings, developer prompts, initial messages
- **`functions.ts`** - Function definitions (get_weather, get_joke)
- **`tools-list.ts`** - Available tools configuration

#### State Management (`stores/chat/`)
- **`useConversationStore.ts`** - Chat messages and conversation state (Zustand)
- **`useToolsStore.ts`** - Tools configuration state (persisted)

### ✅ API Endpoints (`app/api/chat/`)

#### Main Endpoint
- **`turn_response/route.ts`** - Streaming SSE endpoint for AI responses

#### Function Endpoints
- **`functions/get_weather/route.ts`** - Get weather for a location
- **`functions/get_joke/route.ts`** - Get programming jokes

#### Vector Store Endpoints
- **`vector_stores/create_store/route.ts`** - Create vector store
- **`vector_stores/upload_file/route.ts`** - Upload file to OpenAI
- **`vector_stores/add_file/route.ts`** - Add file to vector store
- **`vector_stores/list_files/route.ts`** - List vector store files
- **`vector_stores/retrieve_store/route.ts`** - Get vector store details

#### File Retrieval
- **`container_files/content/route.ts`** - Retrieve code interpreter output files

### ✅ UI Components (`components/chat/`)

- **`assistant.tsx`** - Main assistant wrapper component
- **`chat.tsx`** - Chat interface with message list and input
- **`message.tsx`** - Individual message display (user/assistant)
- **`tool-call.tsx`** - Tool call display for all tool types
- **`annotations.tsx`** - File/web citation annotations
- **`loading-message.tsx`** - Loading indicator with animation
- **`functions-view.tsx`** - Function call visualization
- **`tools-panel.tsx`** - Settings panel for tool configuration

### ✅ Chat Page

**Location:** `app/(main)/[selectedCompany]/chat/[employeeId]/page.tsx`

**Features:**
- Employee-specific branding and theming
- Firebase integration for chat persistence
- Chat history sidebar (mobile drawer)
- Tools configuration panel (mobile overlay)
- Real-time streaming responses
- Dark mode support
- Fully responsive design

## How to Use

### 1. Environment Setup

Add to `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Navigate to Chat

Access the chat page at:
```
/[selectedCompany]/chat/[employeeId]
```

Example:
```
/default/chat/charlie
/default/chat/emma
/default/chat/marquavious
/default/chat/sung-wen
```

### 3. Available Employees

- **Charlie** (amber/orange theme) - Customer Support
- **Emma** (pink theme) - Knowledge Management
- **Marquavious** (blue theme) - Live Chat Specialist
- **Sung Wen** (emerald theme) - Training Specialist

## Features

### 🔍 Web Search
- Enable/disable in tools panel
- Searches the web for up-to-date information
- Displays URL citations

### 📁 File Search
- Upload documents to vector store
- Search uploaded files for relevant information
- Supports PDF, TXT, MD, and more
- Displays file citations

### 💻 Code Interpreter
- Runs Python code
- Generates charts and visualizations
- Downloads output files
- Shows code execution with syntax highlighting

### ⚡ Custom Functions
- **get_weather** - Get current weather for any location
- **get_joke** - Get programming jokes
- Add more functions in `config/chat/functions.ts` and `config/chat/tools-list.ts`

### 💬 Streaming Responses
- Real-time message updates
- Progressive tool call display
- Smooth animations

### 🎨 Employee Theming
- Unique color scheme per employee
- Gradient backgrounds
- Consistent branding

### 📱 Mobile Support
- Responsive layout
- Mobile drawers for sidebars
- Touch-friendly controls

### 🌓 Dark Mode
- Full dark mode support
- Automatic theme detection
- Smooth transitions

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/[selectedCompany]/chat/[employeeId]/
│   │   └── page.tsx                          # Main chat page
│   └── api/chat/
│       ├── turn_response/route.ts            # Streaming endpoint
│       ├── functions/
│       │   ├── get_weather/route.ts
│       │   └── get_joke/route.ts
│       ├── vector_stores/
│       │   ├── create_store/route.ts
│       │   ├── upload_file/route.ts
│       │   ├── add_file/route.ts
│       │   ├── list_files/route.ts
│       │   └── retrieve_store/route.ts
│       └── container_files/content/route.ts
├── components/chat/
│   ├── assistant.tsx
│   ├── chat.tsx
│   ├── message.tsx
│   ├── tool-call.tsx
│   ├── annotations.tsx
│   ├── loading-message.tsx
│   ├── functions-view.tsx
│   └── tools-panel.tsx
├── lib/chat/
│   ├── assistant.ts
│   ├── tools/
│   │   ├── tools.ts
│   │   └── tools-handling.ts
│   └── utils.ts
├── stores/chat/
│   ├── useConversationStore.ts
│   └── useToolsStore.ts
└── config/chat/
    ├── constants.ts
    ├── functions.ts
    └── tools-list.ts
```

## Dependencies Installed

```json
{
  "openai": "^4.x",
  "zustand": "^4.x",
  "partial-json": "^0.x",
  "react-markdown": "^9.x",
  "react-syntax-highlighter": "^15.x",
  "@types/react-syntax-highlighter": "^15.x",
  "lucide-react": "^0.x"
}
```

## Firebase Integration

Chats are stored in Firestore:
```
Users/{uid}/knowledgebases/{companyId}/aiChats/{chatId}
```

Each chat document contains:
- `id` - Unique chat identifier
- `title` - Chat title
- `agentId` - Employee ID (charlie, emma, etc.)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

## Adding New Functions

1. **Define the function** in `config/chat/functions.ts`:
```typescript
export const my_function = async ({ param1, param2 }: { param1: string; param2: number }) => {
  const res = await fetch(`/api/chat/functions/my_function?param1=${param1}&param2=${param2}`)
    .then((res) => res.json());
  return res;
};

export const functionsMap = {
  get_weather,
  get_joke,
  my_function, // Add here
};
```

2. **Add to tools list** in `config/chat/tools-list.ts`:
```typescript
{
  name: "my_function",
  description: "Description of what the function does",
  parameters: {
    param1: {
      type: "string",
      description: "Description of param1",
    },
    param2: {
      type: "number",
      description: "Description of param2",
    },
  },
}
```

3. **Create API endpoint** at `app/api/chat/functions/my_function/route.ts`:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const param1 = searchParams.get("param1");
  const param2 = searchParams.get("param2");
  
  // Your logic here
  
  return new Response(JSON.stringify({ result: "data" }), { status: 200 });
}
```

## Customization

### Change Model
Edit `config/chat/constants.ts`:
```typescript
export const MODEL = "gpt-4o"; // Change to any supported model
```

### Change Initial Message
Edit `config/chat/constants.ts`:
```typescript
export const INITIAL_MESSAGE = `Your custom greeting message`;
```

### Change Developer Prompt
Edit `config/chat/constants.ts`:
```typescript
export const DEVELOPER_PROMPT = `Your custom system prompt`;
```

### Add New Employee
Edit `app/(main)/[selectedCompany]/chat/[employeeId]/page.tsx` and add to the `employees` object.

## Testing

### Test Web Search
1. Enable "Web Search" in tools panel
2. Ask: "What's the latest news about AI?"
3. Should see web search indicator and URL citations

### Test File Search
1. Enable "File Search" in tools panel
2. Upload a PDF document
3. Ask questions about the document content
4. Should see file citations

### Test Code Interpreter
1. Enable "Code Interpreter" in tools panel
2. Ask: "Create a chart showing fibonacci numbers"
3. Should see Python code execution and downloadable chart

### Test Functions
1. Enable "Functions" in tools panel
2. Ask: "What's the weather in San Francisco?"
3. Should see function call with arguments and results

## Troubleshooting

### No Streaming
- Check `OPENAI_API_KEY` is set in `.env.local`
- Verify API endpoint is accessible
- Check browser console for errors

### Firebase Errors
- Ensure Firebase is initialized in `lib/firebase.ts`
- Check Firestore rules allow read/write
- Verify user is authenticated

### Dark Mode Not Working
- Check `next-themes` is installed and configured
- Verify theme provider wraps the app

## Next Steps

1. ✅ Implement chat history persistence
2. ✅ Add chat title editing
3. ✅ Add chat deletion
4. ✅ Implement chat search
5. ✅ Add file upload UI for vector stores
6. ✅ Add web search location configuration
7. ✅ Implement personality settings
8. ✅ Add upgrade prompts for locked features

## Support

For issues or questions, refer to:
- [OpenAI Responses API Docs](https://platform.openai.com/docs/api-reference/responses)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

