import { NextRequest } from 'next/server';
import { ChatService } from '@/lib/services/chat-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * POST /api/chat/create
 * Create a new chat session
 * 
 * Request body:
 * - employeeId: string (required) - The AI assistant/employee ID
 * - companyId: string (required) - The company/knowledge base ID
 * - title: string (optional) - Chat title
 * - threadId: string (optional) - OpenAI thread ID
 * - metadata: object (optional) - Additional metadata
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body first to check for uid
    const body = await request.json();
    const { uid, employeeId, companyId, title, threadId, metadata } = body;

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

    // Validate required fields
    if (!employeeId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required field: employeeId',
        400
      );
    }

    if (!companyId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required field: companyId',
        400
      );
    }

    // Create chat
    const chat = await ChatService.createChat(userId, companyId, {
      employeeId,
      title,
      threadId,
      metadata,
    });

    return createSuccessResponse(
      {
        chatId: chat.id,
        chat,
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating chat:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to create chat',
      500,
      error.message
    );
  }
}
