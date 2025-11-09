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

// GET - Fetch content settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    const configRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default');
    
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json({
        welcomeMessage: 'Hi! How can I help you today?',
        placeholderText: 'Type your message...',
        companyName: 'Support',
        offlineMessage: 'We\'re currently offline. Leave us a message and we\'ll get back to you soon!'
      });
    }

    const configData = configDoc.data();

    return NextResponse.json({
      welcomeMessage: configData.welcomeMessage ?? 'Hi! How can I help you today?',
      placeholderText: configData.placeholderText ?? 'Type your message...',
      companyName: configData.companyName ?? 'Support',
      offlineMessage: configData.offlineMessage ?? 'We\'re currently offline. Leave us a message and we\'ll get back to you soon!'
    });
  } catch (error: any) {
    console.error('Error fetching content live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content settings', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update content settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', welcomeMessage, placeholderText, companyName, offlineMessage } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    const configRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default');

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: uid
    };

    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (placeholderText !== undefined) updateData.placeholderText = placeholderText;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (offlineMessage !== undefined) updateData.offlineMessage = offlineMessage;

    await configRef.set(updateData, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Content settings updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating content live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to update content settings', details: error.message },
      { status: 500 }
    );
  }
}

