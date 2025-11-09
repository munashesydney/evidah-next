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
    const limitStr = searchParams.get('limit') || '5';
    const limit = parseInt(limitStr, 10);

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Fetch all countries
    const countriesRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/metrics/otherStats/countries`
    );
    const countriesSnapshot = await countriesRef.orderBy('count', 'desc').limit(limit).get();

    // Calculate total count for percentage
    const allCountriesSnapshot = await countriesRef.get();
    const totalCount = allCountriesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().count || 0);
    }, 0);

    // Format data with percentages
    const countriesData = countriesSnapshot.docs.map(doc => {
      const data = doc.data();
      const count = data.count || 0;
      const country = data.country || doc.id; // Use country field from document data, fallback to doc.id
      return {
        id: doc.id,
        country: country,
        count,
        percentage: totalCount > 0 
          ? `${((count / totalCount) * 100).toFixed(2)}%` 
          : '0%',
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: countriesData,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching top countries:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

