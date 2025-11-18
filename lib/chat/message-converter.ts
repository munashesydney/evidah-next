import { Item, MessageItem, ToolCallItem } from './assistant'
import { Message, ToolCall } from '@/lib/services/message-service'

/**
 * Convert API message format to UI Item format
 */
export function convertMessageToItem(message: Message): Item[] {
  const items: Item[] = []

  // For assistant messages with tool calls, add tool calls BEFORE the message
  // This matches the actual conversation flow where tools are called first, then the response is generated
  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    for (const toolCall of message.toolCalls) {
      const toolCallItem: ToolCallItem = {
        type: 'tool_call',
        tool_type: toolCall.type,
        status: toolCall.status,
        id: toolCall.id,
        name: toolCall.name ?? undefined,
        call_id: toolCall.id,
        arguments: toolCall.arguments,
        parsedArguments: toolCall.parsedArguments,
        output: toolCall.output ?? undefined,
        code: toolCall.code,
        files: toolCall.files?.map((f) => ({
          file_id: f.file_id,
          mime_type: 'application/octet-stream', // Default mime type
          container_id: f.container_id,
          filename: f.filename,
        })),
      }
      items.push(toolCallItem)
    }
  }

  // Add the main message
  const messageItem: MessageItem = {
    type: 'message',
    role: message.role,
    id: message.id,
    content: [
      {
        type: message.role === 'user' ? 'input_text' : 'output_text',
        text: message.content,
      },
    ],
  }
  items.push(messageItem)

  return items
}

/**
 * Convert UI Item format to API ToolCall format
 */
export function convertItemToToolCall(item: ToolCallItem): ToolCall {
  return {
    id: item.id,
    type: item.tool_type,
    name: item.name ?? null,
    arguments: item.arguments,
    parsedArguments: item.parsedArguments,
    output: item.output ?? null,
    status: item.status,
    code: item.code,
    files: item.files?.map((f) => ({
      file_id: f.file_id,
      filename: f.filename,
      container_id: f.container_id,
    })),
  }
}

/**
 * Convert multiple messages to UI items
 */
export function convertMessagesToItems(messages: Message[]): Item[] {
  const items: Item[] = []
  
  for (const message of messages) {
    items.push(...convertMessageToItem(message))
  }
  
  return items
}

/**
 * Convert messages to conversation history format for API calls
 * This extracts just the role and content for sending to the AI
 */
export function convertMessagesToConversationHistory(messages: Message[]): Array<{ role: 'user' | 'assistant', content: string }> {
  return messages.map(message => ({
    role: message.role,
    content: message.content,
  }))
}
