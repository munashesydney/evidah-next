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
 * POST /api/category/create
 * Create a new category in the knowledge base
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, selectedCompany = 'default', name, description, link } = body;

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid', code: 'MISSING_UID' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: name', code: 'MISSING_NAME' },
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

    // Create categories collection reference
    const categoriesCollectionRef = db.collection(
      `Users/${uid}/knowledgebases/${selectedCompany}/categories`
    );

    // Check if a category with the same link already exists
    const existingCategoryQuery = await categoriesCollectionRef.where('link', '==', link).get();

    if (!existingCategoryQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          error: 'A category with this link already exists',
          code: 'DUPLICATE_LINK',
        },
        { status: 409 }
      );
    }

    // Create the category document
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const categoryData = {
      name: trimmedName,
      description: trimmedDescription,
      nameLowercase: trimmedName.toLowerCase(),
      descriptionLowercase: trimmedDescription.toLowerCase(),
      link: link.trim(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await categoriesCollectionRef.add(categoryData);

    // Return success response with category ID
    return NextResponse.json(
      {
        success: true,
        message: 'Category created successfully',
        data: {
          categoryId: docRef.id,
          name: categoryData.name,
          description: categoryData.description,
          link: categoryData.link,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating category:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while creating category',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

