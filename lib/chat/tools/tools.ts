import { toolsList } from "@/config/chat/tools-list";
import { ToolsState, WebSearchConfig } from "@/stores/chat/useToolsStore";

interface WebSearchTool extends WebSearchConfig {
  type: "web_search";
}

export const getTools = async (toolsState: ToolsState) => {
  const {
    webSearchEnabled,
    fileSearchEnabled,
    functionsEnabled,
    codeInterpreterEnabled,
    vectorStore,
    webSearchConfig,
  } = toolsState;

  const tools = [];

  if (webSearchEnabled) {
    const webSearchTool: WebSearchTool = {
      type: "web_search",
    };
    if (
      webSearchConfig.user_location &&
      (webSearchConfig.user_location.country !== "" ||
        webSearchConfig.user_location.region !== "" ||
        webSearchConfig.user_location.city !== "")
    ) {
      webSearchTool.user_location = webSearchConfig.user_location;
    }

    tools.push(webSearchTool);
  }

  if (fileSearchEnabled) {
    const fileSearchTool = {
      type: "file_search" as const,
      vector_store_ids: [vectorStore?.id],
    };
    tools.push(fileSearchTool);
  }

  if (codeInterpreterEnabled) {
    tools.push({ type: "code_interpreter" as const, container: { type: "auto" as const } });
  }

  if (functionsEnabled) {
    tools.push(
      ...toolsList.map((tool) => {
        return {
          type: "function" as const,
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object" as const,
            properties: { ...tool.parameters },
            required: Object.keys(tool.parameters),
            additionalProperties: false,
          },
          strict: true,
        };
      })
    );
  }

  return tools;
};

