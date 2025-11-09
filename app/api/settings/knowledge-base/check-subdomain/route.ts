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
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const subdomain = searchParams.get('subdomain');

    // Validation
    if (!uid || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required parameters: uid, subdomain' },
        { status: 400 }
      );
    }

    // Check SubdomainIndex for fast lookup
    const subdomainIndexRef = db.collection('SubdomainIndex').doc(subdomain.toLowerCase());
    const subdomainDoc = await subdomainIndexRef.get();

    if (!subdomainDoc.exists) {
      return NextResponse.json({
        success: true,
        exists: false,
        isOwnSubdomain: false,
      });
    }

    const subdomainData = subdomainDoc.data();
    const isOwnSubdomain =
      subdomainData?.userId === uid && subdomainData?.kbId === selectedCompany;

    return NextResponse.json({
      success: true,
      exists: true,
      isOwnSubdomain,
    });
  } catch (error: any) {
    console.error('Error checking subdomain:', error);
    return NextResponse.json(
      { error: 'Failed to check subdomain', details: error.message },
      { status: 500 }
    );
  }
}

