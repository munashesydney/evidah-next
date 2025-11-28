import OpenAI from 'openai';
import { getOrCreateVectorStore } from '@/lib/services/vector-store-helper';
import { getDeveloperPrompt } from '@/config/chat/constants';
import { getTools } from '@/lib/chat/tools/tools';
import { handleTool } from '@/lib/chat/tools/tools-handling';
import { functionsMap } from '@/config/chat/functions';
import { MessageService } from '@/lib/services/message-service';
import { ToolsState } from '@/stores/chat/useToolsStore';

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
  toolsState?: ToolsState;
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

const MODEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-5-mini-2025-08-07';

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
    toolsState: providedToolsState,
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
    const systemPrompt = await getDeveloperPrompt(uid, companyId, employeeId, personalityLevel, isActionEvent);
    console.log(`[EMPLOYEE PROCESSOR] System prompt generated for ${employeeId}, isActionEvent: ${isActionEvent}`);

    // Get tools configuration - use provided toolsState or default to all enabled
    const toolsState: ToolsState = providedToolsState || {
      fileSearchEnabled: true,
      webSearchEnabled: true,
      functionsEnabled: true,
      codeInterpreterEnabled: true,
      webSearchConfig: {},
    };
    console.log(`[EMPLOYEE PROCESSOR] Tools configuration:`, toolsState);
    const tools = await getTools(toolsState, uid, companyId, employeeId, isActionEvent);
    console.log(`[EMPLOYEE PROCESSOR] Generated ${tools.length} tools`);

    // Initialize OpenAI
    const openai = new OpenAI();

    const sanitizeConversationItem = (item: any): any => {
      if (item === null || item === undefined) {
        return item;
      }

      if (Array.isArray(item)) {
        return item.map(sanitizeConversationItem);
      }

      if (typeof item !== 'object') {
        return item;
      }

      const disallowedKeys = new Set([
        'parsedArguments',
        'parsed_arguments',
        'toolCalls',
      ]);

      const sanitized: Record<string, any> = {};

      for (const [key, value] of Object.entries(item)) {
        if (disallowedKeys.has(key)) {
          continue;
        }
        sanitized[key] = sanitizeConversationItem(value);
      }

      return sanitized;
    };

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

      const sanitizedConversationHistory = conversationHistory.map(sanitizeConversationItem);

      // Call OpenAI Responses API with streaming enabled
      const stream: any = await openai.responses.stream({
        model: MODEL,
        input: sanitizedConversationHistory,
        instructions: systemPrompt,
        tools,
      });

      let streamedAssistantText = '';
      const streamingToolCalls = new Set<string>();

      try {
        for await (const event of stream as any) {
          if (event.type === 'response.output_text.delta') {
            const deltaText = event.delta || '';
            streamedAssistantText += deltaText;

            if (onStream && deltaText) {
              onStream({
                type: 'message_delta',
                data: { delta: deltaText, text: streamedAssistantText },
              });
            }
          } else if (event.type === 'response.output_item.added') {
            const streamedItem = event.item;
            if (!streamedItem) {
              continue;
            }

            if (
              streamedItem.type === 'function_call' ||
              streamedItem.type === 'file_search_call' ||
              streamedItem.type === 'web_search_call'
            ) {
              streamingToolCalls.add(streamedItem.id);
              if (onStream) {
                onStream({
                  type: 'tool_call_start',
                  data: {
                    name: streamedItem.name || streamedItem.type,
                    id: streamedItem.id,
                    arguments: streamedItem.arguments,
                    toolType: streamedItem.type,
                  },
                });
              }
            }
          } else if (event.type === 'response.error') {
            throw new Error(event.error?.message || 'OpenAI streaming error');
          }
        }
      } catch (streamError) {
        console.error('[EMPLOYEE PROCESSOR] Stream processing error:', streamError);
        throw streamError;
      }

      const response = await stream.finalResponse();

      // Process output items from final response
      let hasToolCalls = false;
      let hasFileSearch = false;
      let hasWebSearch = false;
      let assistantMessage = '';

      for (const item of response.output || []) {
        if (item.type === 'message') {
          // Extract text content
          const textContent = item.content?.find((c: any) => c.type === 'output_text');
          if (textContent && 'text' in textContent && textContent.text) {
            const finalText = streamedAssistantText || textContent.text;
            assistantMessage = finalText;

            // Fallback streaming event if no deltas were sent
            if (!streamedAssistantText && onStream) {
              onStream({
                type: 'message_delta',
                data: { text: finalText },
              });
            }
          }
        } else if (item.type === 'file_search_call') {
          // Built-in tools like file_search are handled internally by OpenAI
          // Do NOT push them into conversationHistory - they don't need to be replayed
          hasFileSearch = true;
          console.log(`[EMPLOYEE PROCESSOR] File search executed`);
          
          // Track tool call (accumulate across iterations) for analytics only
          accumulatedToolCalls.push({
            id: item.id,
            type: 'file_search_call',
            name: null,
            arguments: null,
            parsedArguments: null,
            output: null,
            status: 'completed',
          });

          // Stream tool call start (fallback if streaming event wasn't received)
          if (onStream && !streamingToolCalls.has(item.id)) {
            streamingToolCalls.add(item.id);
            onStream({
              type: 'tool_call_start',
              data: { name: 'file_search', id: item.id, toolType: 'file_search_call' },
            });
          }

          // DO NOT add to conversationHistory - built-in tools are handled internally

          // Stream tool call complete
          if (onStream && streamingToolCalls.has(item.id)) {
            onStream({
              type: 'tool_call_complete',
              data: { name: 'file_search', id: item.id, toolType: 'file_search_call' },
            });
            streamingToolCalls.delete(item.id);
          }
        } else if (item.type === 'function_call') {
          hasToolCalls = true;
          console.log(`[EMPLOYEE PROCESSOR] Function call: ${item.name}`);

          // Stream tool call start (fallback if streaming event wasn't received)
          if (onStream && !streamingToolCalls.has(item.id)) {
            streamingToolCalls.add(item.id);
            onStream({
              type: 'tool_call_start',
              data: { name: item.name, id: item.id, arguments: item.arguments, toolType: 'function_call' },
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
              // Use NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_APP_URL, VERCEL_URL, or fallback to localhost
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                             process.env.NEXT_PUBLIC_APP_URL || 
                             (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
              url = `${baseUrl}${url}`;
              console.log(`[EMPLOYEE PROCESSOR] Converted relative URL to: ${url}`);
            }
            return originalFetch(url, options);
          }) as typeof fetch;

          try {
          if (item.name === 'save_answered_question') {
            args.chat_id = chatId;
          }

          // Inject employeeId for tools that need it (like escalate_to_human)
          if (item.name === 'escalate_to_human' && employeeId) {
            args.employeeId = employeeId;
          }

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

            // ✅ RE-ENABLE: add the function_call itself to the history
            // The API requires both function_call and function_call_output to be present
            conversationHistory.push(sanitizeConversationItem(item));

            // ✅ Keep output as a separate item linked via call_id
            conversationHistory.push(sanitizeConversationItem({
              type: 'function_call_output',
              call_id: item.call_id,
              output: JSON.stringify(result),
              id: `${item.id}_output`,
            }));

            // Stream tool call complete
            if (onStream && streamingToolCalls.has(item.id)) {
              onStream({
                type: 'tool_call_complete',
                data: { name: item.name, id: item.id, result, toolType: 'function_call' },
              });
              streamingToolCalls.delete(item.id);
            }
          } finally {
            // Restore original fetch
            global.fetch = originalFetch;
          }


        } else if (item.type === 'web_search_call') {
          // Built-in tools like web_search are handled internally by OpenAI
          // Do NOT push them into conversationHistory - they don't need to be replayed
          hasWebSearch = true;
          console.log(`[EMPLOYEE PROCESSOR] Web search executed`);

          // Track tool call (accumulate across iterations) for analytics only
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
          if (onStream && !streamingToolCalls.has(item.id)) {
            streamingToolCalls.add(item.id);
            onStream({
              type: 'tool_call_start',
              data: { name: 'web_search', id: item.id, toolType: 'web_search_call' },
            });
          }

          // DO NOT add to conversationHistory - built-in tools are handled internally

          if (onStream && streamingToolCalls.has(item.id)) {
            onStream({
              type: 'tool_call_complete',
              data: { name: 'web_search', id: item.id, toolType: 'web_search_call' },
            });
            streamingToolCalls.delete(item.id);
          }
        } else if (item.type === 'reasoning') {
          // ✅ DO keep reasoning so any function_call items you replay still
          // have the reasoning trace the API expects
          conversationHistory.push(sanitizeConversationItem(item));
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

        // If we got a message, the AI is done responding (tool calls in this iteration are already incorporated)
        console.log(`[EMPLOYEE PROCESSOR] Message received, processing complete`);
        break;
      }

      // If we had function calls, continue the loop to get the AI's response after executing them
      if (hasToolCalls) {
        console.log(`[EMPLOYEE PROCESSOR] Function calls executed without message, continuing to next iteration`);
        continue;
      }

      // If we had built-in tool calls (file_search/web_search) but no message, continue once
      // Built-in tools are handled internally, but may need another iteration to generate response
      if (hasFileSearch || hasWebSearch) {
        console.log(`[EMPLOYEE PROCESSOR] Built-in tool calls executed without message, continuing to next iteration`);
        continue;
      }

      // If we get here with no message and no tool calls, we're done
      console.log(`[EMPLOYEE PROCESSOR] No message or tool calls, processing complete`);
      break;
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
