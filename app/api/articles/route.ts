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
 * GET /api/articles
 * Retrieve articles with optional category filtering and pagination
 * 
 * Query params:
 * - uid: required
 * - selectedCompany: optional (defaults to 'default')
 * - categoryId: optional, single category ID or comma-separated list
 * - limit: optional (defaults to 12)
 * - lastDocId: optional, for pagination
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const categoryIdParam = searchParams.get('categoryId');
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

    // Parse categoryIds (support single or comma-separated)
    const categoryIds = categoryIdParam
      ? categoryIdParam.split(',').map((id) => id.trim()).filter((id) => id)
      : [];

    let allArticles: any[] = [];
    let lastDoc: any = null;

    if (categoryIds.length === 0) {
      // Get all articles across all categories
      // This requires fetching from all categories - we'll need to aggregate
      const categoriesRef = db.collection(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories`
      );
      const categoriesSnapshot = await categoriesRef.get();

      // Fetch articles from each category
      const articlePromises = categoriesSnapshot.docs.map(async (categoryDoc) => {
        const articlesRef = db.collection(
          `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles`
        );
        let query = articlesRef.orderBy('createdAt', 'desc').limit(limit + 1);

        if (lastDocId) {
          // For multi-category queries, pagination is complex
          // We'll fetch all and sort client-side for simplicity
          query = articlesRef.orderBy('createdAt', 'desc').limit(100);
        }

        const articlesSnapshot = await query.get();
        return articlesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          categoryId: categoryDoc.id,
          categoryName: categoryDoc.data().name,
        }));
      });

      const articlesArrays = await Promise.all(articlePromises);
      allArticles = articlesArrays.flat();

      // Sort by createdAt descending
      allArticles.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      // Apply pagination
      if (lastDocId) {
        const lastIndex = allArticles.findIndex((art) => art.id === lastDocId);
        if (lastIndex >= 0) {
          allArticles = allArticles.slice(lastIndex + 1);
        }
      }

      const hasMore = allArticles.length > limit;
      allArticles = allArticles.slice(0, limit);
      lastDoc = allArticles.length > 0 ? allArticles[allArticles.length - 1] : null;

      // Process articles data
      const articles = allArticles.map((article) => ({
        id: article.id,
        categoryId: article.categoryId,
        categoryName: article.categoryName,
        title: article.title || '',
        description: article.description || '',
        link: article.link || '',
        published: article.published || false,
        fav: article.fav || false,
        createdAt: article.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: article.updatedAt?.toDate?.()?.toISOString() || null,
      }));

      return NextResponse.json(
        {
          success: true,
          message: 'Articles retrieved successfully',
          data: {
            articles,
            count: articles.length,
            pagination: {
              hasMore,
              lastDocId: lastDoc?.id || null,
              limit,
            },
          },
        },
        { status: 200 }
      );
    } else {
      // Filter by specific category(ies)
      const articlePromises = categoryIds.map(async (categoryId) => {
        // Verify category exists
        const categoryRef = db.doc(
          `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}`
        );
        const categoryDoc = await categoryRef.get();

        if (!categoryDoc.exists) {
          return [];
        }

        const articlesRef = db.collection(
          `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}/articles`
        );
        
        let articlesSnapshot;
        try {
          let query = articlesRef.orderBy('createdAt', 'desc').limit(limit + 1);

          if (lastDocId) {
            try {
              const lastDoc = await articlesRef.doc(lastDocId).get();
              if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
              }
            } catch (error) {
              // Silently handle error
            }
          }

          articlesSnapshot = await query.get();
        } catch (error: any) {
          // If orderBy fails (likely missing index), try without orderBy
          try {
            let query = articlesRef.limit(limit + 1);
            if (lastDocId) {
              const lastDoc = await articlesRef.doc(lastDocId).get();
              if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
              }
            }
            articlesSnapshot = await query.get();
            // Sort client-side
            const docs = articlesSnapshot.docs.sort((a, b) => {
              const aTime = a.data().createdAt?.toDate?.()?.getTime() || 0;
              const bTime = b.data().createdAt?.toDate?.()?.getTime() || 0;
              return bTime - aTime;
            });
            articlesSnapshot = { docs } as any;
          } catch (fallbackError) {
            articlesSnapshot = { docs: [] } as any;
          }
        }
        
        return articlesSnapshot.docs.map((doc: any) => ({
          ...doc.data(),
          id: doc.id,
          categoryId,
          categoryName: categoryDoc.data()?.name || '',
        }));
      });

      const articlesArrays = await Promise.all(articlePromises);
      allArticles = articlesArrays.flat();

      // Sort by createdAt descending
      allArticles.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      // Check if there are more documents
      const hasMore = allArticles.length > limit;
      const docs = hasMore ? allArticles.slice(0, limit) : allArticles;
      lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

      // Process articles data
      const articles = docs.map((article) => ({
        id: article.id,
        categoryId: article.categoryId,
        categoryName: article.categoryName,
        title: article.title || '',
        description: article.description || '',
        link: article.link || '',
        published: article.published || false,
        fav: article.fav || false,
        createdAt: article.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: article.updatedAt?.toDate?.()?.toISOString() || null,
      }));

      return NextResponse.json(
        {
          success: true,
          message: 'Articles retrieved successfully',
          data: {
            articles,
            count: articles.length,
            categoryIds: categoryIds,
            pagination: {
              hasMore,
              lastDocId: lastDoc?.id || null,
              limit,
            },
          },
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Error retrieving articles:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while retrieving articles',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

