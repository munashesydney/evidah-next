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
    const { uid, selectedCompany, customDomain } = body;

    // Validation
    if (!uid || !customDomain) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, customDomain' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Update custom domain
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    await kbRef.update({
      customDomain: customDomain,
      customDomainVerified: false,
      customDomainStep: 2,
    });

    // Clear the custom field
    await kbRef.update({ custom: '' });

    return NextResponse.json({
      success: true,
      message: 'Custom domain submitted successfully',
      data: {
        customDomain,
        customDomainVerified: false,
        customDomainStep: 2,
      },
    });
  } catch (error: any) {
    console.error('Error submitting custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to submit custom domain', details: error.message },
      { status: 500 }
    );
  }
}

