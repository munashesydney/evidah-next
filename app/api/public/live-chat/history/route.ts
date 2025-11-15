import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany');
    const chatId = searchParams.get('chatId');

    if (!uid || !selectedCompany || !chatId) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters: uid, selectedCompany, chatId',
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

    console.log('Getting chat history:', { uid, selectedCompany, chatId });

    // Get chat document
    const chatRef = db.doc(`Users/${uid}/knowledgebases/${selectedCompany}/livechat/default/sessions/${chatId}`);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return NextResponse.json({
        success: true,
        messages: [],
        userInfo: null
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const chatData = chatDoc.data();
    const messages = (chatData?.messages || []).map((msg: any) => ({
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    return NextResponse.json({
      success: true,
      messages: messages,
      userInfo: chatData?.userInfo || null
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Error getting chat history:', error);
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
