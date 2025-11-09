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
 * PUT /api/inbox/ticket/ai/disable
 * Disables AI for a ticket (sets aiOn to false)
 * 
 * Body parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - ticketId: Ticket ID (required)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', ticketId } = body;

    // Validate required parameters
    if (!uid || !ticketId) {
      return NextResponse.json(
        {
          status: 0,
          message: 'Missing required parameters: uid, ticketId',
        },
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

    // Check if ticket exists
    const ticketDoc = await ticketDocRef.get();
    if (!ticketDoc.exists) {
      return NextResponse.json(
        {
          status: 0,
          message: 'Ticket not found',
        },
        { status: 404 }
      );
    }

    // Update ticket to disable AI
    await ticketDocRef.update({
      aiOn: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      status: 1,
      message: 'AI disabled successfully',
      ticketId,
      aiOn: false,
    });
  } catch (error: any) {
    console.error('Error disabling AI:', error);
    return NextResponse.json(
      {
        status: 0,
        message: 'Error disabling AI',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

