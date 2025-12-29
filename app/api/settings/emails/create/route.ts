import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany, username, fromEmail, senderName, smtpServer, port, password } = body;

    // Validation
    if (!uid || !username || !fromEmail || !senderName || !smtpServer || !port || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, username, fromEmail, senderName, smtpServer, port, password' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Check if knowledge base exists
    const kbRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId);
    
    const kbDoc = await kbRef.get();
    if (!kbDoc.exists) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    // Add email to the emails sub-collection
    const emailsRef = kbRef.collection('emails');
    
    // Check if from email already exists
    const existingEmailsSnapshot = await emailsRef
      .where('fromEmail', '==', fromEmail)
      .get();

    if (!existingEmailsSnapshot.empty) {
      return NextResponse.json(
        { error: 'From email address already exists' },
        { status: 400 }
      );
    }

    // Create new email document
    const emailDocRef = emailsRef.doc();
    await emailDocRef.set({
      username: username,
      fromEmail: fromEmail,
      senderName: senderName,
      smtpServer: smtpServer,
      port: port,
      password: password, // Note: Consider encrypting this in production
      default: false, // New emails are not default by default
      createdAt: FieldValue.serverTimestamp(),
    });

    // Return the created email data (without password)
    const createdEmail = {
      id: emailDocRef.id,
      username: username,
      fromEmail: fromEmail,
      senderName: senderName,
      smtpServer: smtpServer,
      port: port,
      default: false,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Email saved successfully',
      data: createdEmail,
    });
  } catch (error: any) {
    console.error('Error adding email:', error);
    return NextResponse.json(
      { error: 'Failed to save email', details: error.message },
      { status: 500 }
    );
  }
}

