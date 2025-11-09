import { NextRequest } from 'next/server';
import { ChatService } from '@/lib/services/chat-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * PATCH /api/chat/[chatId]/update
 * Update chat metadata (title, etc.)
 * 
 * URL parameters:
 * - chatId: string - The chat ID
 * 
 * Query parameters:
 * - companyId: string (required) - The company/knowledge base ID
 * 
 * Request body:
 * - title: string (optional) - Updated chat title
 * - metadata: object (optional) - Updated metadata
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json();
    const { title, metadata } = body;

    // Validate that at least one field is provided
    if (!title && !metadata) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'At least one field (title or metadata) must be provided',
        400
      );
    }

    // Prepare updates
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (metadata !== undefined) updates.metadata = metadata;

    // Update chat
    const chat = await ChatService.updateChat(userId, companyId, chatId, updates);

    return createSuccessResponse({
      chat,
    });
  } catch (error: any) {
    console.error('Error updating chat:', error);

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
      'Failed to update chat',
      500,
      error.message
    );
  }
}
