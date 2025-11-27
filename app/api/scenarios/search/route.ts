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
 * GET /api/scenarios/search
 * Search scenarios using Firebase queries
 * 
 * Query parameters:
 * - uid: string (required) - User ID
 * - selectedCompany: string (optional, default: 'default') - Company/knowledge base ID
 * - q: string (required) - Search query
 * - page: number (optional, default: 1) - Page number
 * - limit: number (optional, default: 20) - Items per page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const selectedCompany = searchParams.get('selectedCompany') || 'default';
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: uid' },
        { status: 400 }
      );
    }

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: q (search query)' },
        { status: 400 }
      );
    }

    const searchTerm = query.trim().toLowerCase();
    console.log(`[SCENARIOS] Searching scenarios for ${uid}/${selectedCompany} with query: "${searchTerm}"`);

    const scenariosRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('scenarios');

    // Firebase doesn't support full-text search natively
    // We'll fetch all scenarios and filter in memory for flexibility
    let scenarios: any[] = [];
    
    const allScenariosSnapshot = await scenariosRef
      .orderBy('createdAt', 'desc')
      .get();

    const allScenarios = allScenariosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // Filter scenarios that match in any field
    const filteredScenarios = allScenarios.filter((scenario: any) => {
      const nameLower = scenario.nameLower || '';
      const descriptionLower = scenario.descriptionLower || '';
      const conditionLower = scenario.conditionLower || '';
      const thenActionLower = scenario.thenActionLower || '';
      const elseActionLower = scenario.elseActionLower || '';

      return (
        nameLower.includes(searchTerm) ||
        descriptionLower.includes(searchTerm) ||
        conditionLower.includes(searchTerm) ||
        thenActionLower.includes(searchTerm) ||
        (elseActionLower && elseActionLower.includes(searchTerm))
      );
    });

    // Assign match scores based on where the match was found
    const scoredScenarios = filteredScenarios.map((scenario: any) => {
      const nameLower = scenario.nameLower || '';
      const descriptionLower = scenario.descriptionLower || '';
      const conditionLower = scenario.conditionLower || '';
      const thenActionLower = scenario.thenActionLower || '';
      const elseActionLower = scenario.elseActionLower || '';

      let matchScore = 0;
      if (nameLower.includes(searchTerm)) matchScore += 3;
      if (descriptionLower.includes(searchTerm)) matchScore += 2;
      if (conditionLower.includes(searchTerm)) matchScore += 1;
      if (thenActionLower.includes(searchTerm)) matchScore += 1;
      if (elseActionLower && elseActionLower.includes(searchTerm)) matchScore += 1;

      return { ...scenario, matchScore };
    });

    // Sort by match score (highest first), then by creation date
    scenarios = scoredScenarios.sort((a: any, b: any) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // Remove matchScore from final results and lowercase fields
    scenarios = scenarios.map(({ matchScore, nameLower, descriptionLower, conditionLower, thenActionLower, elseActionLower, ...scenario }) => scenario);

    // Apply pagination
    const total = scenarios.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedScenarios = scenarios.slice(offset, offset + limit);
    const hasMore = page < totalPages;

    console.log(`[SCENARIOS] Found ${total} matching scenarios, returning ${paginatedScenarios.length} for page ${page}`);

    return NextResponse.json({
      success: true,
      scenarios: paginatedScenarios,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('[SCENARIOS] Error searching scenarios:', error || 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search scenarios',
          details: error?.message || 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}
