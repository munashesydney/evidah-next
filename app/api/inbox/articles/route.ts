import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.log('Firebase admin initialization error', error);
  }
}

const db = admin.firestore();

/**
 * GET /api/inbox/articles
 * Retrieves all articles for quick reference in inbox
 * 
 * Query parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - search: Optional search query to filter articles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const search = searchParams.get('search') || '';

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Get all categories
    const categoriesRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('categories');

    const categoriesSnapshot = await categoriesRef.get();

    // Fetch articles from all categories
    const articlePromises = categoriesSnapshot.docs.map(async (catDoc) => {
      const catId = catDoc.id;
      const articlesRef = categoriesRef.doc(catId).collection('articles');
      const articlesSnapshot = await articlesRef.get();
      
      return articlesSnapshot.docs.map((artDoc) => ({
        id: artDoc.id,
        categoryId: catId,
        ...artDoc.data(),
      }));
    });

    const nestedArticles = await Promise.all(articlePromises);
    let allArticles = nestedArticles.flat();

    // Filter by search query if provided
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      allArticles = allArticles.filter((article: any) =>
        article.title?.toLowerCase().includes(searchLower) ||
        article.content?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      status: 1,
      message: 'Articles retrieved successfully',
      articles: allArticles,
    });
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching articles', error: error.message },
      { status: 500 }
    );
  }
}

