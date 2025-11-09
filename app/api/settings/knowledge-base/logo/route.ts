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
    const { uid, selectedCompany, logo, chosenPicType } = body;

    // Validation
    if (!uid || !logo) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, logo' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Update logo
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);

    const updateData: any = { logo };
    if (chosenPicType !== undefined) {
      updateData.chosenPicType = chosenPicType;
    }

    await kbRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Logo updated successfully',
      data: { logo, chosenPicType: chosenPicType || 1 },
    });
  } catch (error: any) {
    console.error('Error updating logo:', error);
    return NextResponse.json(
      { error: 'Failed to update logo', details: error.message },
      { status: 500 }
    );
  }
}

