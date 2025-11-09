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
 * DELETE /api/articles/delete
 * Delete an article
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, selectedCompany = 'default', categoryId, articleId } = body;

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid', code: 'MISSING_UID' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: categoryId', code: 'MISSING_CATEGORY_ID' },
        { status: 400 }
      );
    }

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: articleId', code: 'MISSING_ARTICLE_ID' },
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

    // Get article document reference
    const articleRef = db.doc(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}/articles/${articleId}`
    );
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Article not found', code: 'ARTICLE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the article document
    await articleRef.delete();

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Article deleted successfully',
        data: {
          articleId: articleId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting article:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while deleting article',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

