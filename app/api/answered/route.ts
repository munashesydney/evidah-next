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
 * Add a document to the answered collection in the user's knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uid,
      selectedCompany = 'default',
      question,
      answer,
      ticket_id,
      session_id,
      more_info,
      chat_id,
    } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: question and answer are required' },
        { status: 400 }
      );
    }

    console.log(`[ANSWERED] Creating new answered document for ${uid}/${selectedCompany}`);

    const answeredData: any = {
      question: question.trim(),
      answer: answer.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (ticket_id !== undefined && ticket_id !== null) {
      answeredData.ticket_id = ticket_id;
    }

    if (session_id !== undefined && session_id !== null) {
      answeredData.session_id = session_id;
    }

    if (more_info !== undefined && more_info !== null) {
      answeredData.more_info = more_info;
    }

    const answeredRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('answered')
      .doc();

    await answeredRef.set(answeredData);

    const answered = {
      id: answeredRef.id,
      ...answeredData,
    };

    console.log(`[ANSWERED] Answered document created: ${answered.id}`);
    console.log(`[ANSWERED] Chat ID: ${chat_id}, Company: ${selectedCompany}, User: ${uid}`);

    let chatUpdated = false;
    if (chat_id) {
      try {
        const chatRef = db
          .collection('Users')
          .doc(uid)
          .collection('knowledgebases')
          .doc(selectedCompany)
          .collection('aiChats')
          .doc(chat_id);

        await chatRef.update({
          'metadata.escalation': false,
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[ANSWERED] Escalation cleared for chat ${chat_id}`);
        chatUpdated = true;
      } catch (chatError) {
        console.error(
          `[ANSWERED] Failed to clear escalation for chat ${chat_id}:`,
          chatError
        );
      }
    }

    return NextResponse.json({
      success: true,
      answered,
      chatUpdated,
    });
  } catch (error: any) {
    console.error('[ANSWERED] Error creating answered document:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create answered document',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

