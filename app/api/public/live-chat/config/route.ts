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

// GET - Fetch live chat configuration (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const liveChatId = searchParams.get('liveChatId') || 'default';

    // Validation
    if (!uid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: uid' 
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Fetch live chat config document
    const configRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc(liveChatId);
    
    const configDoc = await configRef.get();

    const defaultConfig = {
      enabled: true,
      position: 'bottom-right',
      theme: 'default',
      primaryColor: '#6366f1',
      borderRadius: '12',
      size: 'medium',
      bubbleShape: 'rectangle',
      bubbleIcon: 'chat',
      customIconUrl: '',
      welcomeMessage: 'Hi! How can I help you today?',
      placeholderText: 'Type your message...',
      showAvatar: true,
      companyName: 'Support',
      showTypingIndicator: true,
      showOnlineStatus: false,
      offlineMessage: 'We\'re currently offline. Leave us a message and we\'ll get back to you soon!',
      customCSS: ''
    };

    const configData = configDoc.exists ? configDoc.data() : {};

    // Return configuration
    return NextResponse.json({
      success: true,
      config: {
        ...defaultConfig,
        ...configData
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('Error fetching live chat config:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch live chat configuration', 
        details: error.message 
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
