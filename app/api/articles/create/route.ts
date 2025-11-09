import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
 * POST /api/articles/create
 * Create a new article in a specific category
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      selectedCompany = 'default',
      categoryId,
      title,
      description,
      link,
      content = '',
      rawText = '',
      published = false,
    } = body;

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

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: title', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: description', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: link', code: 'MISSING_LINK' },
        { status: 400 }
      );
    }

    // Validate link format (allow only letters, numbers, hyphens, and underscores)
    const linkPattern = /^[a-zA-Z0-9-_]+$/;
    if (!linkPattern.test(link)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid link format. Only letters, numbers, hyphens, and underscores are allowed.',
          code: 'INVALID_LINK_FORMAT',
        },
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

    // Verify category exists
    const categoryRef = db.doc(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}`
    );
    const categoryDoc = await categoryRef.get();

    if (!categoryDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Category not found', code: 'CATEGORY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create articles collection reference
    const articlesCollectionRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}/articles`
    );

    // Check if an article with the same link already exists in this category
    const existingArticleQuery = await articlesCollectionRef.where('link', '==', link).get();

    if (!existingArticleQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          error: 'An article with this link already exists in this category',
          code: 'DUPLICATE_LINK',
        },
        { status: 409 }
      );
    }

    // Prepare article data with lowercase fields for search
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const articleData = {
      title: trimmedTitle,
      description: trimmedDescription,
      titleLowercase: trimmedTitle.toLowerCase(),
      descriptionLowercase: trimmedDescription.toLowerCase(),
      link: link.trim(),
      content: content,
      rawText: rawText,
      rawTextLowercase: rawText.toLowerCase(),
      published: Boolean(published),
      fav: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await articlesCollectionRef.add(articleData);

    // Get category name for response
    const categoryData = categoryDoc.data();

    // Return success response with article ID
    return NextResponse.json(
      {
        success: true,
        message: 'Article created successfully',
        data: {
          articleId: docRef.id,
          categoryId: categoryId,
          categoryName: categoryData?.name,
          title: articleData.title,
          description: articleData.description,
          link: articleData.link,
          published: articleData.published,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating article:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while creating article',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

