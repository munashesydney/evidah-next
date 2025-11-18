import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
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

/**
 * GET /api/actions/events/[eventId]/messages
 * Get all messages for a specific event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const actionId = searchParams.get('actionId');

    if (!uid || !actionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and actionId' },
        { status: 400 }
      );
    }

    console.log(`[ACTION EVENT MESSAGES] Fetching messages for event ${eventId}`);

    const messagesRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc(actionId)
      .collection('events')
      .doc(eventId)
      .collection('messages')
      .orderBy('createdAt', 'asc');

    const snapshot = await messagesRef.get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[ACTION EVENT MESSAGES] Found ${messages.length} messages`);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error('[ACTION EVENT MESSAGES] Error fetching messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch messages',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
