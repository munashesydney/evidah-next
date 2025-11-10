import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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

/**
 * Get all FAQs for a user/company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    console.log(`[FAQ] Fetching FAQs for ${uid}/${selectedCompany}`);

    const faqsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('faqs')
      .orderBy('createdAt', 'desc');

    const snapshot = await faqsRef.get();
    const faqs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[FAQ] Found ${faqs.length} FAQs`);

    return NextResponse.json({
      success: true,
      faqs,
    });
  } catch (error: any) {
    console.error('[FAQ] Error fetching FAQs:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch FAQs',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new FAQ
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', question, answer } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    if (!question || !question.trim()) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json({ success: false, error: 'Answer is required' }, { status: 400 });
    }

    console.log(`[FAQ] Creating new FAQ for ${uid}/${selectedCompany}`);

    const faqData = {
      question: question.trim(),
      answer: answer.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const faqRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('faqs')
      .doc();

    await faqRef.set(faqData);

    const faq = {
      id: faqRef.id,
      ...faqData,
    };

    console.log(`[FAQ] FAQ created: ${faq.id}`);

    return NextResponse.json({
      success: true,
      faq,
    });
  } catch (error: any) {
    console.error('[FAQ] Error creating FAQ:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create FAQ',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Update an existing FAQ
 */
export async function PUT(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', faqId, question, answer, enabled } = await request.json();

    if (!uid || !faqId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and faqId' },
        { status: 400 }
      );
    }

    console.log(`[FAQ] Updating FAQ ${faqId} for ${uid}/${selectedCompany}`);

    const faqRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('faqs')
      .doc(faqId);

    const faqSnapshot = await faqRef.get();
    if (!faqSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (question !== undefined) {
      updateData.question = question.trim();
    }

    if (answer !== undefined) {
      updateData.answer = answer.trim();
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    await faqRef.update(updateData);

    const updatedFaq = {
      id: faqId,
      ...faqSnapshot.data(),
      ...updateData,
    };

    console.log(`[FAQ] FAQ updated: ${faqId}`);

    return NextResponse.json({
      success: true,
      faq: updatedFaq,
    });
  } catch (error: any) {
    console.error('[FAQ] Error updating FAQ:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update FAQ',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a FAQ
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', faqId } = await request.json();

    if (!uid || !faqId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and faqId' },
        { status: 400 }
      );
    }

    console.log(`[FAQ] Deleting FAQ ${faqId} for ${uid}/${selectedCompany}`);

    const faqRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('faqs')
      .doc(faqId);

    const faqSnapshot = await faqRef.get();
    if (!faqSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 });
    }

    await faqRef.delete();

    console.log(`[FAQ] FAQ deleted: ${faqId}`);

    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error: any) {
    console.error('[FAQ] Error deleting FAQ:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete FAQ',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

