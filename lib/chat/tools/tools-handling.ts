import { functionsMap } from "@/config/chat/functions";

type ToolName = keyof typeof functionsMap;

// List of employee-specific functions that require uid and selectedCompany
const employeeSpecificFunctions = [
  'create_category',
  'get_categories',
  'search_categories',
  'update_category',
  'delete_category',
  'get_support_tickets',
  'get_ticket_messages',
  'get_templates',
  'create_template',
  'update_template',
  'delete_template',
  'open_ticket',
  'close_ticket',
  'enable_ticket_ai',
  'disable_ticket_ai',
  'get_emails',
  'send_email',
  'get_helpdesk_settings',
  'update_helpdesk_settings',
  'update_helpdesk_ai_suggestions',
  'update_helpdesk_ai_messages',
  'get_live_chat_sessions',
  'get_live_chat_session',
  'get_live_chat_settings',
  'get_live_chat_basic_settings',
  'update_live_chat_basic_settings',
  'get_live_chat_content_settings',
  'update_live_chat_content_settings',
  'get_live_chat_features_settings',
  'update_live_chat_features_settings',
  'get_live_chat_appearance_settings',
  'update_live_chat_appearance_settings',
  'get_live_chat_advanced_settings',
  'update_live_chat_advanced_settings',
  'get_training_rules',
  'add_training_rule',
  'update_training_rule',
  'delete_training_rule',
  'refresh_knowledge_base',
  'get_faqs',
  'create_faq',
  'update_faq',
  'delete_faq',
  'get_scenarios',
  'add_scenario',
  'update_scenario',
  'delete_scenario',
  'get_live_visitors',
  'get_metrics_overview',
  'get_top_countries',
  'get_top_referrers',
  'get_top_pages',
  'get_articles',
  'search_articles',
  'get_article',
  'create_article',
  'update_article',
  'delete_article',
  'escalate_to_human',
] as const;

export const handleTool = async (
  toolName: ToolName,
  parameters: any,
  uid?: string,
  selectedCompany?: string
) => {
  console.log("[HANDLE TOOL] Tool:", toolName, "| Parameters:", parameters, "| uid:", uid, "| selectedCompany:", selectedCompany);
  if (functionsMap[toolName]) {
    // For employee-specific functions, inject uid and selectedCompany
    if (employeeSpecificFunctions.includes(toolName as any) && uid && selectedCompany) {
      console.log("[HANDLE TOOL] ✅ Injecting uid and selectedCompany for", toolName);
      return await functionsMap[toolName]({
        ...parameters,
        uid,
        selectedCompany,
      });
    }
    // For shared functions, call as-is
    console.log("[HANDLE TOOL] ⚠️ Calling", toolName, "without injection. Is employee-specific?", employeeSpecificFunctions.includes(toolName as any), "| Has uid?", !!uid, "| Has selectedCompany?", !!selectedCompany);
    return await functionsMap[toolName](parameters);
  } else {
    throw new Error(`Unknown tool: ${toolName}`);
  }
};

