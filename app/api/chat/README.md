# Chat Management API

This directory contains the RESTful API endpoints for managing chat sessions in the aikd-next-clone application.

## Authentication

All endpoints require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## Endpoints

### 1. Create Chat

**POST** `/api/chat/create`

Create a new chat session with an AI assistant.

**Request Body:**
```json
{
  "employeeId": "charlie",
  "companyId": "default",
  "title": "New Chat",
  "threadId": "thread_abc123",
  "metadata": {}
}
```

**Response (201):**
```json
{
  "success": true,
  "chatId": "chat_xyz789",
  "chat": {
    "id": "chat_xyz789",
    "title": "New Chat",
    "agentId": "charlie",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "threadId": "thread_abc123",
    "metadata": {}
  }
}
```

### 2. List Chats

**GET** `/api/chat/list`

List chat sessions with pagination and filtering.

**Query Parameters:**
- `companyId` (required): Company/knowledge base ID
- `employeeId` (optional): Filter by AI assistant ID
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page (max: 100)

**Example:**
```
GET /api/chat/list?companyId=default&employeeId=charlie&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "chats": [
    {
      "id": "chat_xyz789",
      "title": "New Chat",
      "agentId": "charlie",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "hasMore": false
  }
}
```

### 3. Update Chat

**PATCH** `/api/chat/[chatId]/update`

Update chat metadata (title, etc.).

**Query Parameters:**
- `companyId` (required): Company/knowledge base ID

**Request Body:**
```json
{
  "title": "Updated Chat Title",
  "metadata": {
    "customField": "value"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "chat": {
    "id": "chat_xyz789",
    "title": "Updated Chat Title",
    "agentId": "charlie",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:10:00Z",
    "metadata": {
      "customField": "value"
    }
  }
}
```

### 4. Delete Chat

**DELETE** `/api/chat/[chatId]/delete`

Delete a chat session and all its messages.

**Query Parameters:**
- `companyId` (required): Company/knowledge base ID

**Response (200):**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

### 5. Create Message

**POST** `/api/chat/[chatId]/messages/create`

Create a new message in a chat session. Supports saving tool calls including function calls, web searches, and code interpreter outputs.

**Request Body:**
```json
{
  "content": "Hello, how can you help me?",
  "role": "user",
  "companyId": "default",
  "toolCalls": [
    {
      "id": "call_abc123",
      "type": "function_call",
      "name": "get_weather",
      "arguments": "{\"location\": \"San Francisco\"}",
      "parsedArguments": {
        "location": "San Francisco"
      },
      "output": "The weather in San Francisco is 72°F and sunny",
      "status": "completed"
    },
    {
      "id": "call_def456",
      "type": "web_search_call",
      "name": "web_search",
      "arguments": "{\"query\": \"latest AI news\"}",
      "output": "Found 10 results about AI developments...",
      "status": "completed"
    },
    {
      "id": "call_ghi789",
      "type": "code_interpreter_call",
      "code": "print('Hello World')",
      "output": "Hello World",
      "status": "completed",
      "files": [
        {
          "file_id": "file_123",
          "filename": "output.txt",
          "container_id": "container_456"
        }
      ]
    }
  ],
  "metadata": {}
}
```

**Response (201):**
```json
{
  "success": true,
  "messageId": "msg_xyz789",
  "message": {
    "id": "msg_xyz789",
    "role": "user",
    "content": "Hello, how can you help me?",
    "timestamp": "2024-01-01T00:00:00Z",
    "toolCalls": [...],
    "metadata": {}
  }
}
```

### 6. List Messages

**GET** `/api/chat/[chatId]/messages/list`

List messages in a chat with pagination. Returns messages in chronological order with all tool call data.

**Query Parameters:**
- `companyId` (required): Company/knowledge base ID
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page (max: 100)

**Example:**
```
GET /api/chat/chat_xyz789/messages/list?companyId=default&page=1&limit=50
```

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Hello!",
      "timestamp": "2024-01-01T00:00:00Z",
      "metadata": {}
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "timestamp": "2024-01-01T00:00:05Z",
      "toolCalls": [
        {
          "id": "call_abc123",
          "type": "function_call",
          "name": "get_greeting",
          "arguments": "{}",
          "output": "Hello!",
          "status": "completed"
        }
      ],
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "hasMore": false
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  }
}
```

### Error Codes

- `AUTH_REQUIRED` (401): Missing or invalid authentication token
- `INVALID_REQUEST` (400): Missing or invalid request parameters
- `NOT_FOUND` (404): Requested resource not found
- `PERMISSION_DENIED` (403): User doesn't have access to the resource
- `INTERNAL_ERROR` (500): Server error

## Data Models

### Chat

```typescript
interface Chat {
  id: string;
  title: string;
  agentId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  preview?: string;
  threadId?: string;
  metadata?: Record<string, any>;
}
```

### Message

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}
```

### ToolCall

```typescript
interface ToolCall {
  id: string;
  type: 'function_call' | 'file_search_call' | 'web_search_call' | 'code_interpreter_call';
  name?: string;
  arguments?: string;
  parsedArguments?: Record<string, any>;
  output?: string;
  status: 'in_progress' | 'completed' | 'failed';
  code?: string;
  files?: CodeInterpreterFile[];
}

interface CodeInterpreterFile {
  file_id: string;
  filename?: string;
  container_id?: string;
}
```

## Firestore Schema

Chats are stored in Firestore at:

```
Users/{userId}/knowledgebases/{companyId}/aiChats/{chatId}
```

Messages are stored as subcollections:

```
Users/{userId}/knowledgebases/{companyId}/aiChats/{chatId}/messages/{messageId}
```

## Service Layer

The API endpoints use service classes for all database operations:
- `ChatService` at `lib/services/chat-service.ts` - Chat management
- `MessageService` at `lib/services/message-service.ts` - Message management

## Authentication Middleware

Authentication is handled by the middleware at `lib/middleware/auth-middleware.ts`, which verifies Firebase ID tokens and provides helper functions for error responses.
