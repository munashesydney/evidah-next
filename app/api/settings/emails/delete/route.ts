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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const emailId = searchParams.get('emailId');

    // Validation
    if (!uid || !emailId) {
      return NextResponse.json(
        { error: 'Missing required parameters: uid, emailId' },
        { status: 400 }
      );
    }

    // Get email document reference
    const emailDocRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('emails')
      .doc(emailId);

    // Check if email exists
    const emailDoc = await emailDocRef.get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Delete the email document
    await emailDocRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Email deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting email:', error);
    return NextResponse.json(
      { error: 'Failed to delete email', details: error.message },
      { status: 500 }
    );
  }
}

