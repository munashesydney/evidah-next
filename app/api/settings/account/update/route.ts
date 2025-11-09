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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, name, surname, companyname, website, profilePicture } = body;

    // Validation
    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // At least one field must be provided for update
    if (!name && !surname && !companyname && !website && !profilePicture) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (companyname !== undefined) updateData.companyname = companyname;
    if (website !== undefined) updateData.website = website;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    // Update user document in Firestore
    const userDocRef = db.collection('Users').doc(uid);
    
    // Check if user exists
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await userDocRef.update(updateData);

    // Fetch updated user data
    const updatedUserDoc = await userDocRef.get();
    const updatedUserData = updatedUserDoc.data();

    return NextResponse.json({
      success: true,
      message: 'Account updated successfully',
      data: {
        email: updatedUserData?.email || '',
        name: updatedUserData?.name || '',
        surname: updatedUserData?.surname || '',
        companyname: updatedUserData?.companyname || '',
        website: updatedUserData?.website || '',
        profilePicture: updatedUserData?.profilePicture || '',
      },
    });
  } catch (error: any) {
    console.error('Error updating user account:', error);
    return NextResponse.json(
      { error: 'Failed to update user account', details: error.message },
      { status: 500 }
    );
  }
}

