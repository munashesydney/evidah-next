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

    // Fetch all agents from AdditionalUsers sub-collection
    const agentsRef = db.collection('Users').doc(uid).collection('AdditionalUsers');
    const agentsSnapshot = await agentsRef.get();

    if (agentsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Map agents data (exclude hashedPassword for security)
    const agents = agentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userEmail: data.userEmail || '',
        role: data.role || '',
        displayName: data.displayName || '',
        phoneNumber: data.phoneNumber || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error.message },
      { status: 500 }
    );
  }
}

