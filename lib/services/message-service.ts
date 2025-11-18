import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export interface CodeInterpreterFile {
  file_id: string;
  filename?: string;
  container_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function_call' | 'file_search_call' | 'web_search_call' | 'code_interpreter_call';
  name?: string | null;
  arguments?: string;
  parsedArguments?: Record<string, any>;
  output?: string | null;
  status: 'in_progress' | 'completed' | 'failed' | 'searching';
  code?: string;
  files?: CodeInterpreterFile[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

export interface CreateMessageData {
  content: string;
  role: 'user' | 'assistant';
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

export interface ListMessagesResult {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export class MessageService {
  /**
   * Create a new message in a chat
   */
  static async createMessage(
    userId: string,
    companyId: string,
    chatId: string,
    data: CreateMessageData
  ): Promise<Message> {
    const now = Timestamp.now();
    
    const messageData = {
      role: data.role,
      content: data.content,
      timestamp: now,
      ...(data.toolCalls && data.toolCalls.length > 0 && { toolCalls: data.toolCalls }),
      metadata: data.metadata || {},
    };

    const messageRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId)
      .collection('messages')
      .doc();

    await messageRef.set(messageData);

    // Update chat's updatedAt timestamp and preview
    const chatRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId);

    await chatRef.update({
      updatedAt: now,
      preview: data.content.substring(0, 100),
    });

    return {
      id: messageRef.id,
      ...messageData,
    } as Message;
  }

  /**
   * Create a new message in an action event
   */
  static async createActionEventMessage(
    userId: string,
    companyId: string,
    actionId: string,
    eventId: string,
    data: CreateMessageData
  ): Promise<Message> {
    const now = Timestamp.now();
    
    const messageData = {
      role: data.role,
      content: data.content,
      timestamp: now,
      createdAt: now.toDate().toISOString(),
      ...(data.toolCalls && data.toolCalls.length > 0 && { toolCalls: data.toolCalls }),
      metadata: data.metadata || {},
    };

    const messageRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('actions')
      .doc(actionId)
      .collection('events')
      .doc(eventId)
      .collection('messages')
      .doc();

    await messageRef.set(messageData);

    return {
      id: messageRef.id,
      ...messageData,
    } as Message;
  }

  /**
   * List messages in a chat with pagination
   */
  static async listMessages(
    userId: string,
    companyId: string,
    chatId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ListMessagesResult> {
    const query = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc');

    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await query.limit(limit).offset(offset).get();

    const messages: Message[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Message));

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + messages.length < total,
      },
    };
  }

  /**
   * Save tool call results to an existing message
   */
  static async saveToolCallResults(
    userId: string,
    companyId: string,
    chatId: string,
    messageId: string,
    toolCalls: ToolCall[]
  ): Promise<void> {
    const messageRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    // Check if message exists
    const doc = await messageRef.get();
    if (!doc.exists) {
      throw new Error('Message not found');
    }

    // Update with tool calls
    await messageRef.update({
      toolCalls,
    });
  }
}
