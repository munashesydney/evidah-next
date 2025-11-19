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
 * DELETE /api/scenarios/delete
 * Delete a scenario
 * 
 * Body:
 * - uid: string (required) - User ID
 * - selectedCompany: string (optional, default: 'default') - Company/knowledge base ID
 * - scenarioId: string (required) - Scenario ID to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', scenarioId } = body;

    if (!uid || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and scenarioId' },
        { status: 400 }
      );
    }

    console.log(`[SCENARIOS] Deleting scenario ${scenarioId} for ${uid}/${selectedCompany}`);

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

    await scenarioRef.delete();

    console.log(`[SCENARIOS] Scenario deleted: ${scenarioId}`);

    return NextResponse.json({
      success: true,
      message: 'Scenario deleted successfully',
    });
  } catch (error: any) {
    console.error('[SCENARIOS] Error deleting scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete scenario',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

