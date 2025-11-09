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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const { articleId } = await params;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    
    // Get all categories to search for the article
    const categoriesRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories`
    );
    const categoriesSnapshot = await categoriesRef.get();

    if (categoriesSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'No categories found' },
        { status: 404 }
      );
    }

    // Search through all categories to find the article
    let articleData: any = null;
    let categoryId: string = '';
    let categoryName: string = '';

    for (const categoryDoc of categoriesSnapshot.docs) {
      const articleRef = db.doc(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryDoc.id}/articles/${articleId}`
      );
      const articleDoc = await articleRef.get();

      if (articleDoc.exists) {
        articleData = articleDoc.data();
        categoryId = categoryDoc.id;
        categoryName = categoryDoc.data()?.name || '';
        break;
      }
    }

    if (!articleData) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Format the article data
    const article = {
      id: articleId,
      categoryId,
      categoryName,
      title: articleData.title || '',
      description: articleData.description || '',
      link: articleData.link || '',
      content: articleData.content || '',
      rawText: articleData.rawText || '',
      published: articleData.published || false,
      fav: articleData.fav || false,
      createdAt: articleData.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: articleData.updatedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Article retrieved successfully',
        data: { article },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

