import { NextRequest } from 'next/server';
import { ChatService } from '@/lib/services/chat-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * DELETE /api/chat/[chatId]/delete
 * Delete a chat session and all its messages
 * 
 * URL parameters:
 * - chatId: string - The chat ID
 * 
 * Query parameters:
 * - companyId: string (required) - The company/knowledge base ID
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 */
export async function DELETE(
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

    // Get chatId from URL params
    const { chatId } = await params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // Validate required fields
    if (!companyId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required parameter: companyId',
        400
      );
    }

    // Delete chat
    await ChatService.deleteChat(userId, companyId, chatId);

    return createSuccessResponse({
      message: 'Chat deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting chat:', error);

    // Handle specific errors
    if (error.message === 'Chat not found') {
      return createErrorResponse(
        'NOT_FOUND',
        'Chat not found',
        404
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to delete chat',
      500,
      error.message
    );
  }
}
