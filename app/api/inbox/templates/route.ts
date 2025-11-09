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
 * GET /api/inbox/templates
 * Retrieves all response templates for a user's knowledge base
 * 
 * Query parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Reference to templates collection
    const templatesRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('responseTemplates');

    // Get all templates
    const snapshot = await templatesRef.get();

    // If no templates exist, create default ones
    if (snapshot.empty) {
      const defaults = [
        { title: 'Greeting', body: 'Hi there,\n\nThank you for reaching out. We\'ll get back to you shortly.\n\nBest regards,\n[Your Company]' },
        { title: 'Closing', body: 'Thank you for contacting us. If you have further questions, let us know.\n\nBest regards,\n[Your Company]' }
      ];

      const batch = db.batch();
      defaults.forEach((template) => {
        const docRef = templatesRef.doc();
        batch.set(docRef, template);
      });
      await batch.commit();

      // Fetch again after creating defaults
      const newSnapshot = await templatesRef.get();
      const templates = newSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        status: 1,
        message: 'Templates retrieved successfully',
        templates,
      });
    }

    // Map documents to template objects
    const templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      status: 1,
      message: 'Templates retrieved successfully',
      templates,
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching templates', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inbox/templates
 * Creates a new response template
 * 
 * Body parameters:
 * - uid: User ID (required)
 * - selectedCompany: Company identifier (optional, defaults to 'default')
 * - title: Template title (required)
 * - body: Template body (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', title, body: templateBody } = body;

    // Validate required parameters
    if (!uid) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!title || !templateBody) {
      return NextResponse.json(
        { status: 0, message: 'Missing required parameters: title and body' },
        { status: 400 }
      );
    }

    // Reference to templates collection
    const templatesRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('responseTemplates');

    // Create new template
    const docRef = await templatesRef.add({
      title: title.trim(),
      body: templateBody.trim(),
    });

    // Get the created template
    const doc = await docRef.get();
    const template = {
      id: doc.id,
      ...doc.data(),
    };

    return NextResponse.json({
      status: 1,
      message: 'Template created successfully',
      template,
    });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { status: 0, message: 'Error creating template', error: error.message },
      { status: 500 }
    );
  }
}

