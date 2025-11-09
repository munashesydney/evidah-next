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
 * DELETE /api/inbox/templates/delete
 * Deletes a response template
 * 
 * Body parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - templateId: Template ID (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', templateId } = body;

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

    // Delete template
    await templateRef.delete();

    return NextResponse.json({
      status: 1,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { status: 0, message: 'Error deleting template', error: error.message },
      { status: 500 }
    );
  }
}

