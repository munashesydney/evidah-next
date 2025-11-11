import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    // Get knowledgebase data
    const knowledgebaseRef = db.collection('Users').doc(uid).collection('knowledgebases').doc(selectedCompany);
    const knowledgebaseDoc = await knowledgebaseRef.get();

    if (!knowledgebaseDoc.exists) {
      return NextResponse.json({ error: 'Knowledgebase not found' }, { status: 404 });
    }

    const data = knowledgebaseDoc.data();
    const subscriptionData = data?.subscriptionData || null;

    // Get active employees
    const activeEmployees = {
      charlie: data?.charlie || false,
      marquavious: data?.marquavious || false,
      emma: data?.emma || false,
      sungWen: data?.sungWen || false,
      evidahQ: data?.evidahQ || false,
    };

    return NextResponse.json({
      subscription: subscriptionData,
      activeEmployees,
      knowledgebase: {
        name: data?.name,
        website: data?.website,
      }
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
