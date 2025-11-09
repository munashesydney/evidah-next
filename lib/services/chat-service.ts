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

export interface Chat {
  id: string;
  title: string;
  agentId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  preview?: string;
  threadId?: string;
  metadata?: Record<string, any>;
}

export interface CreateChatData {
  employeeId: string;
  title?: string;
  threadId?: string;
  metadata?: Record<string, any>;
}

export interface ListChatsResult {
  chats: Chat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export class ChatService {
  /**
   * Create a new chat session
   */
  static async createChat(
    userId: string,
    companyId: string,
    data: CreateChatData
  ): Promise<Chat> {
    const now = Timestamp.now();
    const chatData = {
      title: data.title || 'New Chat',
      agentId: data.employeeId,
      createdAt: now,
      updatedAt: now,
      ...(data.threadId && { threadId: data.threadId }),
      metadata: data.metadata || {},
    };

    const chatRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc();

    await chatRef.set(chatData);

    return {
      id: chatRef.id,
      ...chatData,
    } as Chat;
  }

  /**
   * List chats with pagination and filtering
   */
  static async listChats(
    userId: string,
    companyId: string,
    employeeId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ListChatsResult> {
    let query = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .orderBy('updatedAt', 'desc');

    // Filter by employeeId if provided
    if (employeeId) {
      query = query.where('agentId', '==', employeeId) as any;
    }

    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await query.limit(limit).offset(offset).get();

    const chats: Chat[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Chat));

    return {
      chats,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + chats.length < total,
      },
    };
  }

  /**
   * Get a single chat by ID
   */
  static async getChat(
    userId: string,
    companyId: string,
    chatId: string
  ): Promise<Chat | null> {
    const chatRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId);

    const doc = await chatRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Chat;
  }

  /**
   * Update chat metadata
   */
  static async updateChat(
    userId: string,
    companyId: string,
    chatId: string,
    updates: Partial<Chat>
  ): Promise<Chat> {
    const chatRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId);

    // Check if chat exists
    const doc = await chatRef.get();
    if (!doc.exists) {
      throw new Error('Chat not found');
    }

    // Update with timestamp
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    await chatRef.update(updateData);

    const updatedDoc = await chatRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Chat;
  }

  /**
   * Delete a chat and all its messages
   */
  static async deleteChat(
    userId: string,
    companyId: string,
    chatId: string
  ): Promise<void> {
    const chatRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId);

    // Check if chat exists
    const doc = await chatRef.get();
    if (!doc.exists) {
      throw new Error('Chat not found');
    }

    // Delete all messages in the chat
    const messagesRef = chatRef.collection('messages');
    const messagesSnapshot = await messagesRef.get();

    const batch = db.batch();
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the chat document
    batch.delete(chatRef);

    await batch.commit();
  }
}
