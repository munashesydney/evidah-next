import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createErrorResponse } from '@/lib/middleware/auth-middleware';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * GET /api/chat/[chatId]/active-job
 * Check if there's an active job (pending or processing) for this chat
 * 
 * Query params:
 * - companyId: string (required)
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 * 
 * Response: JSON with active job info or null
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userId } = authResult;

    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return createErrorResponse('INVALID_REQUEST', 'Missing companyId', 400);
    }

    // Query for active jobs (pending or processing)
    const jobsRef = collection(
      db,
      `Users/${userId}/knowledgebases/${companyId}/chatJobs`
    );

    const q = query(
      jobsRef,
      where('chatId', '==', chatId),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ activeJob: null });
    }

    const jobDoc = snapshot.docs[0];
    const jobData = jobDoc.data();

    return NextResponse.json({
      activeJob: {
        id: jobDoc.id,
        status: jobData.status,
        chatId: jobData.chatId,
        createdAt: jobData.createdAt?.toMillis(),
        startedAt: jobData.startedAt?.toMillis(),
      },
    });
  } catch (error: any) {
    console.error('[ACTIVE JOB CHECK] Error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to check for active job',
      500,
      error.message
    );
  }
}
