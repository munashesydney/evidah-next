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
 * GET /api/category/search
 * Smart search for categories using Firebase queries
 * 
 * Supports:
 * - Prefix matching on name and description
 * - Case-insensitive search
 * - Efficient Firebase range queries
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const query = searchParams.get('query') || '';
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

    let categoriesSnapshot;

    if (!query || query.trim() === '') {
      // If no query, return all categories ordered by createdAt
      let queryBuilder = categoriesCollectionRef.orderBy('createdAt', 'desc').limit(limit + 1);
      
      // If lastDocId is provided, start after that document
      if (lastDocId) {
        try {
          const lastDoc = await categoriesCollectionRef.doc(lastDocId).get();
          if (lastDoc.exists) {
            queryBuilder = queryBuilder.startAfter(lastDoc);
          }
        } catch (error) {
          console.error('Error getting last document:', error);
        }
      }
      
      categoriesSnapshot = await queryBuilder.get();
    } else {
      // Normalize search query to lowercase
      const searchTerm = query.trim().toLowerCase();
      const searchTermEnd = searchTerm + '\uf8ff'; // Unicode character for range query

      // Try to find matches in name first (most common search)
      // Note: Firestore requires orderBy on the same field as the range query
      let nameResults = { docs: [] as any[] };
      let nameQueryFailed = false;
      try {
        let nameQuery = categoriesCollectionRef
          .where('nameLowercase', '>=', searchTerm)
          .where('nameLowercase', '<=', searchTermEnd)
          .orderBy('nameLowercase')
          .limit(limit + 1); // Get one extra for pagination check
        
        // If lastDocId is provided and we're paginating, we need to handle this differently
        // For search, pagination is complex with merged queries, so we'll skip it for now
        // and just return the first page of results
        
        nameResults = await nameQuery.get();
      } catch (error: any) {
        // If index doesn't exist, fall back to fetching all and filtering
        nameQueryFailed = true;
        console.warn('Firestore index may be needed for nameLowercase search:', error);
      }

      // Also search in description
      let descriptionResults = { docs: [] as any[] };
      let descriptionQueryFailed = false;
      try {
        let descriptionQuery = categoriesCollectionRef
          .where('descriptionLowercase', '>=', searchTerm)
          .where('descriptionLowercase', '<=', searchTermEnd)
          .orderBy('descriptionLowercase')
          .limit(limit + 1); // Get one extra for pagination check
        
        descriptionResults = await descriptionQuery.get();
      } catch (error: any) {
        // If index doesn't exist, fall back to fetching all and filtering
        descriptionQueryFailed = true;
        console.warn('Firestore index may be needed for descriptionLowercase search:', error);
      }

      // If both queries failed (no indexes), fall back to fetching all and filtering client-side
      if (nameQueryFailed && descriptionQueryFailed) {
        const allCategories = await categoriesCollectionRef
          .orderBy('createdAt', 'desc')
          .limit(100) // Get more for filtering
          .get();
        
        // Filter client-side
        const filtered = allCategories.docs.filter((doc) => {
          const data = doc.data();
          const nameLower = (data.nameLowercase || data.name?.toLowerCase() || '');
          const descLower = (data.descriptionLowercase || data.description?.toLowerCase() || '');
          return nameLower.includes(searchTerm) || descLower.includes(searchTerm);
        });
        
        categoriesSnapshot = {
          docs: filtered.slice(0, limit),
          empty: filtered.length === 0,
          size: filtered.length,
        } as any;
      } else {
        // Combine results and remove duplicates
        const allDocs = new Map();
        
        // Add name matches first (higher priority)
        nameResults.docs.forEach((doc) => {
          allDocs.set(doc.id, doc);
        });
        
        // Add description matches (won't overwrite name matches)
        descriptionResults.docs.forEach((doc) => {
          if (!allDocs.has(doc.id)) {
            allDocs.set(doc.id, doc);
          }
        });

        // Convert Map to array
        const docsArray = Array.from(allDocs.values());
        
        // For search queries, pagination is complex with merged results
        // We'll limit to the requested amount and check if there might be more
        // by seeing if either query returned more than the limit
        const hasMoreResults = nameResults.docs.length > limit || descriptionResults.docs.length > limit;
        const limitedDocs = docsArray.slice(0, limit);
        
        // Create a mock snapshot-like object
        categoriesSnapshot = {
          docs: limitedDocs,
          empty: limitedDocs.length === 0,
          size: limitedDocs.length,
          _hasMore: hasMoreResults, // Store this for later use
        } as any;
      }
    }

    // Check if there are more documents (for pagination)
    // For search results, we use the _hasMore flag if available
    const hasMore = (categoriesSnapshot as any)._hasMore !== undefined 
      ? (categoriesSnapshot as any)._hasMore
      : categoriesSnapshot.docs.length > limit;
    const docs = hasMore && categoriesSnapshot.docs.length > limit 
      ? categoriesSnapshot.docs.slice(0, limit) 
      : categoriesSnapshot.docs;
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
          query: query || null,
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
    console.error('Error searching categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while searching categories',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

