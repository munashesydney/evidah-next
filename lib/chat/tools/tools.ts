import { getAllToolsForEmployee, getSharedTools } from "@/config/chat/tools-list";
import { ToolsState, WebSearchConfig } from "@/stores/chat/useToolsStore";
import { getOrCreateVectorStore } from "@/lib/services/vector-store-helper";

interface WebSearchTool extends WebSearchConfig {
  type: "web_search";
}

export const getTools = async (
  toolsState: ToolsState,
  uid?: string,
  selectedCompany?: string,
  employeeId?: string,
  isActionEvent?: boolean
) => {
  const {
    webSearchEnabled,
    fileSearchEnabled,
    functionsEnabled,
    codeInterpreterEnabled,
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

  if (fileSearchEnabled && uid && selectedCompany) {
    try {
      console.log(`[TOOLS] File search enabled for uid: ${uid}, company: ${selectedCompany}`);
      const vectorStoreId = await getOrCreateVectorStore(uid, selectedCompany);
      console.log(`[TOOLS] Retrieved vector store ID: ${vectorStoreId}`);
      
      // Verify vector store has files
      const { verifyVectorStoreHasFiles } = await import("@/lib/services/vector-store-helper");
      const hasFiles = await verifyVectorStoreHasFiles(vectorStoreId);
      console.log(`[TOOLS] Vector store ${vectorStoreId} has files: ${hasFiles}`);
      
      if (!hasFiles) {
        console.warn(`[TOOLS] ⚠️ Vector store ${vectorStoreId} has no files! File search may not work.`);
      }
      
      const fileSearchTool = {
        type: "file_search" as const,
        vector_store_ids: [vectorStoreId],
      };
      tools.push(fileSearchTool);
      console.log(`[TOOLS] ✅ Added file_search tool with vector_store_ids: [${vectorStoreId}]`);
    } catch (error) {
      console.error("[TOOLS] ❌ Error getting vector store:", error);
      // Don't add file_search tool if vector store retrieval fails
    }
  } else {
    if (!fileSearchEnabled) {
      console.log(`[TOOLS] File search is disabled`);
    } else {
      console.log(`[TOOLS] Missing uid or selectedCompany - uid: ${uid}, selectedCompany: ${selectedCompany}`);
    }
  }

  if (codeInterpreterEnabled) {
    tools.push({ type: "code_interpreter" as const, container: { type: "auto" as const } });
  }

  if (functionsEnabled) {
    // Get tools for the specific employee (shared + employee-specific)
    const toolsForEmployee = getAllToolsForEmployee(employeeId);
    console.log(`[TOOLS] Employee: ${employeeId || 'none'}, Total functions: ${toolsForEmployee.length}`);
    
    tools.push(
      ...toolsForEmployee.map((tool) => {
        // Determine required parameters based on function-specific rules
        let required: string[] = [];
        
        // Function-specific required parameter definitions
        const functionRequiredParams: Record<string, string[]> = {
          'get_articles': [], // All params optional (uid/selectedCompany injected)
          'get_categories': [], // All params optional (uid/selectedCompany injected)
          'get_support_tickets': [], // All params optional (uid/selectedCompany injected)
          'get_templates': [], // All params optional (uid/selectedCompany injected)
          'get_emails': [], // All params optional (uid/selectedCompany injected)
          'get_helpdesk_settings': [], // All params optional (uid/selectedCompany injected)
          'update_helpdesk_settings': [], // All params optional (uid/selectedCompany injected)
          'update_helpdesk_ai_suggestions': ['aiSuggestionsOn'],
          'update_helpdesk_ai_messages': ['aiMessagesOn'],
          'get_live_chat_sessions': [], // All params optional (uid/selectedCompany injected)
          'get_live_chat_session': ['sessionId'],
          'get_live_chat_settings': [], // All params optional (uid/selectedCompany injected)
          'get_live_chat_basic_settings': [], // All params optional (uid/selectedCompany injected)
          'update_live_chat_basic_settings': [], // All params optional (uid/selectedCompany injected)
          'get_live_chat_content_settings': [], // All params optional (uid/selectedCompany injected)
          'update_live_chat_content_settings': [], // All params optional (uid/selectedCompany injected)
          'get_live_chat_features_settings': [], // All params optional (uid/selectedCompany injected)
          'update_live_chat_features_settings': [], // All params optional (uid/selectedCompany injected)
          'get_live_chat_appearance_settings': [], // All params optional (uid/selectedCompany injected)
          'update_live_chat_appearance_settings': [], // All params optional (uid/selectedCompany injected)
          'get_live_chat_advanced_settings': [], // All params optional (uid/selectedCompany injected)
          'update_live_chat_advanced_settings': [], // All params optional (uid/selectedCompany injected)
          'get_live_visitors': [], // All params optional (uid/selectedCompany injected)
          'get_metrics_overview': ['startDate', 'endDate'],
          'get_top_countries': [], // All params optional (uid/selectedCompany injected)
          'get_top_referrers': [], // All params optional (uid/selectedCompany injected)
          'get_top_pages': ['startDate', 'endDate'],
          'get_training_rules': [], // All params optional (uid/selectedCompany injected)
          'add_training_rule': ['text'],
          'update_training_rule': ['ruleId'], // At least one of text/enabled should be provided, but we'll let the API handle validation
          'delete_training_rule': ['ruleId'],
          'refresh_knowledge_base': [], // All params optional (uid/selectedCompany injected)
          'get_faqs': [], // All params optional (uid/selectedCompany injected)
          'create_faq': ['question', 'answer'],
          'update_faq': ['faqId'], // At least one of question/answer/enabled should be provided, but we'll let the API handle validation
          'delete_faq': ['faqId'],
          'search_articles': ['query'], // query is required
          'search_categories': ['query'], // query is required
          'get_article': ['articleId'],
          'get_ticket_messages': ['ticketId'],
          'create_article': ['categoryId', 'title', 'description', 'link'],
          'create_template': ['title', 'body'],
          'update_article': ['categoryId', 'articleId'],
          'update_template': ['templateId'], // At least one of title/body should be provided, but we'll let the API handle validation
          'delete_article': ['categoryId', 'articleId'],
          'delete_template': ['templateId'],
          'open_ticket': ['ticketId'],
          'close_ticket': ['ticketId'],
          'enable_ticket_ai': ['ticketId'],
          'disable_ticket_ai': ['ticketId'],
          'send_email': ['ticketId', 'to', 'subject', 'message'],
          'create_category': ['name', 'description', 'link'],
          'update_category': ['categoryId'], // At least one of name/description/link should be provided, but we'll let the API handle validation
          'delete_category': ['categoryId'],
        };
        
        // Use function-specific requirements if available, otherwise use all params as required
        if (functionRequiredParams[tool.name]) {
          required = functionRequiredParams[tool.name];
        } else {
          // For functions not in the list, require all parameters
          required = Object.keys(tool.parameters);
        }
        
        // Only use strict mode when all parameters are required
        // OpenAI strict mode requires all properties to be in the required array
        const allParamsRequired = required.length === Object.keys(tool.parameters).length;
        
        return {
          type: "function" as const,
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object" as const,
            properties: { ...tool.parameters },
            required,
            additionalProperties: false,
          },
          strict: allParamsRequired,
        };
      })
    );

    // If this is an action event, add escalate_to_human tool
    if (isActionEvent && uid && selectedCompany) {
      const sharedTools = getSharedTools();
      const escalateTool = sharedTools.find(tool => tool.name === 'escalate_to_human');
      
      if (escalateTool) {
        // Determine required parameters for escalate_to_human
        const required = ['reason', 'urgency']; // summary is optional
        
        tools.push({
          type: "function" as const,
          name: escalateTool.name,
          description: escalateTool.description,
          parameters: {
            type: "object" as const,
            properties: { ...escalateTool.parameters },
            required,
            additionalProperties: false,
          },
          strict: false, // summary is optional
        });
        console.log(`[TOOLS] ✅ Added escalate_to_human tool for action event`);
      }
    }
  }

  return tools;
};

