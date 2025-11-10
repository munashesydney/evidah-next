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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', aiSuggestionsOn } = body;

    // Validation
    if (!uid || aiSuggestionsOn === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, aiSuggestionsOn' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Update aiSuggestionsOn in knowledge base doc
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    await kbRef.update({ aiSuggestionsOn: aiSuggestionsOn });

    return NextResponse.json({
      success: true,
      message: `Auto Suggest ${aiSuggestionsOn ? 'enabled' : 'disabled'}`,
      data: { aiSuggestionsOn },
    });
  } catch (error: any) {
    console.error('Error updating AI suggestions setting:', error);
    return NextResponse.json(
      { error: 'Failed to update AI suggestions setting', details: error.message },
      { status: 500 }
    );
  }
}



