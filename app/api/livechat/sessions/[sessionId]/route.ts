import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.log('Firebase admin initialization error', error);
  }
}

const db = admin.firestore();

/**
 * GET /api/livechat/sessions/[sessionId]
 * Retrieves a single live chat session with all messages
 * 
 * Query parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * 
 * Route parameters:
 * - sessionId: Session ID (from URL)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const { sessionId } = await params;

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    // Reference to session document
    const sessionDocRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default')
      .collection('sessions')
      .doc(sessionId);

    // Get session document
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { status: 0, message: 'Session not found' },
        { status: 404 }
      );
    }

    const data = sessionDoc.data();

    // Deduplicate messages (similar to React app logic)
    const rawMessages = data?.messages || [];
    const deduplicatedMessages = deduplicateMessages(rawMessages);

    // Build session object
    const session = {
      id: sessionDoc.id,
      uid: uid,
      selectedCompany: selectedCompany,
      userInfo: data?.userInfo || {},
      messages: deduplicatedMessages,
      lastActivity: data?.lastActivity,
      status: data?.status || 'New',
      createdAt: data?.createdAt,
      lastMessage: deduplicatedMessages.length > 0 
        ? deduplicatedMessages[deduplicatedMessages.length - 1] 
        : null,
      messageCount: deduplicatedMessages.length,
    };

    return NextResponse.json({
      status: 1,
      message: 'Session retrieved successfully',
      session,
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching session', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Deduplicate messages - removes duplicate bot messages within 5 seconds
 * (Same logic as React app)
 */
function deduplicateMessages(messages: any[]): any[] {
  if (!messages || messages.length === 0) return messages;

  const deduplicated: any[] = [];
  let lastBotMessage: any = null;

  for (let i = 0; i < messages.length; i++) {
    const currentMessage = messages[i];

    // Always keep user messages
    if (currentMessage.type === 'user') {
      deduplicated.push(currentMessage);
      lastBotMessage = null;
      continue;
    }

    // For bot messages, check if it's a duplicate
    if (currentMessage.type === 'bot') {
      const lastTimestamp = lastBotMessage?.timestamp
        ? lastBotMessage.timestamp.seconds * 1000 + Math.floor((lastBotMessage.timestamp.nanoseconds || 0) / 1000000)
        : 0;
      const currentTimestamp = currentMessage.timestamp
        ? currentMessage.timestamp.seconds * 1000 + Math.floor((currentMessage.timestamp.nanoseconds || 0) / 1000000)
        : 0;

      const isDuplicate =
        lastBotMessage &&
        lastBotMessage.type === 'bot' &&
        lastBotMessage.content === currentMessage.content &&
        Math.abs(lastTimestamp - currentTimestamp) < 5000; // Within 5 seconds

      if (!isDuplicate) {
        deduplicated.push(currentMessage);
        lastBotMessage = currentMessage;
      }
    }
  }

  return deduplicated;
}

