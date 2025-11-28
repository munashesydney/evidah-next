import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
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

export type NotificationType = 'question' | 'ai_draft' | 'inbox';

export interface Notification {
  id: string;
  uid: string;
  companyId: string;
  type: NotificationType;
  referenceId: string; // ID of the question or draft
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async create(data: {
    uid: string;
    companyId: string;
    type: NotificationType;
    referenceId: string;
    title: string;
    message: string;
  }): Promise<Notification> {
    const now = Timestamp.now();

    const notificationData = {
      uid: data.uid,
      companyId: data.companyId,
      type: data.type,
      referenceId: data.referenceId,
      title: data.title,
      message: data.message,
      read: false,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('notifications').add(notificationData);

    return {
      id: docRef.id,
      ...notificationData,
    };
  }

  /**
   * Get notifications for a user and company
   */
  static async getNotifications(
    uid: string,
    companyId: string,
    options?: {
      type?: NotificationType;
      unreadOnly?: boolean;
      limit?: number;
    }
  ): Promise<Notification[]> {
    let query = db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('companyId', '==', companyId);

    if (options?.type) {
      query = query.where('type', '==', options.type);
    }

    if (options?.unreadOnly) {
      query = query.where('read', '==', false);
    }

    query = query.orderBy('createdAt', 'desc');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  }

  /**
   * Get unread count by type
   */
  static async getUnreadCount(
    uid: string,
    companyId: string,
    type?: NotificationType
  ): Promise<number> {
    let query = db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('companyId', '==', companyId)
      .where('read', '==', false);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await db.collection('notifications').doc(notificationId).update({
      read: true,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Mark all notifications as read for a user/company/type
   */
  static async markAllAsRead(
    uid: string,
    companyId: string,
    type?: NotificationType
  ): Promise<number> {
    let query = db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('companyId', '==', companyId)
      .where('read', '==', false);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
    return snapshot.size;
  }

  /**
   * Delete a notification
   */
  static async delete(notificationId: string): Promise<void> {
    await db.collection('notifications').doc(notificationId).delete();
  }

  /**
   * Delete notifications by reference ID (when the source is deleted)
   */
  static async deleteByReference(
    uid: string,
    companyId: string,
    referenceId: string
  ): Promise<number> {
    const snapshot = await db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('companyId', '==', companyId)
      .where('referenceId', '==', referenceId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  /**
   * Check if notification exists for a reference
   */
  static async existsForReference(
    uid: string,
    companyId: string,
    referenceId: string
  ): Promise<boolean> {
    const snapshot = await db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('companyId', '==', companyId)
      .where('referenceId', '==', referenceId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }
}
