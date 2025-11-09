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
 * PUT /api/articles/update
 * Update article metadata
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      selectedCompany = 'default',
      categoryId,
      articleId,
      title,
      description,
      link,
      published,
      fav,
      content,
      rawText,
      newCategoryId, // For moving articles between categories
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

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: articleId', code: 'MISSING_ARTICLE_ID' },
        { status: 400 }
      );
    }

    // At least one field must be provided for update
    if (!title && !description && !link && published === undefined && fav === undefined && !rawText) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one field (title, description, link, published, fav, or rawText) must be provided for update',
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

    // If link is being updated, check for conflicts with other articles in the same category
    if (link) {
      const articlesCollectionRef = db.collection(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${categoryId}/articles`
      );
      const existingArticleQuery = await articlesCollectionRef.where('link', '==', link.trim()).get();

      // Check if another article (not this one) has the same link
      const conflictingArticle = existingArticleQuery.docs.find((doc) => doc.id !== articleId);
      if (conflictingArticle) {
        return NextResponse.json(
          {
            success: false,
            error: 'An article with this link already exists in this category',
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

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      updateData.title = trimmedTitle;
      updateData.titleLowercase = trimmedTitle.toLowerCase();
    }

    if (description !== undefined) {
      const trimmedDescription = description.trim();
      updateData.description = trimmedDescription;
      updateData.descriptionLowercase = trimmedDescription.toLowerCase();
    }

    if (link !== undefined) {
      updateData.link = link.trim();
    }

    if (published !== undefined) {
      updateData.published = Boolean(published);
    }

    if (fav !== undefined) {
      updateData.fav = Boolean(fav);
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    if (rawText !== undefined) {
      updateData.rawText = rawText;
      updateData.rawTextLowercase = rawText.toLowerCase();
    }

    // Check if we're moving the article to a different category
    if (newCategoryId && newCategoryId !== categoryId) {
      // Verify new category exists
      const newCategoryRef = db.doc(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${newCategoryId}`
      );
      const newCategoryDoc = await newCategoryRef.get();

      if (!newCategoryDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'New category not found', code: 'NEW_CATEGORY_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Check for link conflicts in the new category
      if (link || articleDoc.data()?.link) {
        const finalLink = link || articleDoc.data()?.link;
        const newCategoryArticlesRef = db.collection(
          `Users/${uid}/knowledgebases/${selectedCompany}/categories/${newCategoryId}/articles`
        );
        const existingArticleQuery = await newCategoryArticlesRef.where('link', '==', finalLink).get();
        
        if (existingArticleQuery.docs.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'An article with this link already exists in the target category',
              code: 'DUPLICATE_LINK_IN_NEW_CATEGORY',
            },
            { status: 409 }
          );
        }
      }

      // Get the full article data to copy
      const fullArticleData = articleDoc.data();
      
      // Create the article in the new category with updated data
      const newArticleRef = db.doc(
        `Users/${uid}/knowledgebases/${selectedCompany}/categories/${newCategoryId}/articles/${articleId}`
      );
      
      await newArticleRef.set({
        ...fullArticleData,
        ...updateData,
      });

      // Delete the article from the old category
      await articleRef.delete();

      // Get category data for response
      const newCategoryData = newCategoryDoc.data();

      return NextResponse.json(
        {
          success: true,
          message: 'Article moved and updated successfully',
          data: {
            articleId: articleId,
            categoryId: newCategoryId,
            categoryName: newCategoryData?.name,
            title: updateData.title || fullArticleData?.title,
            description: updateData.description || fullArticleData?.description,
            link: updateData.link || fullArticleData?.link,
            published: updateData.published !== undefined ? updateData.published : (fullArticleData?.published || false),
            fav: updateData.fav !== undefined ? updateData.fav : (fullArticleData?.fav || false),
            createdAt: fullArticleData?.createdAt?.toDate().toISOString() || null,
            updatedAt: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    // Regular update (no category change)
    await articleRef.update(updateData);

    // Get updated article data for response
    const updatedArticleDoc = await articleRef.get();
    const updatedArticleData = updatedArticleDoc.data();
    const categoryData = categoryDoc.data();

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Article updated successfully',
        data: {
          articleId: articleId,
          categoryId: categoryId,
          categoryName: categoryData?.name,
          title: updatedArticleData?.title,
          description: updatedArticleData?.description,
          link: updatedArticleData?.link,
          published: updatedArticleData?.published || false,
          fav: updatedArticleData?.fav || false,
          createdAt: updatedArticleData?.createdAt?.toDate().toISOString() || null,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating article:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while updating article',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

