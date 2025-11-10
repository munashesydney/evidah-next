import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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
const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', formData } = body;

    if (!uid || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, formData' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!formData.name || !formData.subdomain || !formData.heading) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subdomain, heading' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists globally
    const subdomainIndexRef = db.collection('SubdomainIndex').doc(formData.subdomain.toLowerCase());
    const subdomainDoc = await subdomainIndexRef.get();

    if (subdomainDoc.exists) {
      const subdomainData = subdomainDoc.data();
      // Only allow if it's the same KB being updated
      if (!(subdomainData?.userId === uid && subdomainData?.kbId === selectedCompany)) {
        return NextResponse.json(
          { error: 'This subdomain is already taken. Please choose another one.' },
          { status: 400 }
        );
      }
    }

    // Update knowledgebase document
    const knowledgebaseRef = db.collection('Users').doc(uid).collection('knowledgebases').doc(selectedCompany);
    
    const updateData = {
      ...formData,
      onboardingDone: true,
      updatedAt: Timestamp.now(),
    };

    await knowledgebaseRef.update(updateData);

    // Add/update subdomain in SubdomainIndex for fast lookups
    if (formData.subdomain) {
      await subdomainIndexRef.set({
        userId: uid,
        kbId: selectedCompany,
        subdomain: formData.subdomain.toLowerCase(),
        timestamp: Timestamp.now(),
        onboarding: true,
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

