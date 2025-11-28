import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { SYSTEM_ACTIONS } from '@/lib/services/system-actions';

// Initialize Firebase Admin
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
 * POST /api/actions/install-system
 * Install all system actions for a user
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, selectedCompany } = await request.json();

    if (!uid || !selectedCompany) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const actionsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions');

    // Get existing actions to avoid duplicates
    const existingSnapshot = await actionsRef.get();
    const existingActions = existingSnapshot.docs.map((doc) => ({
      trigger: doc.data().trigger,
      employee: doc.data().employee,
    }));

    const installedActions = [];
    const now = Timestamp.now();

    // Install each system action if it doesn't exist
    for (const systemAction of SYSTEM_ACTIONS) {
      const exists = existingActions.some(
        (existing) =>
          existing.trigger === systemAction.trigger &&
          existing.employee === systemAction.employee
      );

      if (!exists) {
        const actionData = {
          trigger: systemAction.trigger,
          employee: systemAction.employee,
          prompt: systemAction.prompt,
          enabled: true,
          isSystem: true, // Mark as system action
          systemActionId: systemAction.id,
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await actionsRef.add(actionData);
        installedActions.push({
          id: docRef.id,
          ...actionData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      installedCount: installedActions.length,
      actions: installedActions,
    });
  } catch (error: any) {
    console.error('Error installing system actions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
