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
    const { uid, selectedCompany, seoOn } = body;

    // Validation
    if (!uid || seoOn === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, seoOn' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Update SEO status
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    await kbRef.update({ seoOn: seoOn });

    return NextResponse.json({
      success: true,
      message: `SEO ${seoOn ? 'enabled' : 'disabled'}`,
      data: { seoOn },
    });
  } catch (error: any) {
    console.error('Error updating SEO status:', error);
    return NextResponse.json(
      { error: 'Failed to update SEO status', details: error.message },
      { status: 500 }
    );
  }
}

