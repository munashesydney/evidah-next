import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { status: 0, message: 'Email and password are required', customToken: null },
        { status: 400 }
      );
    }

    // Search the 'AdditionalUsers' collection across all user documents using collectionGroup
    const additionalUsersSnapshot = await db
      .collectionGroup('AdditionalUsers')
      .where('userEmail', '==', email)
      .get();

    if (additionalUsersSnapshot.empty) {
      return NextResponse.json(
        { status: 0, message: 'Invalid email or password.', customToken: null },
        { status: 401 }
      );
    }

    // Retrieve the additional user document
    const additionalUserDoc = additionalUsersSnapshot.docs[0];
    const additionalUserData = additionalUserDoc.data();

    // Get the parent document reference (the primary user/company UID)
    // Get the user UID - need to go up 3 levels from AdditionalUsers/{agentId}
    // Structure: Users/{uid}/knowledgebases/{selectedCompany}/AdditionalUsers/{agentId}
    // ref.parent.parent = knowledgebases/{selectedCompany}
    // ref.parent.parent.parent.parent = Users/{uid}
    const knowledgebaseDocRef = additionalUserDoc.ref.parent.parent; // knowledgebases/{selectedCompany}
    const userDocRef = knowledgebaseDocRef?.parent?.parent; // Users/{uid}
    
    if (!userDocRef) {
      return NextResponse.json(
        { status: 0, message: 'User not found.', customToken: null },
        { status: 404 }
      );
    }
    
    const foundUser = await userDocRef.get();

    if (!foundUser || !foundUser.exists) {
      return NextResponse.json(
        { status: 0, message: 'User not found.', customToken: null },
        { status: 404 }
      );
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, additionalUserData.hashedPassword);
    if (!isPasswordValid) {
      return NextResponse.json(
        { status: 0, message: 'Invalid email or password.', customToken: null },
        { status: 401 }
      );
    }

    // If we get here, the login was successful
    const uid = foundUser.id;
    const role = additionalUserData.role;
    const displayName = additionalUserData.displayName;
    const userEmail = additionalUserData.userEmail;

    // Create a Firebase custom token for the company UID
    const customClaims = {
      role: role,
      displayName: displayName,
      userEmail: userEmail,
    };

    const customToken = await auth.createCustomToken(uid, customClaims);

    return NextResponse.json({
      status: 1,
      message: 'Login success',
      customToken: customToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        status: 0,
        message: 'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        customToken: null,
      },
      { status: 500 }
    );
  }
}
