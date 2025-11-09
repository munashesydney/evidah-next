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
    const { uid, agentId, displayName, role, phoneNumber } = body;

    // Validation
    if (!uid || !agentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: uid, agentId' },
        { status: 400 }
      );
    }

    // At least one field must be provided for update
    if (displayName === undefined && role === undefined && phoneNumber === undefined) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    // Update agent document in Firestore
    const agentDocRef = db
      .collection('Users')
      .doc(uid)
      .collection('AdditionalUsers')
      .doc(agentId);

    // Check if agent exists
    const agentDoc = await agentDocRef.get();
    if (!agentDoc.exists) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    await agentDocRef.update(updateData);

    // Fetch updated agent data
    const updatedAgentDoc = await agentDocRef.get();
    const updatedAgentData = updatedAgentDoc.data();

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
      data: {
        id: agentId,
        userEmail: updatedAgentData?.userEmail || '',
        role: updatedAgentData?.role || '',
        displayName: updatedAgentData?.displayName || '',
        phoneNumber: updatedAgentData?.phoneNumber || '',
        createdAt: updatedAgentData?.createdAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent', details: error.message },
      { status: 500 }
    );
  }
}

