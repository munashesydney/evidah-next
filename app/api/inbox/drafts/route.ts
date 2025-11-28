import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
 * Get all drafts for a user/company with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const limit = parseInt(searchParams.get('limit') || '20');
    const lastDocId = searchParams.get('lastDocId');

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    console.log(`[DRAFTS] Fetching drafts for ${uid}/${selectedCompany}`);

    let draftsQuery = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('drafts')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    // If lastDocId is provided, start after that document
    if (lastDocId) {
      const lastDoc = await db
        .collection('Users')
        .doc(uid)
        .collection('knowledgebases')
        .doc(selectedCompany)
        .collection('Helpdesk')
        .doc('default')
        .collection('drafts')
        .doc(lastDocId)
        .get();

      if (lastDoc.exists) {
        draftsQuery = draftsQuery.startAfter(lastDoc);
      }
    }

    const snapshot = await draftsQuery.get();
    const drafts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[DRAFTS] Found ${drafts.length} drafts`);

    return NextResponse.json({
      success: true,
      drafts,
      hasMore: drafts.length === limit,
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error fetching drafts:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch drafts',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new draft
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', ticketId, aiResponse } = await request.json();

    if (!uid || !ticketId || !aiResponse) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid, ticketId, and aiResponse' },
        { status: 400 }
      );
    }

    console.log(`[DRAFTS] Creating draft for ticket ${ticketId}`);

    const draftsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('drafts');

    const draftData = {
      ticketId,
      aiResponse,
      createdAt: FieldValue.serverTimestamp(),
    };

    const draftRef = await draftsRef.add(draftData);

    // Update the ticket with lastAISuggestion
    const ticketRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('tickets')
      .doc(ticketId);

    await ticketRef.update({
      lastAISuggestion: aiResponse,
      lastAISuggestionTimestamp: FieldValue.serverTimestamp(),
    });

    console.log(`[DRAFTS] Draft created: ${draftRef.id}`);

    // Create in-app notification
    try {
      const { NotificationService } = await import('@/lib/services/notification-service');
      
      // Check if notification already exists for this draft
      const exists = await NotificationService.existsForReference(uid, selectedCompany, draftRef.id);
      
      if (!exists) {
        await NotificationService.create({
          uid,
          companyId: selectedCompany,
          type: 'ai_draft',
          referenceId: draftRef.id,
          title: 'New AI Draft Available',
          message: `AI has created a draft response for ticket #${ticketId}`,
        });
        console.log(`[DRAFTS] ✅ In-app notification created for draft ${draftRef.id}`);
      }
    } catch (notifError) {
      console.error('[DRAFTS] Failed to create in-app notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draftRef.id,
        ...draftData,
      },
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error creating draft:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create draft',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a draft
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', draftId } = await request.json();

    if (!uid || !draftId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and draftId' },
        { status: 400 }
      );
    }

    console.log(`[DRAFTS] Deleting draft ${draftId}`);

    const draftRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('Helpdesk')
      .doc('default')
      .collection('drafts')
      .doc(draftId);

    const draftSnapshot = await draftRef.get();
    if (!draftSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    }

    await draftRef.delete();

    console.log(`[DRAFTS] Draft deleted: ${draftId}`);

    // Delete associated notifications
    try {
      const { NotificationService } = await import('@/lib/services/notification-service');
      await NotificationService.deleteByReference(uid, selectedCompany, draftId);
      console.log(`[DRAFTS] ✅ Notifications deleted for draft ${draftId}`);
    } catch (notifError) {
      console.error('[DRAFTS] Failed to delete notifications:', notifError);
      // Don't fail the request if notification deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error deleting draft:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete draft',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
