import { NextRequest } from 'next/server';
import { ChatService } from '@/lib/services/chat-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * GET /api/chat/list
 * List chats with optional filtering
 * 
 * Query parameters:
 * - uid: string (optional) - User ID (for internal calls)
 * - companyId: string (required) - Company/knowledge base ID
 * - employeeId: string (optional) - Filter by employee ID
 * - page: number (optional) - Page number (default: 1)
 * - limit: number (optional) - Items per page (default: 20)
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token> (if uid not provided)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const companyId = searchParams.get('companyId');
    const employeeId = searchParams.get('employeeId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // If uid is provided (internal call), use it; otherwise authenticate
    let userId: string;
    if (uid) {
      userId = uid;
    } else {
      const authResult = await requireAuth(request);
      if (authResult instanceof Response) {
        return authResult; // Return 401 error
      }
      userId = authResult.userId;
    }

    if (!companyId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required parameter: companyId',
        400
      );
    }

    // List chats
    const result = await ChatService.listChats(
      userId,
      companyId,
      employeeId,
      page,
      limit
    );

    return createSuccessResponse(result);
  } catch (error: any) {
    console.error('Error listing chats:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to list chats',
      500,
      error.message
    );
  }
}
