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
 * GET /api/inbox/messages
 * Retrieves messages for a specific ticket
 * 
 * Query parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - ticketId: Ticket ID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const ticketId = searchParams.get('ticketId');

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!ticketId) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: ticketId' },
        { status: 400 }
      );
    }

    // Reference to ticket document
    const ticketDocRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('tickets')
      .doc(ticketId);

    // Get ticket data
    const ticketDoc = await ticketDocRef.get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json(
        { status: 0, message: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = {
      id: ticketDoc.id,
      ...ticketDoc.data(),
    };

    // Mark ticket as read
    await ticketDocRef.update({
      read: true,
    });

    // Reference to messages collection
    const messagesRef = ticketDocRef.collection('messages');

    // Query messages ordered by date descending
    const messagesSnapshot = await messagesRef.orderBy('date', 'desc').get();

    // Map documents to message objects
    const messages = messagesSnapshot.docs.map((doc, index) => ({
      id: doc.id,
      open: index === 0, // First message is open by default
      ...doc.data(),
    }));

    // Get subdomain from knowledge base
    const knowledgeBaseRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);
    
    const knowledgeBaseDoc = await knowledgeBaseRef.get();
    const subdomain = knowledgeBaseDoc.exists ? knowledgeBaseDoc.data()?.subdomain : null;

    return NextResponse.json({
      status: 1,
      message: 'Messages retrieved successfully',
      messages,
      ticketData,
      subdomain,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching messages', error: error.message },
      { status: 500 }
    );
  }
}

