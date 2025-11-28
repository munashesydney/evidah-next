/**
 * Tools available to public-facing AI assistants (Marquavious and Charlie)
 * These tools help customer-facing agents handle queries and escalate when needed
 */

export const publicAssistantTools = [
  {
    name: "escalate_to_human",
    description: "Escalate the conversation to a human agent. Use this when you are not 100% certain about an answer, cannot find the information needed, or when the customer's query is complex and requires human judgment. Honesty is critical - always escalate rather than guess.",
    parameters: {
      reason: {
        type: "string",
        description: "Brief explanation of why escalation is needed (e.g., 'Unable to find specific pricing information', 'Complex technical issue requiring human expertise', 'Customer requesting refund policy clarification')",
      },
      urgency: {
        type: "string",
        description: "Urgency level of the escalation",
        enum: ["low", "medium", "high"],
      },
      summary: {
        type: "string",
        description: "Brief summary of the customer's issue or question for the human agent (optional)",
      },
      ticket_id: {
        type: "string",
        description: "Ticket ID if this escalation is related to a support ticket (optional)",
      },
      session_id: {
        type: "string",
        description: "Session ID if this escalation is from a live chat session (optional)",
      },
    },
  },
];

/**
 * Execute a tool call for public assistant
 * @param toolName - Name of the tool to execute
 * @param args - Arguments for the tool
 * @returns Tool execution result
 */
export async function executePublicAssistantTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ success: boolean; message?: string; data?: any }> {
  switch (toolName) {
    case "escalate_to_human":
      return handleEscalateToHuman(args);
    
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}

/**
 * Handle escalation to human agent
 * Creates a question chat with Sung Wen and notifies the user via email
 */
async function handleEscalateToHuman(args: Record<string, any>): Promise<{ success: boolean; message: string; data: any }> {
  const reason = args.reason as string;
  const urgency = (args.urgency as "low" | "medium" | "high") || "medium";
  const summary = args.summary as string | undefined;
  const ticketId = args.ticket_id as string | undefined;
  const sessionId = args.session_id as string | undefined;
  const uid = args.uid as string;
  const companyId = args.companyId as string;
  const conversationContext = args.conversationContext as string | undefined;
  const employeeId = args.employeeId as string | undefined; // Get employee ID from context

  // Build enhanced summary with ticket_id and session_id if available
  let enhancedSummary = summary || '';
  if (ticketId || sessionId) {
    const additionalInfo: string[] = [];
    if (ticketId) {
      additionalInfo.push(`Ticket ID: ${ticketId}`);
    }
    if (sessionId) {
      additionalInfo.push(`Session ID: ${sessionId}`);
    }
    if (enhancedSummary) {
      enhancedSummary += `\n\n**Reference Information:**\n${additionalInfo.join('\n')}`;
    } else {
      enhancedSummary = `**Reference Information:**\n${additionalInfo.join('\n')}`;
    }
  }

  console.log("[ESCALATION] Customer conversation escalated to human agent", {
    reason,
    urgency,
    summary,
    ticket_id: ticketId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
  });

  if (!uid || !companyId) {
    console.error("[ESCALATION] Missing uid or companyId");
    return {
      success: false,
      message: "Unable to escalate: missing user or company information",
      data: { escalated: false },
    };
  }

  try {
    // Import services directly for server-side execution
    const { ChatService } = await import('@/lib/services/chat-service');
    const { MessageService } = await import('@/lib/services/message-service');

    // Create a question chat with Sung Wen
    const chat = await ChatService.createChat(uid, companyId, {
      employeeId: 'sung-wen',
      title: `Question: ${reason.substring(0, 50)}...`,
      metadata: {
        type: 'question',
        escalation: true,
        reason,
        urgency,
        summary: enhancedSummary,
        createdAt: new Date().toISOString(),
      },
    });

    const chatId = chat.id;

    // Add a simple "Hello" user message first to start the conversation properly
    // This ensures the chat doesn't start with an assistant message
    await MessageService.createMessage(uid, companyId, chatId, {
      content: 'Hello',
      role: 'user',
    });

    // Add the question message from the assistant
    // This comes from the assistant side since it's the AI asking the question
    const questionMessage = `I need your help with a customer question. I'm not 100% certain about the answer and want to make sure I provide accurate information.

**Reason for Escalation:** ${reason}

**Urgency:** ${urgency.toUpperCase()}

${enhancedSummary ? `**Summary:**\n${enhancedSummary}\n\n` : ''}${conversationContext ? `**Conversation Context:**\n${conversationContext}\n\n` : ''}Could you please provide guidance on how I should respond to this?`;

    await MessageService.createMessage(uid, companyId, chatId, {
      content: questionMessage,
      role: 'assistant',
    });

    // Send email notification using fetch
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    console.log(`[ESCALATION] Sending email notification to ${baseUrl}/api/notify/question`);
    
    try {
      const emailResponse = await fetch(`${baseUrl}/api/notify/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          companyId,
          chatId,
          reason,
          urgency,
          summary: enhancedSummary,
          employeeId, // Pass employee ID to email notification
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("[ESCALATION] Email notification failed:", errorData);
      } else {
        console.log("[ESCALATION] Email notification sent successfully");
      }
    } catch (emailError) {
      console.error("[ESCALATION] Failed to send email notification:", emailError);
      // Don't fail the escalation if email fails
    }

    console.log(`[ESCALATION] Question chat created: ${chatId}`);

    return {
      success: true,
      message: "Question escalated successfully. Sung Wen has been notified and will review your question.",
      data: {
        escalated: true,
        chatId,
        reason,
        urgency,
        summary: enhancedSummary,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[ESCALATION] Error creating question:", error);
    return {
      success: false,
      message: "Failed to escalate question. Please try again.",
      data: {
        escalated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
