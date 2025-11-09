import { NextRequest } from 'next/server';
import { ChatService } from '@/lib/services/chat-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * GET /api/chat/list
 * List chat sessions with pagination and filtering
 * 
 * Query parameters:
 * - companyId: string (required) - The company/knowledge base ID
 * - employeeId: string (optional) - Filter by AI assistant/employee ID
 * - page: number (optional, default: 1) - Page number
 * - limit: number (optional, default: 20) - Items per page
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { userId } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const employeeId = searchParams.get('employeeId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate required fields
    if (!companyId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required parameter: companyId',
        400
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Page number must be greater than 0',
        400
      );
    }

    if (limit < 1 || limit > 100) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Limit must be between 1 and 100',
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

    return createSuccessResponse({
      chats: result.chats,
      pagination: result.pagination,
    });
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
