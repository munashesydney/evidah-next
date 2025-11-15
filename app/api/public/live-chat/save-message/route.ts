import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

// Enable CORS for public access
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany, chatId, userInfo, message } = body;

    if (!uid || !selectedCompany || !chatId || !userInfo || !message) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: uid, selectedCompany, chatId, userInfo, message',
          success: false
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('Saving chat message:', { uid, selectedCompany, chatId, userInfo, message });

    // Save message to the chat document
    const chatRef = db.doc(`Users/${uid}/knowledgebases/${selectedCompany}/livechat/default/sessions/${chatId}`);

    // Get existing chat or create new one
    const chatDoc = await chatRef.get();
    const chatData = chatDoc.exists ? chatDoc.data() : {};

    // Initialize or get existing messages array
    const messages = chatData?.messages || [];

    // Add new message with regular timestamp (FieldValue.serverTimestamp() can't be used in arrays)
    const now = Date.now();
    const messageWithId = {
      ...message,
      id: `msg_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now
    };

    messages.push(messageWithId);

    // Update chat document
    await chatRef.set({
      ...chatData,
      userInfo: userInfo,
      messages: messages,
      lastMessage: messageWithId,
      status: chatData?.status || 'New',
      lastActivity: FieldValue.serverTimestamp(),
      createdAt: chatData?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      messageId: messageWithId.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Error saving chat message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
