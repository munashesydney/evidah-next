import { NextRequest } from 'next/server';
import { MessageService } from '@/lib/services/message-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * GET /api/chat/[chatId]/messages/list
 * List messages in a chat with pagination
 * 
 * Query parameters:
 * - companyId: string (required) - The company/knowledge base ID
 * - page: number (optional, default: 1) - Page number
 * - limit: number (optional, default: 50) - Items per page
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { userId } = authResult;

    const { chatId } = await params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate required fields
    if (!companyId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required query parameter: companyId',
        400
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Page must be greater than 0',
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

    // List messages
    const result = await MessageService.listMessages(
      userId,
      companyId,
      chatId,
      page,
      limit
    );

    return createSuccessResponse({
      messages: result.messages,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error listing messages:', error);
    
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to list messages',
      500,
      error.message
    );
  }
}
