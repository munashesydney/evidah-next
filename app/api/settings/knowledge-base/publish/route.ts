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
    const { uid, selectedCompany, published } = body;

    // Validation
    if (!uid || published === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, published' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Update publish status
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    await kbRef.update({ published: published });

    return NextResponse.json({
      success: true,
      message: `Knowledge base ${published ? 'published' : 'unpublished'} successfully`,
      data: { published },
    });
  } catch (error: any) {
    console.error('Error updating publish status:', error);
    return NextResponse.json(
      { error: 'Failed to update publish status', details: error.message },
      { status: 500 }
    );
  }
}

