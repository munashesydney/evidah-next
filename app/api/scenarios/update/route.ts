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
 * PUT /api/scenarios/update
 * Update an existing scenario
 * 
 * Body:
 * - uid: string (required) - User ID
 * - selectedCompany: string (optional, default: 'default') - Company/knowledge base ID
 * - scenarioId: string (required) - Scenario ID to update
 * - name: string (optional) - Scenario name
 * - description: string (optional) - Scenario description
 * - condition: string (optional) - Natural language condition
 * - thenAction: string (optional) - Natural language action
 * - elseAction: string (optional) - Natural language else action (can be null to remove)
 * - enabled: boolean (optional) - Whether scenario is enabled
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uid,
      selectedCompany = 'default',
      scenarioId,
      name,
      description,
      condition,
      thenAction,
      elseAction,
      enabled,
    } = body;

    if (!uid || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and scenarioId' },
        { status: 400 }
      );
    }

    console.log(`[SCENARIOS] Updating scenario ${scenarioId} for ${uid}/${selectedCompany}`);

    const scenarioRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('scenarios')
      .doc(scenarioId);

    const scenarioSnapshot = await scenarioRef.get();
    if (!scenarioSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || '';
    }

    if (condition !== undefined) {
      updateData.condition = condition.trim();
    }

    if (thenAction !== undefined) {
      updateData.thenAction = thenAction.trim();
    }

    if (elseAction !== undefined) {
      updateData.elseAction = elseAction?.trim() || null;
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    await scenarioRef.update(updateData);

    const updatedScenario = {
      id: scenarioId,
      ...scenarioSnapshot.data(),
      ...updateData,
    };

    console.log(`[SCENARIOS] Scenario updated: ${scenarioId}`);

    return NextResponse.json({
      success: true,
      scenario: updatedScenario,
    });
  } catch (error: any) {
    console.error('[SCENARIOS] Error updating scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update scenario',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

