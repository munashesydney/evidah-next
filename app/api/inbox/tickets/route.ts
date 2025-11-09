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
 * GET /api/inbox/tickets
 * Retrieves tickets for help desk inbox
 * 
 * Query parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - limit: Number of tickets to fetch (optional, defaults to 10)
 * - startAfter: Timestamp to start after for pagination (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const limitParam = searchParams.get('limit');
    const startAfterParam = searchParams.get('startAfter');

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Reference to tickets collection
    const ticketsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('tickets');

    // Build query with ordering
    let query = ticketsRef.orderBy('lastMessageDate', 'desc').limit(limit);

    // Apply pagination if startAfter is provided
    if (startAfterParam) {
      // Parse the timestamp from string
      const startAfterTimestamp = admin.firestore.Timestamp.fromMillis(
        parseInt(startAfterParam, 10)
      );
      query = query.startAfter(startAfterTimestamp);
    }

    // Execute query
    const snapshot = await query.get();

    // Map documents to ticket objects
    const tickets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Determine if there are more tickets
    const hasMore = snapshot.docs.length === limit;

    // Get the last document's timestamp for pagination
    const lastTimestamp =
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1].data().lastMessageDate?.toMillis()
        : null;

    return NextResponse.json({
      status: 1,
      message: 'Tickets retrieved successfully',
      tickets,
      hasMore,
      lastTimestamp,
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching tickets', error: error.message },
      { status: 500 }
    );
  }
}

