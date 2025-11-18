import OpenAI from 'openai';
import { getOrCreateVectorStore } from '@/lib/services/vector-store-helper';
import { getDeveloperPrompt } from '@/config/chat/constants';
import { getTools } from '@/lib/chat/tools/tools';
import { handleTool } from '@/lib/chat/tools/tools-handling';
import { functionsMap } from '@/config/chat/functions';
import { MessageService } from '@/lib/services/message-service';

export interface EmployeeProcessorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EmployeeProcessorOptions {
  maxIterations?: number;
  temperature?: number;
  chatId: string;
  companyId: string;
  uid: string;
  employeeId?: string;
  personalityLevel?: number;
  onStream?: (event: StreamEvent) => void;
  // For action events
  isActionEvent?: boolean;
  actionId?: string;
}

export interface StreamEvent {
  type: 'message_delta' | 'tool_call_start' | 'tool_call_complete' | 'assistant_message_saved' | 'error';
  data: any;
}

export interface EmployeeProcessorResult {
  success: boolean;
  messagesSaved: number;
  error?: string;
}

/**
 * Process employee chat with autonomous loop and save messages to database
 * This runs entirely server-side and handles all message persistence
 */
export async function processEmployeeChat(
  messages: EmployeeProcessorMessage[],
  options: EmployeeProcessorOptions
): Promise<EmployeeProcessorResult> {
  const {
    maxIterations = 10,
    chatId,
    companyId,
    uid,
    employeeId,
    personalityLevel = 2,
    onStream,
    isActionEvent = false,
    actionId,
  } = options;

  console.log(`[EMPLOYEE PROCESSOR] Starting - chatId: ${chatId}, employeeId: ${employeeId}`);

  let messagesSaved = 0;

  try {
    // Get vector store for company's knowledge base
    const vectorStoreId = await getOrCreateVectorStore(uid, companyId);
    console.log(`[EMPLOYEE PROCESSOR] Vector store: ${vectorStoreId}`);

    // Build system prompt
    const systemPrompt = await getDeveloperPrompt(uid, companyId, employeeId, personalityLevel);
    console.log(`[EMPLOYEE PROCESSOR] System prompt generated for ${employeeId}`);

    // Get tools configuration
    const toolsState = {
      fileSearchEnabled: true,
      webSearchEnabled: true,
      functionsEnabled: true,
      codeInterpreterEnabled: false,
      webSearchConfig: {},
    };
    const tools = await getTools(toolsState, uid, companyId, employeeId);
    console.log(`[EMPLOYEE PROCESSOR] Generated ${tools.length} tools`);

    // Initialize OpenAI
    const openai = new OpenAI();

    // Convert messages to Responses API format
    const conversationHistory: any[] = messages.map(msg => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: msg.content,
        };
      } else {
        return {
          role: 'assistant',
          content: [{ type: 'output_text', text: msg.content }],
        };
      }
    });

    // Track tool calls across iterations until a message is generated
    const accumulatedToolCalls: any[] = [];

    // Autonomous loop - process until we get a text response (no more tool calls)
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      console.log(`[EMPLOYEE PROCESSOR] Iteration ${iteration + 1}/${maxIterations}`);

      // Call OpenAI Responses API
      const response = await openai.responses.create({
        model: 'gpt-4o',
        input: conversationHistory,
        instructions: systemPrompt,
        tools,
      });

      // Process output items
      let hasToolCalls = false;
      let assistantMessage = '';

      for (const item of response.output || []) {
        if (item.type === 'message') {
          // Extract text content
          const textContent = item.content?.find((c: any) => c.type === 'output_text');
          if (textContent && 'text' in textContent && textContent.text) {
            assistantMessage = textContent.text;
            
            // Stream the message delta
            if (onStream) {
              onStream({
                type: 'message_delta',
                data: { text: textContent.text },
              });
            }
          }
        } else if (item.type === 'file_search_call') {
          hasToolCalls = true;
          console.log(`[EMPLOYEE PROCESSOR] File search executed`);
          
          // Track tool call (accumulate across iterations)
          accumulatedToolCalls.push({
            id: item.id,
            type: 'file_search_call',
            name: null,
            arguments: null,
            parsedArguments: null,
            output: null,
            status: 'completed',
          });

          // Stream tool call start
          if (onStream) {
            onStream({
              type: 'tool_call_start',
              data: { name: 'file_search', id: item.id },
            });
          }

          // Add to conversation history
          conversationHistory.push(item);

          // Stream tool call complete
          if (onStream) {
            onStream({
              type: 'tool_call_complete',
              data: { name: 'file_search', id: item.id },
            });
          }
        } else if (item.type === 'function_call') {
          hasToolCalls = true;
          console.log(`[EMPLOYEE PROCESSOR] Function call: ${item.name}`);

          // Stream tool call start
          if (onStream) {
            onStream({
              type: 'tool_call_start',
              data: { name: item.name, id: item.id, arguments: item.arguments },
            });
          }

          // Execute the function
          const args = typeof item.arguments === 'string'
            ? JSON.parse(item.arguments)
            : item.arguments;

          // Set base URL for server-side fetch calls
          const originalFetch = global.fetch;
          global.fetch = ((url: any, options?: any) => {
            if (typeof url === 'string' && url.startsWith('/')) {
              // Convert relative URL to absolute for server-side
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              url = `${baseUrl}${url}`;
            }
            return originalFetch(url, options);
          }) as typeof fetch;

          try {
            const result = await handleTool(
              item.name as keyof typeof functionsMap,
              args,
              uid,
              companyId
            );

            console.log(`[EMPLOYEE PROCESSOR] Function ${item.name} result:`, result);

            // Track tool call with result (accumulate across iterations)
            accumulatedToolCalls.push({
              id: item.id,
              type: 'function_call',
              name: item.name,
              arguments: item.arguments,
              parsedArguments: args,
              output: JSON.stringify(result),
              status: 'completed',
            });

            // Add function call and result to conversation history
            conversationHistory.push(item);
            conversationHistory.push({
              type: 'function_call_output',
              call_id: item.call_id,
              output: JSON.stringify(result),
            });

            // Stream tool call complete
            if (onStream) {
              onStream({
                type: 'tool_call_complete',
                data: { name: item.name, id: item.id, result },
              });
            }
          } finally {
            // Restore original fetch
            global.fetch = originalFetch;
          }


        } else if (item.type === 'web_search_call') {
          hasToolCalls = true;
          console.log(`[EMPLOYEE PROCESSOR] Web search executed`);

          // Track tool call (accumulate across iterations)
          accumulatedToolCalls.push({
            id: item.id,
            type: 'web_search_call',
            name: null,
            arguments: null,
            parsedArguments: null,
            output: null,
            status: 'completed',
          });

          // Stream tool call
          if (onStream) {
            onStream({
              type: 'tool_call_start',
              data: { name: 'web_search', id: item.id },
            });
          }

          conversationHistory.push(item);

          if (onStream) {
            onStream({
              type: 'tool_call_complete',
              data: { name: 'web_search', id: item.id },
            });
          }
        }
      }

      // If we have an assistant message, save it to the database with ALL accumulated tool calls
      if (assistantMessage) {
        console.log(`[EMPLOYEE PROCESSOR] Saving assistant message with ${accumulatedToolCalls.length} accumulated tool calls`);
        console.log(`[EMPLOYEE PROCESSOR] Tool calls:`, accumulatedToolCalls.map(tc => tc.name || tc.type));

        try {
          // Save to action event or regular chat based on context
          if (isActionEvent && actionId) {
            await MessageService.createActionEventMessage(uid, companyId, actionId, chatId, {
              content: assistantMessage,
              role: 'assistant',
              toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
            });
          } else {
            await MessageService.createMessage(uid, companyId, chatId, {
              content: assistantMessage,
              role: 'assistant',
              toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
            });
          }

          messagesSaved++;
          console.log(`[EMPLOYEE PROCESSOR] ✅ Message saved (${messagesSaved} total)`);

          // Stream save confirmation
          if (onStream) {
            onStream({
              type: 'assistant_message_saved',
              data: { messageNumber: messagesSaved },
            });
          }

          // Reset accumulated tool calls for the next message
          accumulatedToolCalls.length = 0;
          console.log(`[EMPLOYEE PROCESSOR] Reset accumulated tool calls for next message`);
        } catch (error) {
          console.error(`[EMPLOYEE PROCESSOR] ❌ Failed to save message:`, error);
          throw error;
        }
      }

      // If no tool calls were made, we're done
      if (!hasToolCalls) {
        console.log(`[EMPLOYEE PROCESSOR] No more tool calls, processing complete`);
        break;
      }

      // Continue loop for next iteration
      console.log(`[EMPLOYEE PROCESSOR] Tool calls executed, continuing to next iteration`);
    }

    console.log(`[EMPLOYEE PROCESSOR] ✅ Complete - saved ${messagesSaved} messages`);

    return {
      success: true,
      messagesSaved,
    };
  } catch (error) {
    console.error(`[EMPLOYEE PROCESSOR] ❌ Error:`, error);

    if (onStream) {
      onStream({
        type: 'error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }

    return {
      success: false,
      messagesSaved,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
