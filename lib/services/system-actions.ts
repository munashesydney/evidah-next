/**
 * System Actions - Predefined actions that are recommended for all users
 * These actions provide essential automation for common workflows
 */

export interface SystemAction {
  id: string;
  trigger: string;
  employee: string;
  prompt: string;
  name: string;
  description: string;
}

export const SYSTEM_ACTIONS: SystemAction[] = [
  {
    id: 'system_new_ticket_draft',
    trigger: 'new_ticket',
    employee: 'charlie',
    name: 'Auto-Draft Email for New Tickets',
    description: 'Automatically creates a draft email response when a new ticket is created',
    prompt: `A new support ticket has been created. Your task is to create a draft email response.

CRITICAL INSTRUCTIONS:
1. **Search the knowledge base first** - Use file_search to find relevant information about the customer's issue
2. **If you don't know the answer** - IMMEDIATELY escalate to a human using the escalate_to_human function. Never guess or provide uncertain information.
3. **Keep responses brief** - Customers prefer concise, helpful responses (2-4 sentences when possible)
4. **Be warm and professional** - Use a friendly but professional tone
5. **Provide actionable next steps** - Always tell the customer what to do next

WORKFLOW:
1. Review the ticket details and customer message
2. Search your knowledge base for relevant information
3. If you find the answer: Create a brief, helpful draft email
4. If you're uncertain: Escalate to a human immediately with the escalate_to_human function

Remember: It's better to escalate than to provide incorrect information. Your honesty helps improve the system.`,
  },
  {
    id: 'system_ticket_reply_draft',
    trigger: 'ticket_reply',
    employee: 'charlie',
    name: 'Auto-Draft Email for Ticket Replies',
    description: 'Automatically creates a draft email response when a customer replies to a ticket',
    prompt: `A customer has replied to an existing support ticket. Your task is to create a draft email response.

CRITICAL INSTRUCTIONS:
1. **Review the conversation history** - Understand the full context of the ticket
2. **Search the knowledge base** - Use file_search to find relevant information
3. **If you don't know the answer** - IMMEDIATELY escalate to a human using the escalate_to_human function
4. **Keep responses brief** - Customers prefer concise, helpful responses (2-4 sentences when possible)
5. **Be warm and professional** - Maintain a friendly but professional tone
6. **Provide actionable next steps** - Always tell the customer what to do next

WORKFLOW:
1. Read the entire ticket conversation to understand context
2. Identify what the customer is asking or reporting
3. Search your knowledge base for relevant information
4. If you find the answer: Create a brief, helpful draft email
5. If you're uncertain: Escalate to a human immediately with the escalate_to_human function

Remember: Honesty is required. If you're not 100% certain, escalate. This helps improve the system and ensures customers get accurate information.`,
  },
  {
    id: 'system_question_answered_response',
    trigger: 'question_answered',
    employee: 'charlie',
    name: 'Auto-Respond to Answered Questions',
    description: 'Automatically responds to tickets when a related question is answered by a human',
    prompt: `A question has been answered by a human team member, and there's a related support ticket waiting for this answer.

CRITICAL INSTRUCTIONS:
1. **Review the answered question** - Understand what was asked and how it was answered
2. **Review the ticket** - Understand the customer's original issue
3. **Create a response immediately** - No need to ask for confirmation, just respond
4. **Keep it brief** - Customers prefer concise responses (2-4 sentences when possible)
5. **Be warm and professional** - Use a friendly but professional tone
6. **Provide the answer clearly** - Make sure the customer understands the solution

WORKFLOW:
1. Read the question that was answered
2. Read the human-provided answer
3. Review the customer's ticket to understand their context
4. Craft a brief, helpful response that answers their question
5. Send the response immediately (no confirmation needed)

RESPONSE STYLE:
- Start with a brief acknowledgment: "Thanks for reaching out!"
- Provide the answer clearly and concisely
- Include any relevant next steps
- Keep it friendly and professional
- Aim for 2-4 sentences when possible

Remember: You have the authoritative answer from a human, so respond confidently and helpfully. No need to escalate or ask for confirmation.`,
  },
];

/**
 * Check if a user has all system actions installed
 */
export function getMissingSystemActions(userActions: Array<{ trigger: string; employee: string; prompt: string }>): SystemAction[] {
  return SYSTEM_ACTIONS.filter((systemAction) => {
    // Check if user has an action with the same trigger and employee
    const hasAction = userActions.some(
      (userAction) =>
        userAction.trigger === systemAction.trigger &&
        userAction.employee === systemAction.employee &&
        // Check if the prompt is similar (contains key parts of system prompt)
        userAction.prompt.includes('CRITICAL INSTRUCTIONS')
    );
    return !hasAction;
  });
}

/**
 * Check if an action is a system action
 */
export function isSystemAction(action: { trigger: string; employee: string; prompt: string }): boolean {
  return SYSTEM_ACTIONS.some(
    (systemAction) =>
      systemAction.trigger === action.trigger &&
      systemAction.employee === action.employee &&
      action.prompt.includes('CRITICAL INSTRUCTIONS')
  );
}
