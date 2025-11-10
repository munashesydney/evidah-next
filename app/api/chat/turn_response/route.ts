import { getDeveloperPrompt, MODEL } from "@/config/chat/constants";
import { getTools } from "@/lib/chat/tools/tools";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { messages, toolsState, uid, selectedCompany, employeeId, personalityLevel = 2 } = await request.json();

    console.log(`[TURN RESPONSE] Received request - uid: ${uid}, selectedCompany: ${selectedCompany}, employeeId: ${employeeId}, personalityLevel: ${personalityLevel}`);
    console.log(`[TURN RESPONSE] Tools state:`, {
      fileSearchEnabled: toolsState?.fileSearchEnabled,
      webSearchEnabled: toolsState?.webSearchEnabled,
      functionsEnabled: toolsState?.functionsEnabled,
      codeInterpreterEnabled: toolsState?.codeInterpreterEnabled,
    });

    const tools = await getTools(toolsState, uid, selectedCompany, employeeId);

    console.log(`[TURN RESPONSE] Generated ${tools.length} tools:`, tools.map(t => ({
      type: t.type,
      vector_store_ids: (t as any).vector_store_ids,
    })));
    
    // Log detailed file_search tool configuration
    const fileSearchTool = tools.find((t: any) => t.type === 'file_search');
    if (fileSearchTool) {
      console.log(`[TURN RESPONSE] 📁 File search tool configuration:`, JSON.stringify(fileSearchTool, null, 2));
    } else {
      console.log(`[TURN RESPONSE] ⚠️ No file_search tool found in tools array`);
    }
    
    console.log("Received messages:", messages);

    const openai = new OpenAI();

    // Get personalized prompt
    const instructions = await getDeveloperPrompt(uid, selectedCompany, employeeId, personalityLevel);
    console.log(`[TURN RESPONSE] Generated personalized instructions for employee: ${employeeId || 'default'}, personality: ${personalityLevel}`);

    console.log(`[TURN RESPONSE] Sending request to OpenAI with ${tools.length} tools...`);
    const events = await openai.responses.create({
      model: MODEL,
      input: messages,
      instructions,
      tools,
      stream: true,
      parallel_tool_calls: false,
    });
    console.log(`[TURN RESPONSE] ✅ OpenAI request created, streaming response...`);

    // Create a ReadableStream that emits SSE data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of events) {
            // Sending all events to the client
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            controller.enqueue(`data: ${data}\n\n`);
          }
          // End of stream
          controller.close();
        } catch (error) {
          console.error("Error in streaming loop:", error);
          controller.error(error);
        }
      },
    });

    // Return the ReadableStream as SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

