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
 * DELETE /api/chat/[chatId]/delete
 * Delete a chat and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const companyId = searchParams.get('companyId');
    const employeeId = searchParams.get('employeeId');

    if (!uid || !companyId || !employeeId || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: uid, companyId, employeeId, chatId',
        },
        { status: 400 }
      );
    }

    console.log(`[DELETE CHAT] Deleting chat ${chatId} for ${uid}/${companyId}`);

    // Reference to the chat document
    const chatRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('aiChats')
      .doc(chatId);

    // Check if chat exists
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Delete all messages in the chat
    const messagesRef = chatRef.collection('messages');
    const messagesSnapshot = await messagesRef.get();

    if (!messagesSnapshot.empty) {
      const batch = db.batch();
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`[DELETE CHAT] Deleted ${messagesSnapshot.size} message(s) from chat ${chatId}`);
    }

    // Delete the chat document itself
    await chatRef.delete();
    console.log(`[DELETE CHAT] Successfully deleted chat ${chatId}`);

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE CHAT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete chat',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
