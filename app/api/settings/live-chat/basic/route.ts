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

// GET - Fetch basic settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    const configRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default');
    
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json({
        enabled: true,
        position: 'bottom-right',
        theme: 'default',
        size: 'medium'
      });
    }

    const configData = configDoc.data();

    return NextResponse.json({
      enabled: configData.enabled ?? true,
      position: configData.position ?? 'bottom-right',
      theme: configData.theme ?? 'default',
      size: configData.size ?? 'medium'
    });
  } catch (error: any) {
    console.error('Error fetching basic live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch basic settings', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update basic settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', enabled, position, theme, size } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Validate position
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    if (position && !validPositions.includes(position)) {
      return NextResponse.json(
        { error: 'Invalid position value' },
        { status: 400 }
      );
    }

    // Validate theme
    const validThemes = ['default', 'minimal', 'rounded', 'modern'];
    if (theme && !validThemes.includes(theme)) {
      return NextResponse.json(
        { error: 'Invalid theme value' },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ['small', 'medium', 'large'];
    if (size && !validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid size value' },
        { status: 400 }
      );
    }

    const configRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('livechat')
      .doc('default');

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: uid
    };

    if (enabled !== undefined) updateData.enabled = enabled;
    if (position) updateData.position = position;
    if (theme) updateData.theme = theme;
    if (size) updateData.size = size;

    await configRef.set(updateData, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Basic settings updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating basic live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to update basic settings', details: error.message },
      { status: 500 }
    );
  }
}

