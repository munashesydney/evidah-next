import { NextRequest, NextResponse } from 'next/server';
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

/**
 * GET /api/actions/events
 * Get all events for a specific action
 */
export async function GET(request: NextRequest) {
  try {
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

    console.log(`[ACTION EVENTS] Fetching events for action ${actionId}`);

    const eventsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc(actionId)
      .collection('events')
      .orderBy('createdAt', 'desc')
      .limit(50);

    const snapshot = await eventsRef.get();
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[ACTION EVENTS] Found ${events.length} events`);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    console.error('[ACTION EVENTS] Error fetching events:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch events',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/actions/events
 * Create a new event for an action
 */
export async function POST(request: NextRequest) {
  try {
    const {
      uid,
      selectedCompany = 'default',
      actionId,
      triggerData,
      status = 'pending',
    } = await request.json();

    if (!uid || !actionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and actionId' },
        { status: 400 }
      );
    }

    console.log(`[ACTION EVENTS] Creating event for action ${actionId}`);

    const eventData = {
      actionId,
      triggerData: triggerData || {},
      status, // pending, processing, completed, failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    const eventRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc(actionId)
      .collection('events')
      .doc();

    await eventRef.set(eventData);

    const event = {
      id: eventRef.id,
      ...eventData,
    };

    console.log(`[ACTION EVENTS] Event created: ${event.id}`);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error('[ACTION EVENTS] Error creating event:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create event',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
