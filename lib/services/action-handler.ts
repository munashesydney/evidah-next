/**
 * Action Handler Service
 * Handles triggering and processing of automated actions
 */

export interface TriggerActionOptions {
  uid: string;
  selectedCompany: string;
  actionId: string;
  actionPrompt: string;
  employeeId: string;
  triggerData: any;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  personalityLevel?: number;
}

export interface ActionEvent {
  id: string;
  actionId: string;
  triggerData: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  messagesSaved?: number;
  error?: string | null;
}

/**
 * Create an event for an action
 */
export async function createActionEvent(
  uid: string,
  selectedCompany: string,
  actionId: string,
  triggerData: any
): Promise<ActionEvent | null> {
  try {
    const response = await fetch('/api/actions/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        selectedCompany,
        actionId,
        triggerData,
        status: 'pending',
      }),
    });

    const data = await response.json();

    if (data.success) {
      return data.event;
    }
    return null;
  } catch (error) {
    console.error('Error creating action event:', error);
    return null;
  }
}

/**
 * Trigger an action and process it with AI
 * This creates an event and then processes it with the AI employee
 */
export async function triggerAction(options: TriggerActionOptions): Promise<boolean> {
  const {
    uid,
    selectedCompany,
    actionId,
    actionPrompt,
    employeeId,
    triggerData,
    conversationHistory = [],
    personalityLevel = 2,
  } = options;

  try {
    // Step 1: Create the event
    const event = await createActionEvent(uid, selectedCompany, actionId, triggerData);
    
    if (!event) {
      console.error('Failed to create action event');
      return false;
    }

    console.log(`[ACTION HANDLER] Created event ${event.id} for action ${actionId}`);

    // Step 2: Process the event with AI (using SSE)
    const response = await fetch(`/api/actions/events/${event.id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        selectedCompany,
        actionId,
        actionPrompt,
        employeeId,
        triggerData,
        conversationHistory,
        personalityLevel,
      }),
    });

    if (!response.ok) {
      console.error('Failed to process action event');
      return false;
    }

    // Process the SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      console.error('No reader available');
      return false;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'done') {
            console.log(`[ACTION HANDLER] Event ${event.id} completed:`, data.data);
            return data.data.success;
          } else if (data.type === 'error') {
            console.error(`[ACTION HANDLER] Event ${event.id} error:`, data.data.error);
            return false;
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error triggering action:', error);
    return false;
  }
}

/**
 * Get all events for an action
 */
export async function getActionEvents(
  uid: string,
  selectedCompany: string,
  actionId: string
): Promise<ActionEvent[]> {
  try {
    const params = new URLSearchParams({ uid, selectedCompany, actionId });
    const response = await fetch(`/api/actions/events?${params}`);
    const data = await response.json();

    if (data.success) {
      return data.events;
    }
    return [];
  } catch (error) {
    console.error('Error fetching action events:', error);
    return [];
  }
}

/**
 * Get messages for a specific event
 */
export async function getEventMessages(
  uid: string,
  selectedCompany: string,
  actionId: string,
  eventId: string
): Promise<any[]> {
  try {
    const params = new URLSearchParams({ uid, selectedCompany, actionId });
    const response = await fetch(`/api/actions/events/${eventId}/messages?${params}`);
    const data = await response.json();

    if (data.success) {
      return data.messages;
    }
    return [];
  } catch (error) {
    console.error('Error fetching event messages:', error);
    return [];
  }
}
