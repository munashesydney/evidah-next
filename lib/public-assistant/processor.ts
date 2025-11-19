import OpenAI from 'openai';
import { getOrCreateVectorStore } from '@/lib/services/vector-store-helper';
import { getEmployeeSystemPrompt, EmployeeType } from './prompts';
import { publicAssistantTools } from './tools';

export interface ProcessorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProcessorContext {
  customerName?: string;
  customerEmail?: string;
  ticketId?: string;
  sessionId?: string;
  previousInteractions?: number;
}

export interface ProcessorOptions {
  maxSearchIterations?: number;
  temperature?: number;
  includeMetadata?: boolean;
}

export interface ProcessorResult {
  response: string;
  metadata?: {
    searchIterations: number;
    processingTimeMs: number;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}


const MODEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-5-mini-2025-08-07';

/**
 * Process messages with autonomous file search loop using Responses API
 */
export async function processEmployeeResponse(
  employee: EmployeeType,
  messages: ProcessorMessage[],
  companyId: string,
  uid: string,
  context?: ProcessorContext,
  options: ProcessorOptions = {}
): Promise<ProcessorResult> {
  const startTime = Date.now();
  const maxIterations = options.maxSearchIterations ?? 5;
  const includeMetadata = options.includeMetadata ?? false;

  // Get vector store for company's knowledge base
  const vectorStoreId = await getOrCreateVectorStore(uid, companyId);

  // Build system prompt (includes rules if available)
  const systemPrompt = await getEmployeeSystemPrompt(employee, context, uid, companyId);

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

  let searchIterations = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let finalResponse = '';

  // Autonomous loop - process until we get a text response (no more tool calls)
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`[PROCESSOR] Iteration ${iteration + 1}/${maxIterations}`);

    // Call OpenAI Responses API with file_search and function tools
    const response = await openai.responses.create({
      model: MODEL,
      input: conversationHistory,
      instructions: systemPrompt,
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId],
        },
        ...publicAssistantTools.map((tool) => {
          // Determine required parameters (those without "(optional)" in description)
          const required = Object.keys(tool.parameters).filter(key => {
            const param = tool.parameters[key as keyof typeof tool.parameters];
            return param && !param.description?.includes('(optional)');
          });
          
          return {
            type: 'function' as const,
            name: tool.name,
            description: tool.description,
            parameters: {
              type: 'object' as const,
              properties: tool.parameters,
              required,
              additionalProperties: false,
            },
            strict: false,
          };
        }),
      ],
    });

    // Track usage
    if (response.usage) {
      totalPromptTokens += response.usage.input_tokens || 0;
      totalCompletionTokens += response.usage.output_tokens || 0;
    }

    // Process output items
    let hasToolCalls = false;
    let hasFileSearch = false;
    
    for (const item of response.output || []) {
      if (item.type === 'message') {
        // Extract text content
        const textContent = item.content?.find((c: any) => c.type === 'output_text');
        if (textContent && 'text' in textContent && textContent.text) {
          finalResponse = textContent.text;
        }
      } else if (item.type === 'file_search_call') {
        // Built-in tools like file_search are handled internally by OpenAI
        // Do NOT push them into conversationHistory - they don't need to be replayed
        hasFileSearch = true;
        searchIterations++;
        console.log(`[PROCESSOR] File search executed`);
        
        // Note: We don't set hasToolCalls here because built-in tools are handled internally
        // but we track hasFileSearch to continue the loop if needed
      } else if (item.type === 'function_call') {
        hasToolCalls = true;
        console.log(`[PROCESSOR] Function call: ${item.name}`);
        
        // Execute the function
        const { executePublicAssistantTool } = await import('./tools');
        const args = typeof item.arguments === 'string' 
          ? JSON.parse(item.arguments) 
          : item.arguments;
        
        // Inject uid and companyId for internal tool calls
        const argsWithContext = {
          ...args,
          uid,
          companyId,
        };
        
        const result = await executePublicAssistantTool(item.name, argsWithContext);
        
        // ✅ RE-ENABLE: add the function_call itself to the history
        // The API requires both function_call and function_call_output to be present
        conversationHistory.push(item);
        
        // ✅ Keep output as a separate item linked via call_id
        conversationHistory.push({
          type: 'function_call_output',
          call_id: item.call_id,
          output: JSON.stringify(result),
          id: `${item.id}_output`,
        });
      } else if (item.type === 'reasoning') {
        // ✅ DO keep reasoning so any function_call items you replay still
        // have the reasoning trace the API expects
        conversationHistory.push(item);
      }
    }

    // If we got a message, the AI is done responding (tool calls in this iteration are already incorporated)
    if (finalResponse) {
      console.log(`[PROCESSOR] Final response received after ${iteration + 1} iteration(s)`);
      break;
    }

    // If we had function calls, continue the loop to get the AI's response after executing them
    if (hasToolCalls) {
      console.log(`[PROCESSOR] Function calls executed without message, continuing to next iteration`);
      continue;
    }

    // If we had file_search but no message, continue once to let OpenAI process the results
    // Built-in tools are handled internally, but may need another iteration to generate response
    if (hasFileSearch) {
      console.log(`[PROCESSOR] File search executed without message, continuing to next iteration`);
      continue;
    }

    // If we get here with no message and no tool calls, something went wrong
    console.warn(`[PROCESSOR] No response or tool calls in iteration ${iteration + 1}`);
    break;
  }

  if (!finalResponse) {
    throw new Error('No response generated after maximum iterations');
  }

  const processingTimeMs = Date.now() - startTime;

  const result: ProcessorResult = {
    response: finalResponse,
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
    },
  };

  if (includeMetadata) {
    result.metadata = {
      searchIterations,
      processingTimeMs,
    };
  }

  return result;
}
