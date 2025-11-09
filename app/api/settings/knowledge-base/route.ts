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

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Fetch knowledge base document
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);
    
    const kbDoc = await kbRef.get();

    if (!kbDoc.exists) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    const kbData = kbDoc.data();

    // Return knowledge base data
    return NextResponse.json({
      success: true,
      data: {
        name: kbData?.name || '',
        subdomain: kbData?.subdomain || '',
        heading: kbData?.heading || '',
        subheading: kbData?.subheading || '',
        seoTitle: kbData?.seotitle || '',
        seoDescription: kbData?.seodescription || '',
        logo: kbData?.logo || '',
        primaryColor: kbData?.primaryColor || '#1d4ed8',
        published: kbData?.published || false,
        seoOn: kbData?.seoOn || false,
        showCompanyName: kbData?.showCompanyName || false,
        showLogo: kbData?.showLogo || false,
        customDomain: kbData?.customDomain || '',
        customDomainVerified: kbData?.customDomainVerified || false,
        customDomainStep: kbData?.customDomainStep || 1,
        chosenPicType: kbData?.chosenPicType || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base', details: error.message },
      { status: 500 }
    );
  }
}

