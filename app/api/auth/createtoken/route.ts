import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export async function POST(request: NextRequest) {
  try {
    const { email, uid } = await request.json();

    if (!email || !uid) {
      return NextResponse.json(
        { status: 0, message: 'Email and UID are required', customToken: null },
        { status: 400 }
      );
    }

    const userDoc = await db.collection('Users').doc(uid).get();

    if (!userDoc.exists) {
      console.error('User document not found in Firestore');
      return NextResponse.json(
        { status: 0, message: 'User was not found in firestore but is in auth', customToken: null },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const name = userData?.name || '';
    const surname = userData?.surname || '';
    const role = 'Owner';
    const displayName = `${name} ${surname}`.trim();
    const userEmail = email;

    // Create custom claims for the primary user
    const customClaims = {
      role: role,
      displayName: displayName,
      userEmail: userEmail,
    };

    // Generate custom token with custom claims
    const customToken = await auth.createCustomToken(uid, customClaims);

    return NextResponse.json({
      status: 1,
      message: 'Token Created',
      customToken: customToken,
    });
  } catch (error) {
    console.error('Token creation error:', error);
    return NextResponse.json(
      {
        status: 0,
        message: 'Error creating token: ' + (error instanceof Error ? error.message : 'Unknown error'),
        customToken: null,
      },
      { status: 500 }
    );
  }
}
