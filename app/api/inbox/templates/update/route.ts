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
 * PUT /api/inbox/templates/update
 * Updates an existing response template
 * 
 * Body parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - templateId: Template ID (required)
 * - title: Template title (optional)
 * - body: Template body (optional)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', templateId, title, body: templateBody } = body;

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: templateId' },
        { status: 400 }
      );
    }

    if (!title && !templateBody) {
      return NextResponse.json(
        { status: 0, message: 'At least one of title or body must be provided' },
        { status: 400 }
      );
    }

    // Reference to template document
    const templateRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('responseTemplates')
      .doc(templateId);

    // Check if template exists
    const doc = await templateRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { status: 0, message: 'Template not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (title) {
      updateData.title = title.trim();
    }
    if (templateBody) {
      updateData.body = templateBody.trim();
    }

    // Update template
    await templateRef.update(updateData);

    // Get updated template
    const updatedDoc = await templateRef.get();
    const template = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    return NextResponse.json({
      status: 1,
      message: 'Template updated successfully',
      template,
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { status: 0, message: 'Error updating template', error: error.message },
      { status: 500 }
    );
  }
}

