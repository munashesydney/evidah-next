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

    // Fetch knowledge base document
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);
    
    const kbDoc = await kbRef.get();

    if (!kbDoc.exists) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    const kbData = kbDoc.data();

    // Return helpdesk settings
    return NextResponse.json({
      success: true,
      data: {
        subdomain: kbData?.subdomain || '',
        defaultForward: kbData?.defaultForward || '',
        aiMessagesOn: kbData?.aiMessagesOn || false,
        aiSuggestionsOn: kbData?.aiSuggestionsOn || false,
      },
    });
  } catch (error: any) {
    console.error('Error fetching helpdesk settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch helpdesk settings', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', defaultForward } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required field: uid' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Update defaultForward in knowledge base doc
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    await kbRef.update({ defaultForward: defaultForward || '' });

    return NextResponse.json({
      success: true,
      message: 'Email forwarding updated successfully',
      data: { defaultForward },
    });
  } catch (error: any) {
    console.error('Error updating email forwarding:', error);
    return NextResponse.json(
      { error: 'Failed to update email forwarding', details: error.message },
      { status: 500 }
    );
  }
}



