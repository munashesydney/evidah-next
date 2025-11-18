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

  // Build system prompt
  const systemPrompt = getEmployeeSystemPrompt(employee, context);

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
      model: 'gpt-4o',
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
    
    for (const item of response.output || []) {
      if (item.type === 'message') {
        // Extract text content
        const textContent = item.content?.find((c: any) => c.type === 'output_text');
        if (textContent && 'text' in textContent && textContent.text) {
          finalResponse = textContent.text;
        }
      } else if (item.type === 'file_search_call') {
        hasToolCalls = true;
        searchIterations++;
        console.log(`[PROCESSOR] File search executed`);
        
        // Add the tool call to conversation history
        conversationHistory.push(item);
      } else if (item.type === 'function_call') {
        hasToolCalls = true;
        console.log(`[PROCESSOR] Function call: ${item.name}`);
        
        // Execute the function
        const { executePublicAssistantTool } = await import('./tools');
        const args = typeof item.arguments === 'string' 
          ? JSON.parse(item.arguments) 
          : item.arguments;
        
        const result = await executePublicAssistantTool(item.name, args);
        
        // Add function call and result to conversation history
        conversationHistory.push(item);
        conversationHistory.push({
          type: 'function_call_output',
          call_id: item.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    // If we got a message, the AI is done responding (tool calls in this iteration are already incorporated)
    if (finalResponse) {
      console.log(`[PROCESSOR] Final response received after ${iteration + 1} iteration(s)`);
      break;
    }

    // If we had tool calls but no message, continue the loop to get the AI's response
    if (hasToolCalls) {
      console.log(`[PROCESSOR] Tool calls executed without message, continuing to next iteration`);
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
