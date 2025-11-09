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

export async function POST(request: NextRequest) {
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

    // Call the verifyDomain endpoint from node scripts
    // This should match the endpoint from your node scripts
    const verifyDomainUrl = process.env.VERIFY_DOMAIN_ENDPOINT || 
      'https://verifydomain-h7unmn6umq-uc.a.run.app';

    let verifyResult;
    try {
      const verifyResponse = await fetch(verifyDomainUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customDomain: customDomain,
          selectedCompany: companyId,
        }),
      });

      verifyResult = await verifyResponse.json();
    } catch (error: any) {
      console.error('Error calling verifyDomain endpoint:', error);
      return NextResponse.json(
        { error: 'This error is on us. Please send us a message and we will investigate. Sorry about that. Error 123' },
        { status: 500 }
      );
    }

    // Check verification result
    if (verifyResult.status === 1 && verifyResult.result) {
      // Domain verified successfully
      const kbRef = db
        .collection('Users')
        .doc(uid)
        .collection('knowledgebases')
        .doc(companyId);

      await kbRef.update({
        customDomainVerified: true,
        customDomainStep: 3,
        custom: customDomain,
      });

      return NextResponse.json({
        success: true,
        message: 'Domain verified successfully',
        data: {
          customDomain,
          customDomainVerified: true,
          customDomainStep: 3,
        },
      });
    } else {
      // Domain not verified yet
      return NextResponse.json({
        success: false,
        message: 'Servers are not pointed yet. It can take up to 24 hours to verify DNS. Please check back later.',
        data: {
          customDomain,
          customDomainVerified: false,
        },
      });
    }
  } catch (error: any) {
    console.error('Error verifying custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to verify custom domain', details: error.message },
      { status: 500 }
    );
  }
}

