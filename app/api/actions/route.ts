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
 * Get all actions for a user/company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    console.log(`[ACTIONS] Fetching actions for ${uid}/${selectedCompany}`);

    const actionsRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .orderBy('createdAt', 'desc');

    const snapshot = await actionsRef.get();
    const actions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[ACTIONS] Found ${actions.length} actions`);

    return NextResponse.json({
      success: true,
      actions,
    });
  } catch (error: any) {
    console.error('[ACTIONS] Error fetching actions:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch actions',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new action
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', trigger, employee, prompt } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: uid' }, { status: 400 });
    }

    if (!trigger || !employee || !prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Trigger, employee, and prompt are required' }, { status: 400 });
    }

    console.log(`[ACTIONS] Creating new action for ${uid}/${selectedCompany}`);

    const actionData = {
      trigger,
      employee,
      prompt: prompt.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const actionRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc();

    await actionRef.set(actionData);

    const action = {
      id: actionRef.id,
      ...actionData,
    };

    console.log(`[ACTIONS] Action created: ${action.id}`);

    return NextResponse.json({
      success: true,
      action,
    });
  } catch (error: any) {
    console.error('[ACTIONS] Error creating action:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create action',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Update an existing action
 */
export async function PUT(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', actionId, trigger, employee, prompt, enabled } = await request.json();

    if (!uid || !actionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and actionId' },
        { status: 400 }
      );
    }

    console.log(`[ACTIONS] Updating action ${actionId} for ${uid}/${selectedCompany}`);

    const actionRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc(actionId);

    const actionSnapshot = await actionRef.get();
    if (!actionSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Action not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (trigger !== undefined) {
      updateData.trigger = trigger;
    }

    if (employee !== undefined) {
      updateData.employee = employee;
    }

    if (prompt !== undefined) {
      updateData.prompt = prompt.trim();
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    await actionRef.update(updateData);

    const updatedAction = {
      id: actionId,
      ...actionSnapshot.data(),
      ...updateData,
    };

    console.log(`[ACTIONS] Action updated: ${actionId}`);

    return NextResponse.json({
      success: true,
      action: updatedAction,
    });
  } catch (error: any) {
    console.error('[ACTIONS] Error updating action:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update action',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Delete an action
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid, selectedCompany = 'default', actionId } = await request.json();

    if (!uid || !actionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: uid and actionId' },
        { status: 400 }
      );
    }

    console.log(`[ACTIONS] Deleting action ${actionId} for ${uid}/${selectedCompany}`);

    const actionRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc(actionId);

    const actionSnapshot = await actionRef.get();
    if (!actionSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Action not found' }, { status: 404 });
    }

    await actionRef.delete();

    console.log(`[ACTIONS] Action deleted: ${actionId}`);

    return NextResponse.json({
      success: true,
      message: 'Action deleted successfully',
    });
  } catch (error: any) {
    console.error('[ACTIONS] Error deleting action:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete action',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
