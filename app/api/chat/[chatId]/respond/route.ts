import { NextRequest } from 'next/server';
import { MessageService } from '@/lib/services/message-service';
import {
  requireAuth,
  createErrorResponse,
} from '@/lib/middleware/auth-middleware';
import { processEmployeeChat, EmployeeProcessorMessage } from '@/lib/chat/employee-processor';

/**
 * POST /api/chat/[chatId]/respond
 * Process a user message and generate AI response with autonomous loop
 * All messages are saved server-side
 * 
 * Request body:
 * - message: string (required) - User message content
 * - companyId: string (required) - The company/knowledge base ID
 * - employeeId: string (optional) - The employee ID
 * - personalityLevel: number (optional) - Personality level (0-3)
 * - conversationHistory: EmployeeProcessorMessage[] (optional) - Previous messages for context
 * 
 * Headers:
 * - Authorization: Bearer <firebase-token>
 * 
 * Response: Server-Sent Events (SSE) stream
 */
export async function POST(
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

    // Parse request body
    const body = await request.json();
    const {
      message,
      companyId,
      employeeId,
      personalityLevel = 2,
      conversationHistory = [],
    } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing or invalid field: message',
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

    console.log(`[CHAT RESPOND] Processing message for chatId: ${chatId}, employeeId: ${employeeId}`);
    console.log(`[CHAT RESPOND] === RECEIVED CONVERSATION HISTORY ===`);
    console.log(`[CHAT RESPOND] Total messages in history: ${conversationHistory.length}`);
    conversationHistory.forEach((msg: any, index: number) => {
      console.log(`[CHAT RESPOND]   [${index + 1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
    console.log(`[CHAT RESPOND] New user message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    // Save user message to database
    try {
      await MessageService.createMessage(userId, companyId, chatId, {
        content: message,
        role: 'user',
      });
      console.log(`[CHAT RESPOND] ✅ User message saved`);
    } catch (error) {
      console.error(`[CHAT RESPOND] ❌ Failed to save user message:`, error);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to save user message',
        500
      );
    }

    // Build conversation history including the new user message
    const messages: EmployeeProcessorMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    console.log(`[CHAT RESPOND] === FINAL MESSAGE THREAD FOR AI ===`);
    console.log(`[CHAT RESPOND] Total messages being sent to AI: ${messages.length}`);
    messages.forEach((msg, index) => {
      console.log(`[CHAT RESPOND]   [${index + 1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process the chat with streaming
          const result = await processEmployeeChat(messages, {
            chatId,
            companyId,
            uid: userId,
            employeeId,
            personalityLevel,
            maxIterations: 10,
            onStream: (event) => {
              // Send event to client
              const data = JSON.stringify(event);
              controller.enqueue(`data: ${data}\n\n`);
            },
          });

          // Send completion event
          const completionData = JSON.stringify({
            type: 'done',
            data: {
              success: result.success,
              messagesSaved: result.messagesSaved,
              error: result.error,
            },
          });
          controller.enqueue(`data: ${completionData}\n\n`);

          // Close the stream
          controller.close();

          console.log(`[CHAT RESPOND] ✅ Stream complete - ${result.messagesSaved} messages saved`);
        } catch (error) {
          console.error(`[CHAT RESPOND] ❌ Stream error:`, error);

          // Send error event
          const errorData = JSON.stringify({
            type: 'error',
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          controller.enqueue(`data: ${errorData}\n\n`);

          controller.close();
        }
      },
    });

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[CHAT RESPOND] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to process message',
      500,
      error.message
    );
  }
}
