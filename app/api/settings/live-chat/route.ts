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

// GET - Fetch all live chat configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Fetch live chat config document
    const configRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default');
    
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      // Return default configuration
      return NextResponse.json({
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
        showOnlineStatus: true,
        offlineMessage: 'We\'re currently offline. Leave us a message and we\'ll get back to you soon!',
        customCSS: ''
      });
    }

    const configData = configDoc.data();

    // Return all configuration
    return NextResponse.json({
      ...configData
    });
  } catch (error: any) {
    console.error('Error fetching live chat config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live chat configuration', details: error.message },
      { status: 500 }
    );
  }
}

