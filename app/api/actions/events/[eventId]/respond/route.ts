import { NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createErrorResponse } from '@/lib/middleware/auth-middleware';
import { processEmployeeChat, EmployeeProcessorMessage } from '@/lib/chat/employee-processor';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

/**
 * POST /api/actions/events/[eventId]/respond
 * Process an action event and generate AI response with autonomous loop
 * All messages are saved to the event's messages subcollection
 * 
 * Request body:
 * - uid: string (required) - User ID
 * - selectedCompany: string (required) - Company ID
 * - actionId: string (required) - Action ID
 * - actionPrompt: string (required) - The action's prompt/instructions
 * - employeeId: string (required) - The employee to handle this action
 * - triggerData: object (optional) - Data about what triggered the action
 * - conversationHistory: EmployeeProcessorMessage[] (optional) - Context messages
 * - personalityLevel: number (optional) - Personality level (0-3)
 * 
 * Response: Server-Sent Events (SSE) stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Parse request body
    const body = await request.json();
    const {
      uid,
      selectedCompany = 'default',
      actionId,
      actionPrompt,
      employeeId,
      triggerData = {},
      conversationHistory = [],
      personalityLevel = 2,
    } = body;

    // Validate required fields
    if (!uid || !actionId || !actionPrompt || !employeeId) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Missing required fields: uid, actionId, actionPrompt, or employeeId',
        400
      );
    }

    console.log(`[ACTION EVENT RESPOND] Processing event ${eventId} for action ${actionId}`);

    // Update event status to processing
    const eventRef = db
      .collection('Users')
      .doc(uid)
      .collection('knowledgebases')
      .doc(selectedCompany)
      .collection('actions')
      .doc(actionId)
      .collection('events')
      .doc(eventId);

    await eventRef.update({
      status: 'processing',
      updatedAt: new Date().toISOString(),
    });

    // Build the user message with action context
    const userMessage = `Action Triggered: ${actionPrompt}

Conversation History:
${JSON.stringify(conversationHistory, null, 2)}

Trigger Data:
${JSON.stringify(triggerData, null, 2)}

Please execute this action based on the provided context and conversation history.`;

    // Build conversation history including the action prompt
    const messages: EmployeeProcessorMessage[] = [
      { role: 'user', content: userMessage },
    ];

    // Save the initial user message (action trigger)
    const messagesRef = eventRef.collection('messages');
    await messagesRef.add({
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process the action with streaming
          // We use eventId as the "chatId" for the processor
          const result = await processEmployeeChat(messages, {
            chatId: eventId, // Use eventId as chatId
            companyId: selectedCompany,
            uid,
            employeeId,
            personalityLevel,
            maxIterations: 10,
            isActionEvent: true,
            actionId,
            onStream: (event) => {
              // Send event to client
              const data = JSON.stringify(event);
              controller.enqueue(`data: ${data}\n\n`);
            },
          });

          // Update event status
          await eventRef.update({
            status: result.success ? 'completed' : 'failed',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messagesSaved: result.messagesSaved,
            error: result.error || null,
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

          console.log(`[ACTION EVENT RESPOND] ✅ Stream complete - ${result.messagesSaved} messages saved`);
        } catch (error) {
          console.error(`[ACTION EVENT RESPOND] ❌ Stream error:`, error);

          // Update event status to failed
          await eventRef.update({
            status: 'failed',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });

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
    console.error('[ACTION EVENT RESPOND] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to process action event',
      500,
      error.message
    );
  }
}
