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

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Fetch user account data from Firestore
    const userDocRef = db.collection('Users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Return user account data
    return NextResponse.json({
      success: true,
      data: {
        email: userData?.email || '',
        name: userData?.name || '',
        surname: userData?.surname || '',
        companyname: userData?.companyname || '',
        website: userData?.website || '',
        profilePicture: userData?.profilePicture || '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching user account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user account', details: error.message },
      { status: 500 }
    );
  }
}

