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
 * GET /api/articles/search
 * Smart search for articles using Firebase queries
 * 
 * Supports:
 * - Prefix matching on title, description, and rawText
 * - Case-insensitive search
 * - Optional categoryId filtering (single or comma-separated)
 * - Efficient Firebase range queries
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const query = searchParams.get('query') || '';
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

    // Get all categories if no specific ones provided
    const categoriesRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories`
    );
    const categoriesSnapshot = await categoriesRef.get();

    const categoriesToSearch = categoryIds.length > 0
      ? categoriesSnapshot.docs.filter((doc) => categoryIds.includes(doc.id))
      : categoriesSnapshot.docs;

    if (!query || query.trim() === '') {
      // If no query, return all articles ordered by createdAt
      const articlePromises = categoriesToSearch.map(async (categoryDoc) => {
        const articlesRef = db.collection(
          `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles`
        );
        let queryBuilder = articlesRef.orderBy('createdAt', 'desc').limit(limit + 1);

        if (lastDocId) {
          try {
            const lastDoc = await articlesRef.doc(lastDocId).get();
            if (lastDoc.exists) {
              queryBuilder = queryBuilder.startAfter(lastDoc);
            }
          } catch (error) {
            console.error('Error getting last document:', error);
          }
        }

        const articlesSnapshot = await queryBuilder.get();
        return articlesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          categoryId: categoryDoc.id,
          categoryName: categoryDoc.data().name,
        }));
      });

      const articlesArrays = await Promise.all(articlePromises);
      const allArticles = articlesArrays.flat();

      // Sort by createdAt descending
      allArticles.sort((a, b) => {
        const aTime = (a as any).createdAt?.toDate?.()?.getTime() || 0;
        const bTime = (b as any).createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      const hasMore = allArticles.length > limit;
      const docs = hasMore ? allArticles.slice(0, limit) : allArticles;
      const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

      const articles = docs.map((article: any) => ({
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
            query: null,
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

    // Normalize search query to lowercase
    const searchTerm = query.trim().toLowerCase();
    const searchTermEnd = searchTerm + '\uf8ff'; // Unicode character for range query

    // Search across all specified categories
    const searchPromises = categoriesToSearch.map(async (categoryDoc) => {
      const articlesRef = db.collection(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles`
      );

      // Try to search in title, description, and rawText
      const searchQueries = [
        // Title search
        articlesRef
          .where('titleLowercase', '>=', searchTerm)
          .where('titleLowercase', '<=', searchTermEnd)
          .orderBy('titleLowercase')
          .limit(limit + 1)
          .get()
          .catch(() => ({ docs: [] })),
        // Description search
        articlesRef
          .where('descriptionLowercase', '>=', searchTerm)
          .where('descriptionLowercase', '<=', searchTermEnd)
          .orderBy('descriptionLowercase')
          .limit(limit + 1)
          .get()
          .catch(() => ({ docs: [] })),
        // RawText search (if available)
        articlesRef
          .where('rawTextLowercase', '>=', searchTerm)
          .where('rawTextLowercase', '<=', searchTermEnd)
          .orderBy('rawTextLowercase')
          .limit(limit + 1)
          .get()
          .catch(() => ({ docs: [] })),
      ];

      const [titleResults, descriptionResults, rawTextResults] = await Promise.all(searchQueries);

      // Combine results and remove duplicates
      const allDocs = new Map();

      // Add title matches first (highest priority)
      titleResults.docs.forEach((doc) => {
        allDocs.set(doc.id, { ...doc.data(), id: doc.id, categoryId: categoryDoc.id, categoryName: categoryDoc.data().name });
      });

      // Add description matches
      descriptionResults.docs.forEach((doc) => {
        if (!allDocs.has(doc.id)) {
          allDocs.set(doc.id, { ...doc.data(), id: doc.id, categoryId: categoryDoc.id, categoryName: categoryDoc.data().name });
        }
      });

      // Add rawText matches
      rawTextResults.docs.forEach((doc) => {
        if (!allDocs.has(doc.id)) {
          allDocs.set(doc.id, { ...doc.data(), id: doc.id, categoryId: categoryDoc.id, categoryName: categoryDoc.data().name });
        }
      });

      return Array.from(allDocs.values());
    });

    const articlesArrays = await Promise.all(searchPromises);
    let allArticles = articlesArrays.flat();

    // If no results from indexed queries, fall back to fetching all and filtering
    if (allArticles.length === 0) {
      const fallbackPromises = categoriesToSearch.map(async (categoryDoc) => {
        const articlesRef = db.collection(
          `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles`
        );
        const articlesSnapshot = await articlesRef.orderBy('createdAt', 'desc').limit(100).get();

        return articlesSnapshot.docs
          .map((doc) => ({
            ...doc.data(),
            id: doc.id,
            categoryId: categoryDoc.id,
            categoryName: categoryDoc.data().name,
          }))
          .filter((article: any) => {
            const titleLower = (article.titleLowercase || article.title?.toLowerCase() || '');
            const descLower = (article.descriptionLowercase || article.description?.toLowerCase() || '');
            const rawTextLower = (article.rawTextLowercase || article.rawText?.toLowerCase() || '');
            return (
              titleLower.includes(searchTerm) ||
              descLower.includes(searchTerm) ||
              rawTextLower.includes(searchTerm)
            );
          });
      });

      const fallbackArrays = await Promise.all(fallbackPromises);
      allArticles = fallbackArrays.flat();
    }

    // Sort by relevance (title matches first, then description, then rawText)
    allArticles.sort((a, b) => {
      const aTitle = (a.titleLowercase || a.title?.toLowerCase() || '').startsWith(searchTerm) ? 0 : 1;
      const bTitle = (b.titleLowercase || b.title?.toLowerCase() || '').startsWith(searchTerm) ? 0 : 1;
      if (aTitle !== bTitle) return aTitle - bTitle;

      // Then by createdAt descending
      const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });

    // Check if there are more results
    const hasMore = allArticles.length > limit;
    const docs = hasMore ? allArticles.slice(0, limit) : allArticles;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

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

    // Return success response with articles and pagination info
    return NextResponse.json(
      {
        success: true,
        message: 'Articles retrieved successfully',
        data: {
          articles,
          count: articles.length,
          query: query || null,
          categoryIds: categoryIds.length > 0 ? categoryIds : null,
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
    console.error('Error searching articles:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while searching articles',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

