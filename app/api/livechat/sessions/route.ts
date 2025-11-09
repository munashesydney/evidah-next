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
 * GET /api/livechat/sessions
 * Retrieves paginated list of live chat sessions
 * 
 * Query parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - limit: Number of sessions per page (optional, defaults to 10)
 * - startAfter: Last document ID for pagination (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const startAfter = searchParams.get('startAfter');

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Reference to sessions collection
    const sessionsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default')
      .collection('sessions');

    // Build query
    let query = sessionsRef.orderBy('lastActivity', 'desc').limit(limit);

    // Add pagination if startAfter is provided
    if (startAfter) {
      const startAfterDoc = await sessionsRef.doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Execute query
    const snapshot = await query.get();

    // Process sessions - filter those with userInfo and messages
    const sessions: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userInfo && data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        sessions.push({
          id: doc.id,
          uid: uid,
          selectedCompany: selectedCompany,
          ...data,
          lastMessage: data.messages[data.messages.length - 1],
          messageCount: data.messages.length,
        });
      }
    });

    // Get last document ID for pagination
    const lastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;
    const hasMore = snapshot.docs.length === limit;

    return NextResponse.json({
      status: 1,
      message: 'Sessions retrieved successfully',
      sessions,
      hasMore,
      lastDocId,
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching sessions', error: error.message },
      { status: 500 }
    );
  }
}

