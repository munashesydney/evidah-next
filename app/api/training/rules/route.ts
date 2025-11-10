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
 * Get all rules for a user/company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    console.log(`[RULES] Fetching rules for ${uid}/${selectedCompany}`);

    const rulesRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('trainingRules')
      .orderBy('createdAt', 'desc');

    const snapshot = await rulesRef.get();
    const rules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[RULES] Found ${rules.length} rules`);

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error: any) {
    console.error('[RULES] Error fetching rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch rules',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new rule
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', text } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Rule text is required' }, { status: 400 });
    }

    console.log(`[RULES] Creating new rule for ${uid}/${selectedCompany}`);

    const ruleData = {
      text: text.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ruleRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('trainingRules')
      .doc();

    await ruleRef.set(ruleData);

    const rule = {
      id: ruleRef.id,
      ...ruleData,
    };

    console.log(`[RULES] Rule created: ${rule.id}`);

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error: any) {
    console.error('[RULES] Error creating rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create rule',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Update an existing rule
 */
export async function PUT(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', ruleId, text, enabled } = await request.json();

    if (!uid || !ruleId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and ruleId' },
        { status: 400 }
      );
    }

    console.log(`[RULES] Updating rule ${ruleId} for ${uid}/${selectedCompany}`);

    const ruleRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('trainingRules')
      .doc(ruleId);

    const ruleSnapshot = await ruleRef.get();
    if (!ruleSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (text !== undefined) {
      updateData.text = text.trim();
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    await ruleRef.update(updateData);

    const updatedRule = {
      id: ruleId,
      ...ruleSnapshot.data(),
      ...updateData,
    };

    console.log(`[RULES] Rule updated: ${ruleId}`);

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error: any) {
    console.error('[RULES] Error updating rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update rule',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', ruleId } = await request.json();

    if (!uid || !ruleId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and ruleId' },
        { status: 400 }
      );
    }

    console.log(`[RULES] Deleting rule ${ruleId} for ${uid}/${selectedCompany}`);

    const ruleRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('trainingRules')
      .doc(ruleId);

    const ruleSnapshot = await ruleRef.get();
    if (!ruleSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    await ruleRef.delete();

    console.log(`[RULES] Rule deleted: ${ruleId}`);

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error: any) {
    console.error('[RULES] Error deleting rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete rule',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

