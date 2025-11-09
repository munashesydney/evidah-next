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

// GET - Fetch appearance settings
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
        bubbleShape: 'rectangle',
        bubbleIcon: 'chat',
        customIconUrl: '',
        primaryColor: '#6366f1',
        borderRadius: '12'
      });
    }

    const configData = configDoc.data();

    return NextResponse.json({
      bubbleShape: configData.bubbleShape ?? 'rectangle',
      bubbleIcon: configData.bubbleIcon ?? 'chat',
      customIconUrl: configData.customIconUrl ?? '',
      primaryColor: configData.primaryColor ?? '#6366f1',
      borderRadius: configData.borderRadius ?? '12'
    });
  } catch (error: any) {
    console.error('Error fetching appearance live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appearance settings', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update appearance settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, selectedCompany = 'default', bubbleShape, bubbleIcon, customIconUrl, primaryColor, borderRadius } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Validate bubbleShape
    const validShapes = ['rectangle', 'circle'];
    if (bubbleShape && !validShapes.includes(bubbleShape)) {
      return NextResponse.json(
        { error: 'Invalid bubbleShape value' },
        { status: 400 }
      );
    }

    // Validate bubbleIcon
    const validIcons = ['chat', 'message', 'robot', 'custom'];
    if (bubbleIcon && !validIcons.includes(bubbleIcon)) {
      return NextResponse.json(
        { error: 'Invalid bubbleIcon value' },
        { status: 400 }
      );
    }

    // Validate primaryColor (hex color)
    if (primaryColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primaryColor format. Must be a valid hex color' },
        { status: 400 }
      );
    }

    // Validate borderRadius (number between 0 and 50)
    if (borderRadius !== undefined) {
      const borderRadiusNum = parseInt(borderRadius);
      if (isNaN(borderRadiusNum) || borderRadiusNum < 0 || borderRadiusNum > 50) {
        return NextResponse.json(
          { error: 'Invalid borderRadius. Must be a number between 0 and 50' },
          { status: 400 }
        );
      }
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

    if (bubbleShape) updateData.bubbleShape = bubbleShape;
    if (bubbleIcon) updateData.bubbleIcon = bubbleIcon;
    if (customIconUrl !== undefined) updateData.customIconUrl = customIconUrl;
    if (primaryColor) updateData.primaryColor = primaryColor;
    if (borderRadius !== undefined) updateData.borderRadius = borderRadius.toString();

    await configRef.set(updateData, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Appearance settings updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating appearance live chat settings:', error);
    return NextResponse.json(
      { error: 'Failed to update appearance settings', details: error.message },
      { status: 500 }
    );
  }
}

