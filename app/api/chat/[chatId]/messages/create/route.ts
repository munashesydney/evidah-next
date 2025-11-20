import { NextRequest } from 'next/server';
import { MessageService } from '@/lib/services/message-service';
import { ChatService } from '@/lib/services/chat-service';
import {
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/middleware/auth-middleware';

/**
 * POST /api/chat/[chatId]/messages/create
 * Create a new message in a chat
 * 
 * Request body:
 * - content: string (required) - Message content
 * - role: 'user' | 'assistant' (required) - Message sender role
 * - companyId: string (required) - The company/knowledge base ID
 * - toolCalls: ToolCall[] (optional) - Array of tool calls with results
 * - metadata: object (optional) - Additional metadata
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;

    // Parse request body first to check for uid
    const body = await request.json();
    const { uid, content, role, companyId, toolCalls, metadata } = body;

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
    if (!content) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required field: content',
        400
      );
    }

    if (!role || !['user', 'assistant'].includes(role)) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Invalid or missing field: role (must be "user" or "assistant")',
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

    const chat = await ChatService.getChat(userId, companyId, chatId);
    if (!chat) {
      return createErrorResponse('NOT_FOUND', 'Chat not found', 404);
    }

    const chatMetadata = chat.metadata || {};
    const isEscalationChat = chatMetadata.escalation === true;
    const isQuestionChat = chatMetadata.type === 'question';

    let messageContent = content;
    let shouldMarkHumanAnswer = false;

    if (
      role === 'user' &&
      isEscalationChat &&
      isQuestionChat &&
      !chatMetadata.humanAnswerTagged
    ) {
      const trimmedContent = content.trim();
      if (!trimmedContent.startsWith('[HUMAN-ANSWER]')) {
        messageContent = trimmedContent
          ? `[HUMAN-ANSWER] ${trimmedContent}`
          : '[HUMAN-ANSWER]';
      } else {
        messageContent = trimmedContent;
      }
      shouldMarkHumanAnswer = true;
    }

    // Create message
    const message = await MessageService.createMessage(
      userId,
      companyId,
      chatId,
      {
        content: messageContent,
        role,
        toolCalls,
        metadata,
      }
    );

    if (shouldMarkHumanAnswer) {
      await ChatService.updateChat(userId, companyId, chatId, {
        metadata: {
          ...chatMetadata,
          humanAnswerTagged: true,
        },
      });
    }

    return createSuccessResponse(
      {
        messageId: message.id,
        message,
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating message:', error);
    
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
      'Failed to create message',
      500,
      error.message
    );
  }
}
