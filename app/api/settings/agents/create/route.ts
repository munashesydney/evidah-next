import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, additionalEmail, additionalPassword, role, additionalUserData, selectedCompany = 'default' } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!additionalEmail || !additionalPassword || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: additionalEmail, additionalPassword, role' },
        { status: 400 }
      );
    }

    // Check if user document exists
    const userDocRef = db.collection('Users').doc(uid);
    const userDocSnapshot = await userDocRef.get();
    
    if (!userDocSnapshot.exists) {
      return NextResponse.json(
        { status: 0, message: 'No such User' },
        { status: 404 }
      );
    }

    // Check if knowledgebase exists
    const knowledgebaseRef = userDocRef.collection('knowledgebases').doc(selectedCompany);
    const knowledgebaseDoc = await knowledgebaseRef.get();
    
    if (!knowledgebaseDoc.exists) {
      return NextResponse.json(
        { status: 0, message: 'Knowledgebase not found' },
        { status: 404 }
      );
    }

    // Check if agent with this email already exists in this workspace
    const agentsRef = knowledgebaseRef.collection('AdditionalUsers');
    const existingAgentsSnapshot = await agentsRef
      .where('userEmail', '==', additionalEmail)
      .get();

    if (!existingAgentsSnapshot.empty) {
      return NextResponse.json(
        { status: 0, message: 'Agent with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(additionalPassword, 10);

    // Create a document reference for the additional user in the AdditionalUsers sub-collection
    const additionalUserRef = agentsRef.doc(); // Auto-generate ID

    // Set the additional user's data in the sub-collection
    await additionalUserRef.set({
      userEmail: additionalEmail,
      hashedPassword: hashedPassword,
      role: role,
      displayName: additionalUserData?.displayName || null,
      phoneNumber: additionalUserData?.phoneNumber || null,
      createdAt: FieldValue.serverTimestamp(),
      ...(additionalUserData || {}), // Spread operator to include any other additional data
    });

    console.log(`Additional user ${additionalEmail} successfully added to workspace ${selectedCompany} for user UID ${uid}.`);

    // Return the created agent data (without password)
    const createdAgent = {
      id: additionalUserRef.id,
      userEmail: additionalEmail,
      role: role,
      displayName: additionalUserData?.displayName || '',
      phoneNumber: additionalUserData?.phoneNumber || '',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      status: 1,
      message: 'All good',
      data: createdAgent,
    });
  } catch (error: any) {
    console.error('Error adding additional user:', error);
    return NextResponse.json(
      { status: 0, message: 'Error adding additional user: ' + error.message },
      { status: 500 }
    );
  }
}

