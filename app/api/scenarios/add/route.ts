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
 * POST /api/scenarios/add
 * Create a new scenario
 * 
 * Body:
 * - uid: string (required) - User ID
 * - selectedCompany: string (optional, default: 'default') - Company/knowledge base ID
 * - name: string (required) - Scenario name
 * - description: string (optional) - Scenario description
 * - condition: string (required) - Natural language condition
 * - thenAction: string (required) - Natural language action
 * - elseAction: string (optional) - Natural language else action
 * - enabled: boolean (optional, default: true) - Whether scenario is enabled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', name, description, condition, thenAction, elseAction, enabled = true } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Scenario name is required' },
        { status: 400 }
      );
    }

    if (!condition || !condition.trim()) {
      return NextResponse.json(
        { success: false, error: 'Condition is required' },
        { status: 400 }
      );
    }

    if (!thenAction || !thenAction.trim()) {
      return NextResponse.json(
        { success: false, error: 'Then action is required' },
        { status: 400 }
      );
    }

    console.log(`[SCENARIOS] Creating new scenario for ${uid}/${selectedCompany}`);

    const scenarioData = {
      name: name.trim(),
      description: description?.trim() || '',
      condition: condition.trim(),
      thenAction: thenAction.trim(),
      elseAction: elseAction?.trim() || null,
      enabled: enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scenarioRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('scenarios')
      .doc();

    await scenarioRef.set(scenarioData);

    const scenario = {
      id: scenarioRef.id,
      ...scenarioData,
    };

    console.log(`[SCENARIOS] Scenario created: ${scenario.id}`);

    return NextResponse.json({
      success: true,
      scenario,
    });
  } catch (error: any) {
    console.error('[SCENARIOS] Error creating scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create scenario',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

