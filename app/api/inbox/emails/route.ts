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
 * GET /api/inbox/emails
 * Retrieves all email configurations for a user's knowledge base
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

    // Get subdomain from knowledge base
    const knowledgeBaseRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany);

    const knowledgeBaseDoc = await knowledgeBaseRef.get();
    const subdomain = knowledgeBaseDoc.exists ? knowledgeBaseDoc.data()?.subdomain : null;

    // Reference to emails collection
    const emailsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('emails');

    // Get all custom emails
    const snapshot = await emailsRef.get();

    // Map documents to email objects (exclude password for security)
    const customEmails = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        emailAddress: data.emailAddress,
        smtpServer: data.smtpServer,
        port: data.port,
        type: 'custom' as const,
        // Don't return password for security
        createdAt: data.createdAt,
      };
    });

    // Create default email (always first)
    const defaultEmail = subdomain
      ? {
          id: null,
          emailAddress: `${subdomain}@ourkd.help`,
          smtpServer: null,
          port: null,
          type: 'default' as const,
          createdAt: null,
        }
      : null;

    // Combine emails: default first, then custom emails
    const emails = defaultEmail ? [defaultEmail, ...customEmails] : customEmails;

    return NextResponse.json({
      status: 1,
      message: 'Emails retrieved successfully',
      emails,
    });
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { status: 0, message: 'Error fetching emails', error: error.message },
      { status: 500 }
    );
  }
}

