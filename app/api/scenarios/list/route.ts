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
 * GET /api/scenarios/list
 * List scenarios for a user/company with pagination
 * 
 * Query parameters:
 * - uid: string (required) - User ID
 * - selectedCompany: string (optional, default: 'default') - Company/knowledge base ID
 * - page: number (optional, default: 1) - Page number
 * - limit: number (optional, default: 20) - Items per page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    console.log(`[SCENARIOS] Fetching scenarios for ${uid}/${selectedCompany} (page ${page}, limit ${limit})`);

    const scenariosRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('scenarios')
      .orderBy('createdAt', 'desc');

    // Get total count
    const countSnapshot = await scenariosRef.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await scenariosRef.limit(limit).offset(offset).get();

    const scenarios = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    console.log(`[SCENARIOS] Found ${scenarios.length} scenarios (total: ${total})`);

    return NextResponse.json({
      success: true,
      scenarios,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('[SCENARIOS] Error fetching scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch scenarios',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

