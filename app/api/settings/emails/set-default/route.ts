import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany, emailId } = body;

    // Validation
    if (!uid || !emailId) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, emailId' },
        { status: 400 }
      );
    }

    const companyId = selectedCompany || 'default';

    // Get all emails for this knowledge base
    const emailsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(companyId)
      .collection('emails');
    
    const emailsSnapshot = await emailsRef.get();

    if (emailsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No emails found' },
        { status: 404 }
      );
    }

    // Check if the target email exists
    const targetEmailDoc = emailsSnapshot.docs.find((doc) => doc.id === emailId);
    if (!targetEmailDoc) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Use batch write to update all emails atomically
    const batch = db.batch();

    // Update all emails: set default to true for target, false for others
    emailsSnapshot.docs.forEach((doc) => {
      const emailDocRef = emailsRef.doc(doc.id);
      batch.update(emailDocRef, {
        default: doc.id === emailId,
      });
    });

    await batch.commit();

    // Fetch updated emails
    const updatedSnapshot = await emailsRef.get();
    const updatedEmails = updatedSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username || '',
        fromEmail: data.fromEmail || '',
        senderName: data.senderName || '',
        smtpServer: data.smtpServer || '',
        port: data.port || '',
        default: data.default || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Default email updated successfully',
      data: updatedEmails,
    });
  } catch (error: any) {
    console.error('Error setting default email:', error);
    return NextResponse.json(
      { error: 'Failed to set default email', details: error.message },
      { status: 500 }
    );
  }
}

