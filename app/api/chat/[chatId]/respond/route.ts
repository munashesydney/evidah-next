import { NextRequest, NextResponse } from 'next/server';
import { MessageService } from '@/lib/services/message-service';
import { ChatService } from '@/lib/services/chat-service';
import { JobQueueService } from '@/lib/services/job-queue-service';
import {
  requireAuth,
  createErrorResponse,
} from '@/lib/middleware/auth-middleware';
import { EmployeeProcessorMessage } from '@/lib/chat/employee-processor';
import { ToolsState } from '@/stores/chat/useToolsStore';

/**
 * POST /api/chat/[chatId]/respond
 * Enqueue a chat processing job for background processing
 * The autonomous loop will continue even if the user closes their browser tab
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
 * Response: JSON with jobId and status
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
      toolsState,
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

    console.log(`[CHAT RESPOND] Enqueueing job for chatId: ${chatId}, employeeId: ${employeeId}`);
    console.log(`[CHAT RESPOND] === RECEIVED CONVERSATION HISTORY ===`);
    console.log(`[CHAT RESPOND] Total messages in history: ${conversationHistory.length}`);
    conversationHistory.forEach((msg: any, index: number) => {
      console.log(`[CHAT RESPOND]   [${index + 1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
    console.log(`[CHAT RESPOND] New user message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    const chat = await ChatService.getChat(userId, companyId, chatId);
    if (!chat) {
      return createErrorResponse('NOT_FOUND', 'Chat not found', 404);
    }

    const chatMetadata = chat.metadata || {};
    const isEscalationChat = chatMetadata.escalation === true;
    const isQuestionChat = chatMetadata.type === 'question';

    let messageContent = message;
    let shouldMarkHumanAnswer = false;

    if (
      isEscalationChat &&
      isQuestionChat &&
      !chatMetadata.humanAnswerTagged
    ) {
      const trimmedContent = message.trim();
      if (!trimmedContent.startsWith('[HUMAN-ANSWER]')) {
        messageContent = trimmedContent
          ? `[HUMAN-ANSWER] ${trimmedContent}`
          : '[HUMAN-ANSWER]';
      } else {
        messageContent = trimmedContent;
      }
      shouldMarkHumanAnswer = true;
    }

    // Save user message to database
    try {
      await MessageService.createMessage(userId, companyId, chatId, {
        content: messageContent,
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

    if (shouldMarkHumanAnswer) {
      await ChatService.updateChat(userId, companyId, chatId, {
        metadata: {
          ...chatMetadata,
          humanAnswerTagged: true,
        },
      });
    }

    // Build conversation history including the new user message
    const messages: EmployeeProcessorMessage[] = [
      ...conversationHistory,
      { role: 'user', content: messageContent },
    ];

    console.log(`[CHAT RESPOND] === FINAL MESSAGE THREAD FOR AI ===`);
    console.log(`[CHAT RESPOND] Total messages being sent to AI: ${messages.length}`);
    messages.forEach((msg, index) => {
      console.log(`[CHAT RESPOND]   [${index + 1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });

    // Enqueue job for background processing
    try {
      const job = await JobQueueService.enqueue({
        chatId,
        companyId,
        userId,
        employeeId,
        messages,
        personalityLevel,
        toolsState: toolsState as ToolsState | undefined,
      });

      console.log(`[CHAT RESPOND] ✅ Job enqueued: ${job.id}`);

      // Trigger worker immediately for instant processing (fire-and-forget)
      // The cron job will also run as a backup to catch any missed jobs
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     process.env.NEXT_PUBLIC_APP_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const workerUrl = `${baseUrl}/api/workers/chat-processor`;
      
      // Fire and forget - don't wait for response
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          userId,
          companyId,
        }),
      }).catch((err) => {
        // Silently fail - cron will pick it up as backup
        console.warn(`[CHAT RESPOND] Failed to trigger worker immediately (cron will handle it):`, err.message);
      });

      console.log(`[CHAT RESPOND] 🚀 Worker triggered immediately for job: ${job.id}`);

      return NextResponse.json({
        jobId: job.id,
        status: 'queued',
        chatId,
        message: 'Job enqueued and processing started',
      });
    } catch (error) {
      console.error(`[CHAT RESPOND] ❌ Failed to enqueue job:`, error);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to enqueue job',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
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
