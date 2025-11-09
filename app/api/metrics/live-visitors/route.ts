import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Get visitors active in the last 15 seconds
    const now = Date.now();
    const onlineThreshold = new Date(now - 15000); // 15 seconds ago

    const liveVisitorsRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/liveVisitors`
    );
    
    const liveVisitorsSnapshot = await liveVisitorsRef
      .where('timestamp', '>=', onlineThreshold)
      .get();

    const visitors = liveVisitorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        sessionId: doc.id,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        page: data.page || data.currentPage || '/',
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          count: visitors.length,
          visitors,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching live visitors:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

