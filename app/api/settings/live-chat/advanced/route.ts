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

// GET - Fetch advanced settings
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
        customCSS: ''
      });
    }

    const configData = configDoc.data();

    return NextResponse.json({
      customCSS: configData.customCSS ?? ''
    });
  } catch (error: any) {
    console.error('Error fetching advanced live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advanced settings', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update advanced settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', customCSS } = body;

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

    if (customCSS !== undefined) updateData.customCSS = customCSS;

    await configRef.set(updateData, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Advanced settings updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating advanced live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to update advanced settings', details: error.message },
      { status: 500 }
    );
  }
}

