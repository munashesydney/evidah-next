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
    const { uid, selectedCompany } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required field: uid' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Reset custom domain
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    await kbRef.update({
      customDomain: '',
      customDomainVerified: false,
      customDomainStep: 1,
    });

    return NextResponse.json({
      success: true,
      message: 'Custom domain reset successfully',
      data: {
        customDomain: '',
        customDomainVerified: false,
        customDomainStep: 1,
      },
    });
  } catch (error: any) {
    console.error('Error resetting custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to reset custom domain', details: error.message },
      { status: 500 }
    );
  }
}

