import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { EmployeeProcessorMessage } from '@/lib/chat/employee-processor';
import { ToolsState } from '@/stores/chat/useToolsStore';

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

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ChatJob {
  id: string;
  status: JobStatus;
  chatId: string;
  companyId: string;
  userId: string;
  employeeId?: string;
  messages: EmployeeProcessorMessage[];
  personalityLevel: number;
  toolsState?: ToolsState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  messagesSaved?: number;
  retryCount?: number;
}

export interface CreateJobData {
  chatId: string;
  companyId: string;
  userId: string;
  employeeId?: string;
  messages: EmployeeProcessorMessage[];
  personalityLevel?: number;
  toolsState?: ToolsState;
}

export class JobQueueService {
  /**
   * Enqueue a new chat processing job
   */
  static async enqueue(data: CreateJobData): Promise<ChatJob> {
    const now = Timestamp.now();
    
    const jobData = {
      status: 'pending' as JobStatus,
      chatId: data.chatId,
      companyId: data.companyId,
      userId: data.userId,
      employeeId: data.employeeId,
      messages: data.messages,
      personalityLevel: data.personalityLevel ?? 2,
      toolsState: data.toolsState,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
    };

    const jobRef = db
      .collection('Users')
      .doc(data.userId)
      .collection('knowledgebases')
      .doc(data.companyId)
      .collection('chatJobs')
      .doc();

    await jobRef.set(jobData);

    return {
      id: jobRef.id,
      ...jobData,
    } as ChatJob;
  }

  /**
   * Get pending jobs for processing (limited to prevent overload)
   * 
   * Note: This uses a collection group query which requires a Firestore index.
   * Create an index on: collectionGroup('chatJobs'), fields: status (Ascending), createdAt (Ascending)
   */
  static async getPendingJobs(limit: number = 10): Promise<ChatJob[]> {
    try {
      // Query across all users/companies for pending jobs
      // Note: This requires a collection group query with a composite index
      const jobsRef = db.collectionGroup('chatJobs');
      const snapshot = await jobsRef
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ChatJob));
    } catch (error: any) {
      // If index doesn't exist, Firestore will throw an error with index creation link
      if (error.code === 9 || error.message?.includes('index')) {
        console.error(
          '[JOB QUEUE] Collection group index required. ' +
          'Create an index on collectionGroup("chatJobs") with fields: status (Ascending), createdAt (Ascending). ' +
          'Check the error message for the index creation link.'
        );
      }
      throw error;
    }
  }

  /**
   * Get pending jobs for a specific user/company
   */
  static async getPendingJobsForChat(
    userId: string,
    companyId: string,
    chatId: string
  ): Promise<ChatJob[]> {
    const jobsRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs');

    const snapshot = await jobsRef
      .where('status', '==', 'pending')
      .where('chatId', '==', chatId)
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ChatJob));
  }

  /**
   * Get a job by ID
   */
  static async getJob(
    userId: string,
    companyId: string,
    jobId: string
  ): Promise<ChatJob | null> {
    const jobRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs')
      .doc(jobId);

    const doc = await jobRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as ChatJob;
  }

  /**
   * Update job status to processing
   */
  static async markAsProcessing(
    userId: string,
    companyId: string,
    jobId: string
  ): Promise<void> {
    const jobRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs')
      .doc(jobId);

    await jobRef.update({
      status: 'processing',
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Mark job as completed
   */
  static async markAsCompleted(
    userId: string,
    companyId: string,
    jobId: string,
    messagesSaved: number
  ): Promise<void> {
    const jobRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs')
      .doc(jobId);

    await jobRef.update({
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      messagesSaved,
    });
  }

  /**
   * Mark job as failed
   */
  static async markAsFailed(
    userId: string,
    companyId: string,
    jobId: string,
    error: string,
    retryCount?: number
  ): Promise<void> {
    const jobRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs')
      .doc(jobId);

    const updateData: any = {
      status: 'failed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      error,
    };

    if (retryCount !== undefined) {
      updateData.retryCount = retryCount;
    }

    await jobRef.update(updateData);
  }

  /**
   * Retry a failed job (reset to pending)
   */
  static async retryJob(
    userId: string,
    companyId: string,
    jobId: string
  ): Promise<void> {
    const jobRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs')
      .doc(jobId);

    const doc = await jobRef.get();
    if (!doc.exists) {
      throw new Error('Job not found');
    }

    const currentRetryCount = (doc.data()?.retryCount || 0) as number;
    const maxRetries = 3;

    if (currentRetryCount >= maxRetries) {
      throw new Error('Max retries exceeded');
    }

    await jobRef.update({
      status: 'pending',
      updatedAt: Timestamp.now(),
      retryCount: currentRetryCount + 1,
      error: null,
    });
  }

  /**
   * Delete old completed/failed jobs (cleanup)
   */
  static async cleanupOldJobs(
    userId: string,
    companyId: string,
    olderThanDays: number = 7
  ): Promise<number> {
    const cutoffDate = Timestamp.fromDate(
      new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    );

    const jobsRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs');

    const snapshot = await jobsRef
      .where('status', 'in', ['completed', 'failed'])
      .where('completedAt', '<', cutoffDate)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  /**
   * Write a streaming update to Firestore for real-time frontend updates
   * Updates are stored in: chatJobs/{jobId}/updates/{updateId}
   */
  static async writeStreamingUpdate(
    userId: string,
    companyId: string,
    jobId: string,
    update: {
      type: 'message_delta' | 'tool_call_start' | 'tool_call_complete' | 'assistant_message_saved' | 'error';
      data: any;
    }
  ): Promise<void> {
    // Skip updates with null/undefined data (some events might not have data)
    if (update.data === null || update.data === undefined) {
      console.warn(`[JOB QUEUE] Skipping update with null data for type: ${update.type}`);
      return;
    }

    const updateRef = db
      .collection('Users')
      .doc(userId)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('chatJobs')
      .doc(jobId)
      .collection('updates')
      .doc();

    await updateRef.set({
      type: update.type,
      data: update.data || {}, // Fallback to empty object if somehow still null
      timestamp: Timestamp.now(),
    });
  }
}

