import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
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

/**
 * GET /api/category
 * Retrieve categories for a user's knowledge base
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const limit = parseInt(searchParams.get('limit') || '12');
    const lastDocId = searchParams.get('lastDocId');

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid', code: 'MISSING_UID' },
        { status: 400 }
      );
    }

    // Get Firestore instance
    const db = getFirestore();

    // Verify user exists
    try {
      await getAuth().getUser(uid);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create categories collection reference
    const categoriesCollectionRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories`
    );

    // Build query - order by createdAt descending
    let query = categoriesCollectionRef.orderBy('createdAt', 'desc').limit(limit + 1); // Get one extra to check if there's more

    // If lastDocId is provided, start after that document
    if (lastDocId) {
      try {
        const lastDoc = await categoriesCollectionRef.doc(lastDocId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      } catch (error) {
        console.error('Error getting last document:', error);
      }
    }

    const categoriesSnapshot = await query.get();

    // Check if there are more documents
    const hasMore = categoriesSnapshot.docs.length > limit;
    const docs = hasMore ? categoriesSnapshot.docs.slice(0, limit) : categoriesSnapshot.docs;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    // Process categories data
    const categories = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        link: data.link || '',
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
      };
    });

    // Return success response with categories and pagination info
    return NextResponse.json(
      {
        success: true,
        message: 'Categories retrieved successfully',
        data: {
          categories,
          count: categories.length,
          pagination: {
            hasMore,
            lastDocId: lastDoc?.id || null,
            limit,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error retrieving categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while retrieving categories',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

