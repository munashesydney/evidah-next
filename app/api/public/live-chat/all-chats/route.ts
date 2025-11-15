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
    const userEmail = searchParams.get('userEmail');

    if (!uid || !selectedCompany || !userEmail) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters: uid, selectedCompany, userEmail',
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

    console.log('Getting all chats for user:', { uid, selectedCompany, userEmail });

    // Get all chat documents for this user/company
    const chatsRef = db.collection(`Users/${uid}/knowledgebases/${selectedCompany}/livechat/default/sessions`);
    const chatsSnapshot = await chatsRef.get();

    const chats: any[] = [];

    chatsSnapshot.forEach(doc => {
      const chatData = doc.data();

      // Only include chats that belong to this user (by email)
      if (chatData.userInfo && chatData.userInfo.email === userEmail) {
        chats.push({
          chatId: doc.id,
          userInfo: chatData.userInfo,
          lastMessage: chatData.lastMessage,
          lastActivity: chatData.lastActivity,
          messageCount: chatData.messages ? chatData.messages.length : 0,
          createdAt: chatData.createdAt
        });
      }
    });

    // Sort by last activity (newest first)
    chats.sort((a, b) => {
      const dateA = a.lastActivity ? new Date(a.lastActivity.toDate ? a.lastActivity.toDate() : a.lastActivity) : new Date(0);
      const dateB = b.lastActivity ? new Date(b.lastActivity.toDate ? b.lastActivity.toDate() : b.lastActivity) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      success: true,
      chats: chats
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Error getting all chats:', error);
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
