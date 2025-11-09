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
 * PUT /api/category/update
 * Update category metadata
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, selectedCompany = 'default', categoryId, name, description, link } = body;

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

    // At least one field must be provided for update
    if (!name && !description && !link) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one field (name, description, or link) must be provided for update',
          code: 'NO_UPDATE_FIELDS',
        },
        { status: 400 }
      );
    }

    // Validate link format if provided
    if (link) {
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

    // Get category document reference
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

    // If link is being updated, check for conflicts with other categories
    if (link) {
      const categoriesCollectionRef = db.collection(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories`
      );
      const existingCategoryQuery = await categoriesCollectionRef
        .where('link', '==', link.trim())
        .get();

      // Check if another category (not this one) has the same link
      const conflictingCategory = existingCategoryQuery.docs.find((doc) => doc.id !== categoryId);
      if (conflictingCategory) {
        return NextResponse.json(
          {
            success: false,
            error: 'A category with this link already exists',
            code: 'DUPLICATE_LINK',
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      const trimmedName = name.trim();
      updateData.name = trimmedName;
      updateData.nameLowercase = trimmedName.toLowerCase();
    }

    if (description !== undefined) {
      const trimmedDescription = description.trim();
      updateData.description = trimmedDescription;
      updateData.descriptionLowercase = trimmedDescription.toLowerCase();
    }

    if (link !== undefined) {
      updateData.link = link.trim();
    }

    // Update the category document
    await categoryRef.update(updateData);

    // Get updated category data for response
    const updatedCategoryDoc = await categoryRef.get();
    const updatedCategoryData = updatedCategoryDoc.data();

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Category updated successfully',
        data: {
          categoryId: categoryId,
          name: updatedCategoryData?.name,
          description: updatedCategoryData?.description,
          link: updatedCategoryData?.link,
          createdAt: updatedCategoryData?.createdAt?.toDate().toISOString() || null,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating category:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while updating category',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

