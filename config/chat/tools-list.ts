// List of tools available to the assistant
// No need to include the top-level wrapper object as it is added in lib/chat/tools/tools.ts
// More information on function calling: https://platform.openai.com/docs/guides/function-calling

// Shared tools available to all employees
export const sharedTools = [
  {
    name: "get_weather",
    description: "Get the weather for a given location",
    parameters: {
      location: {
        type: "string",
        description: "Location to get weather for",
      },
      unit: {
        type: "string",
        description: "Unit to get weather in",
        enum: ["celsius", "fahrenheit"],
      },
    },
  },
  {
    name: "get_joke",
    description: "Get a programming joke",
    parameters: {},
  },
  {
    name: "escalate_to_human",
    description: "Escalate the conversation to a human agent. Use this when you are not 100% certain about an answer, cannot find the information needed, or when the query is complex and requires human judgment. Honesty is critical - always escalate rather than guess.",
    parameters: {
      reason: {
        type: "string",
        description: "Brief explanation of why escalation is needed (e.g., 'Unable to find specific pricing information', 'Complex technical issue requiring human expertise', 'Uncertain about the correct action to take')",
      },
      urgency: {
        type: "string",
        description: "Urgency level of the escalation",
        enum: ["low", "medium", "high"],
      },
      summary: {
        type: "string",
        description: "Brief summary of the issue or question for the human agent (optional)",
      },
    },
  },
];

// Employee-specific tool definitions
const employeeSpecificTools = {
  emma: [
    {
      name: "create_category",
      description: "Create a new category in the knowledge base. Use this when the user wants to organize articles or content into a new category.",
      parameters: {
        name: {
          type: "string",
          description: "The name of the category",
        },
        description: {
          type: "string",
          description: "A description of what this category contains",
        },
        link: {
          type: "string",
          description: "A URL-friendly identifier for the category (only letters, numbers, hyphens, and underscores allowed)",
        },
      },
    },
    {
      name: "get_categories",
      description: "Retrieve categories from the knowledge base. Use this to list all categories.",
      parameters: {
        limit: {
          type: "number",
          description: "Number of categories to retrieve (optional, default is 12)",
        },
        lastDocId: {
          type: "string",
          description: "Last document ID for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "search_categories",
      description: "Search for categories in the knowledge base. Use this to find categories by name or description.",
      parameters: {
        query: {
          type: "string",
          description: "Search query to find categories by name or description",
        },
        limit: {
          type: "number",
          description: "Number of categories to retrieve (optional, default is 12)",
        },
        lastDocId: {
          type: "string",
          description: "Last document ID for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "update_category",
      description: "Update an existing category. Use this to modify category name, description, or link.",
      parameters: {
        categoryId: {
          type: "string",
          description: "The ID of the category to update",
        },
        name: {
          type: "string",
          description: "New name for the category (optional)",
        },
        description: {
          type: "string",
          description: "New description for the category (optional)",
        },
        link: {
          type: "string",
          description: "New URL-friendly identifier for the category (optional)",
        },
      },
    },
    {
      name: "delete_category",
      description: "Delete a category from the knowledge base. Use this when the user wants to remove a category permanently.",
      parameters: {
        categoryId: {
          type: "string",
          description: "The ID of the category to delete",
        },
      },
    },
    {
      name: "get_articles",
      description: "Retrieve articles from the knowledge base. Use this to list articles, optionally filtered by category.",
      parameters: {
        categoryId: {
          type: "string",
          description: "Category ID or comma-separated list of category IDs to filter by (optional)",
        },
        limit: {
          type: "number",
          description: "Number of articles to retrieve (optional, default is 12)",
        },
        lastDocId: {
          type: "string",
          description: "Last document ID for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "search_articles",
      description: "Search for articles in the knowledge base. Use this to find articles by title, description, or content.",
      parameters: {
        query: {
          type: "string",
          description: "Search query to find articles by title, description, or content",
        },
        categoryId: {
          type: "string",
          description: "Category ID or comma-separated list of category IDs to filter by (optional)",
        },
        limit: {
          type: "number",
          description: "Number of articles to retrieve (optional, default is 12)",
        },
        lastDocId: {
          type: "string",
          description: "Last document ID for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "get_article",
      description: "Get a specific article by its ID. Use this to retrieve detailed information about a single article.",
      parameters: {
        articleId: {
          type: "string",
          description: "The ID of the article to retrieve",
        },
      },
    },
    {
      name: "create_article",
      description: "Create a new article in a category. Use this when the user wants to add new content to the knowledge base.",
      parameters: {
        categoryId: {
          type: "string",
          description: "The ID of the category where the article should be created",
        },
        title: {
          type: "string",
          description: "The title of the article",
        },
        description: {
          type: "string",
          description: "A brief description of the article",
        },
        link: {
          type: "string",
          description: "A URL-friendly identifier for the article (only letters, numbers, hyphens, and underscores allowed)",
        },
        content: {
          type: "string",
          description: "The HTML content of the article (optional)",
        },
        rawText: {
          type: "string",
          description: "The plain text content of the article (optional)",
        },
        published: {
          type: "boolean",
          description: "Whether the article should be published (optional, default is false)",
        },
      },
    },
    {
      name: "update_article",
      description: "Update an existing article. Use this to modify article title, description, content, or move it to a different category.",
      parameters: {
        categoryId: {
          type: "string",
          description: "The current category ID of the article",
        },
        articleId: {
          type: "string",
          description: "The ID of the article to update",
        },
        title: {
          type: "string",
          description: "New title for the article (optional)",
        },
        description: {
          type: "string",
          description: "New description for the article (optional)",
        },
        link: {
          type: "string",
          description: "New URL-friendly identifier for the article (optional)",
        },
        published: {
          type: "boolean",
          description: "Whether the article should be published (optional)",
        },
        fav: {
          type: "boolean",
          description: "Whether the article should be marked as favorite (optional)",
        },
        content: {
          type: "string",
          description: "New HTML content for the article (optional)",
        },
        rawText: {
          type: "string",
          description: "New plain text content for the article (optional)",
        },
        newCategoryId: {
          type: "string",
          description: "New category ID to move the article to (optional, for moving articles between categories)",
        },
      },
    },
    {
      name: "delete_article",
      description: "Delete an article from the knowledge base. Use this when the user wants to remove an article permanently.",
      parameters: {
        categoryId: {
          type: "string",
          description: "The category ID where the article is located",
        },
        articleId: {
          type: "string",
          description: "The ID of the article to delete",
        },
      },
    },
  ],
  charlie: [
    {
      name: "get_support_tickets",
      description: "Retrieve support tickets from the help desk. Use this to view customer support tickets and their status.",
      parameters: {
        limit: {
          type: "number",
          description: "Number of tickets to retrieve (optional, default is 10)",
        },
        startAfter: {
          type: "string",
          description: "Timestamp in milliseconds for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "get_ticket_messages",
      description: "Get messages for a specific support ticket. Use this to view the conversation history of a ticket.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket to get messages for",
        },
      },
    },
    {
      name: "get_templates",
      description: "Retrieve all response templates. Use this to view available email templates for customer responses.",
      parameters: {},
    },
    {
      name: "create_template",
      description: "Create a new response template. Use this when the user wants to add a new email template for customer responses.",
      parameters: {
        title: {
          type: "string",
          description: "The title of the template",
        },
        body: {
          type: "string",
          description: "The body/content of the template",
        },
      },
    },
    {
      name: "update_template",
      description: "Update an existing response template. Use this to modify template title or body.",
      parameters: {
        templateId: {
          type: "string",
          description: "The ID of the template to update",
        },
        title: {
          type: "string",
          description: "New title for the template (optional)",
        },
        body: {
          type: "string",
          description: "New body/content for the template (optional)",
        },
      },
    },
    {
      name: "delete_template",
      description: "Delete a response template. Use this when the user wants to remove a template permanently.",
      parameters: {
        templateId: {
          type: "string",
          description: "The ID of the template to delete",
        },
      },
    },
    {
      name: "open_ticket",
      description: "Open a support ticket. Use this to change a ticket's status to Open.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket to open",
        },
      },
    },
    {
      name: "close_ticket",
      description: "Close a support ticket. Use this to change a ticket's status to Closed.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket to close",
        },
      },
    },
    {
      name: "enable_ticket_ai",
      description: "Enable AI assistance for a ticket. Use this to turn on AI features for a specific ticket.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket to enable AI for",
        },
      },
    },
    {
      name: "disable_ticket_ai",
      description: "Disable AI assistance for a ticket. Use this to turn off AI features for a specific ticket.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket to disable AI for",
        },
      },
    },
    {
      name: "get_emails",
      description: "Retrieve all email configurations. Use this to view available email addresses for sending responses.",
      parameters: {},
    },
    {
      name: "send_email",
      description: "Send an email reply to a ticket. Use this to respond to customers via email.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket to send email for",
        },
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        message: {
          type: "string",
          description: "Email message body",
        },
        replyToId: {
          type: "string",
          description: "Message ID to reply to (optional, for threading)",
        },
        references: {
          type: "string",
          description: "Email references header for threading (optional)",
        },
        currentFrom: {
          type: "string",
          description: "Email configuration object (optional, JSON string)",
        },
        fileUrls: {
          type: "string",
          description: "Array of file attachments (optional, JSON string with array of {name, url} objects)",
        },
      },
    },
    {
      name: "get_helpdesk_settings",
      description: "Get helpdesk settings including subdomain, email forwarding, AI messages, and AI suggestions settings.",
      parameters: {},
    },
    {
      name: "update_helpdesk_settings",
      description: "Update helpdesk settings, specifically the default email forwarding address.",
      parameters: {
        defaultForward: {
          type: "string",
          description: "Default email address for forwarding helpdesk tickets (optional)",
        },
      },
    },
    {
      name: "update_helpdesk_ai_suggestions",
      description: "Enable or disable AI suggestions for the helpdesk. AI suggestions provide automated response recommendations.",
      parameters: {
        aiSuggestionsOn: {
          type: "boolean",
          description: "Whether to enable (true) or disable (false) AI suggestions",
        },
      },
    },
    {
      name: "update_helpdesk_ai_messages",
      description: "Enable or disable AI auto-response messages for the helpdesk. When enabled, AI will automatically respond to tickets.",
      parameters: {
        aiMessagesOn: {
          type: "boolean",
          description: "Whether to enable (true) or disable (false) AI auto-response messages",
        },
      },
    },
    {
      name: "get_drafts",
      description: "Retrieve AI-generated draft responses for tickets. Use this to view all draft suggestions with pagination.",
      parameters: {
        limit: {
          type: "number",
          description: "Number of drafts to retrieve (optional, default is 20)",
        },
        lastDocId: {
          type: "string",
          description: "Last document ID for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "create_draft",
      description: "Create a new AI-generated draft response for a ticket. Use this to save an AI suggestion that can be reviewed and used later.",
      parameters: {
        ticketId: {
          type: "string",
          description: "The ID of the ticket this draft is for",
        },
        aiResponse: {
          type: "string",
          description: "The AI-generated response text to save as a draft (NO SUBJECT - JUST BODY)",
        },
      },
    },
    {
      name: "delete_draft",
      description: "Delete a draft response. Use this to remove a draft that is no longer needed.",
      parameters: {
        draftId: {
          type: "string",
          description: "The ID of the draft to delete",
        },
      },
    },
  ],
  marquavious: [
    {
      name: "get_live_chat_sessions",
      description: "Get live chat sessions. Use this to view active or recent chat conversations with customers.",
      parameters: {
        limit: {
          type: "number",
          description: "Number of sessions to retrieve (optional, default is 10)",
        },
        startAfter: {
          type: "string",
          description: "Document ID for pagination (optional, used to get next page of results)",
        },
      },
    },
    {
      name: "get_live_chat_session",
      description: "Get a specific live chat session with all messages. Use this to view the full conversation history of a session.",
      parameters: {
        sessionId: {
          type: "string",
          description: "The ID of the session to retrieve",
        },
      },
    },
    {
      name: "get_live_chat_settings",
      description: "Get all live chat configuration settings. Use this to view the complete live chat setup.",
      parameters: {},
    },
    {
      name: "get_live_chat_basic_settings",
      description: "Get basic live chat settings (enabled, position, theme, size). Use this to view basic configuration.",
      parameters: {},
    },
    {
      name: "update_live_chat_basic_settings",
      description: "Update basic live chat settings. Use this to change enabled status, position, theme, or size.",
      parameters: {
        enabled: {
          type: "boolean",
          description: "Whether live chat is enabled (optional)",
        },
        position: {
          type: "string",
          description: "Chat bubble position: 'bottom-right', 'bottom-left', 'top-right', or 'top-left' (optional)",
        },
        theme: {
          type: "string",
          description: "Chat theme: 'default', 'minimal', 'rounded', or 'modern' (optional)",
        },
        size: {
          type: "string",
          description: "Chat size: 'small', 'medium', or 'large' (optional)",
        },
      },
    },
    {
      name: "get_live_chat_content_settings",
      description: "Get content settings for live chat (messages and text). Use this to view welcome message, placeholder, company name, and offline message.",
      parameters: {},
    },
    {
      name: "update_live_chat_content_settings",
      description: "Update content settings for live chat. Use this to change welcome message, placeholder text, company name, or offline message.",
      parameters: {
        welcomeMessage: {
          type: "string",
          description: "Welcome message shown when chat opens (optional)",
        },
        placeholderText: {
          type: "string",
          description: "Placeholder text in the message input field (optional)",
        },
        companyName: {
          type: "string",
          description: "Company name displayed in the chat (optional)",
        },
        offlineMessage: {
          type: "string",
          description: "Message shown when chat is offline (optional)",
        },
      },
    },
    {
      name: "get_live_chat_features_settings",
      description: "Get features settings for live chat. Use this to view avatar, typing indicator, and online status settings.",
      parameters: {},
    },
    {
      name: "update_live_chat_features_settings",
      description: "Update features settings for live chat. Use this to enable/disable avatar, typing indicator, or online status.",
      parameters: {
        showAvatar: {
          type: "boolean",
          description: "Whether to show avatar in chat (optional)",
        },
        showTypingIndicator: {
          type: "boolean",
          description: "Whether to show typing indicator (optional)",
        },
        showOnlineStatus: {
          type: "boolean",
          description: "Whether to show online status (optional)",
        },
      },
    },
    {
      name: "get_live_chat_appearance_settings",
      description: "Get appearance settings for live chat. Use this to view bubble shape, icon, colors, and styling.",
      parameters: {},
    },
    {
      name: "update_live_chat_appearance_settings",
      description: "Update appearance settings for live chat. Use this to change bubble shape, icon, colors, or border radius.",
      parameters: {
        bubbleShape: {
          type: "string",
          description: "Bubble shape: 'rectangle' or 'circle' (optional)",
        },
        bubbleIcon: {
          type: "string",
          description: "Bubble icon: 'chat', 'message', 'robot', or 'custom' (optional)",
        },
        customIconUrl: {
          type: "string",
          description: "Custom icon URL when bubbleIcon is 'custom' (optional)",
        },
        primaryColor: {
          type: "string",
          description: "Primary color in hex format (e.g., '#6366f1') (optional)",
        },
        borderRadius: {
          type: "number",
          description: "Border radius (0-50) (optional)",
        },
      },
    },
    {
      name: "get_live_chat_advanced_settings",
      description: "Get advanced settings for live chat. Use this to view custom CSS.",
      parameters: {},
    },
    {
      name: "update_live_chat_advanced_settings",
      description: "Update advanced settings for live chat. Use this to add custom CSS styling.",
      parameters: {
        customCSS: {
          type: "string",
          description: "Custom CSS code for styling the live chat widget (optional)",
        },
      },
    },
  ],
  "sung-wen": [
    {
      name: "get_training_rules",
      description: "Get all training rules. Use this to view all existing training rules and their status.",
      parameters: {},
    },
    {
      name: "add_training_rule",
      description: "Add a new training rule to improve AI responses. Use this when the user wants to add instructions or guidelines for how the AI should behave.",
      parameters: {
        text: {
          type: "string",
          description: "The rule text that describes how the AI should behave or respond",
        },
      },
    },
    {
      name: "update_training_rule",
      description: "Update an existing training rule. Use this to modify rule text or enable/disable a rule.",
      parameters: {
        ruleId: {
          type: "string",
          description: "The ID of the rule to update",
        },
        text: {
          type: "string",
          description: "New rule text (optional)",
        },
        enabled: {
          type: "boolean",
          description: "Whether the rule should be enabled (optional)",
        },
      },
    },
    {
      name: "delete_training_rule",
      description: "Delete a training rule. Use this to permanently remove a training rule.",
      parameters: {
        ruleId: {
          type: "string",
          description: "The ID of the rule to delete",
        },
      },
    },
    {
      name: "refresh_knowledge_base",
      description: "Refresh the knowledge base by regenerating and uploading training data to OpenAI. Use this to update the AI's knowledge with latest articles and content. This can take some time.",
      parameters: {
        forceRefresh: {
          type: "boolean",
          description: "Force a refresh even if data hasn't changed (optional, default is false)",
        },
        waitForIndexing: {
          type: "boolean",
          description: "Wait for files to be indexed before returning (optional, default is true)",
        },
      },
    },
    {
      name: "get_faqs",
      description: "Get all FAQs. Use this to view all existing frequently asked questions and their answers.",
      parameters: {},
    },
    {
      name: "create_faq",
      description: "Create a new FAQ. Use this to add a frequently asked question and its answer.",
      parameters: {
        question: {
          type: "string",
          description: "The question text",
        },
        answer: {
          type: "string",
          description: "The answer text",
        },
      },
    },
    {
      name: "update_faq",
      description: "Update an existing FAQ. Use this to modify question, answer, or enable/disable a FAQ.",
      parameters: {
        faqId: {
          type: "string",
          description: "The ID of the FAQ to update",
        },
        question: {
          type: "string",
          description: "New question text (optional)",
        },
        answer: {
          type: "string",
          description: "New answer text (optional)",
        },
        enabled: {
          type: "boolean",
          description: "Whether the FAQ should be enabled (optional)",
        },
      },
    },
    {
      name: "delete_faq",
      description: "Delete a FAQ. Use this to permanently remove a frequently asked question.",
      parameters: {
        faqId: {
          type: "string",
          description: "The ID of the FAQ to delete",
        },
      },
    },
    {
      name: "get_scenarios",
      description: "Get all chat scenarios. Use this to view all existing scenarios that define conditional logic for automated responses.",
      parameters: {
        page: {
          type: "number",
          description: "Page number for pagination (optional, default is 1)",
        },
        limit: {
          type: "number",
          description: "Number of scenarios per page (optional, default is 20)",
        },
      },
    },
    {
      name: "add_scenario",
      description: "Create a new chat scenario. Use this to add conditional logic that automates responses based on user messages. Scenarios use natural language for conditions and actions.",
      parameters: {
        name: {
          type: "string",
          description: "The name of the scenario",
        },
        description: {
          type: "string",
          description: "A description of what this scenario does (optional)",
        },
        condition: {
          type: "string",
          description: "Natural language description of when this scenario should trigger (e.g., 'When the user message contains words like refund, return, or money back')",
        },
        thenAction: {
          type: "string",
          description: "Natural language description of what should happen when the condition is met (e.g., 'Respond with: I can help you with your refund request...')",
        },
        elseAction: {
          type: "string",
          description: "Natural language description of what should happen if the condition is not met (optional)",
        },
        enabled: {
          type: "boolean",
          description: "Whether the scenario should be enabled (optional, default is true)",
        },
      },
    },
    {
      name: "update_scenario",
      description: "Update an existing chat scenario. Use this to modify scenario name, description, condition, actions, or enable/disable it.",
      parameters: {
        scenarioId: {
          type: "string",
          description: "The ID of the scenario to update",
        },
        name: {
          type: "string",
          description: "New name for the scenario (optional)",
        },
        description: {
          type: "string",
          description: "New description for the scenario (optional)",
        },
        condition: {
          type: "string",
          description: "New condition in natural language (optional)",
        },
        thenAction: {
          type: "string",
          description: "New then action in natural language (optional)",
        },
        elseAction: {
          type: "string",
          description: "New else action in natural language, or null to remove (optional)",
        },
        enabled: {
          type: "boolean",
          description: "Whether the scenario should be enabled (optional)",
        },
      },
    },
    {
      name: "delete_scenario",
      description: "Delete a chat scenario. Use this to permanently remove a scenario.",
      parameters: {
        scenarioId: {
          type: "string",
          description: "The ID of the scenario to delete",
        },
      },
    },
    {
      name: "get_live_visitors",
      description: "Get currently active live visitors on the knowledge base. Use this to see who is currently browsing the site.",
      parameters: {},
    },
    {
      name: "get_metrics_overview",
      description: "Get metrics overview including unique visitors, total page views, total sessions, and average visit duration. Note: This can be slow for large date ranges. Use this to get comprehensive analytics data.",
      parameters: {
        startDate: {
          type: "string",
          description: "Start date in format 'yyyy-MM-dd' (e.g., '2024-01-01')",
        },
        endDate: {
          type: "string",
          description: "End date in format 'yyyy-MM-dd' (e.g., '2024-01-31')",
        },
      },
    },
    {
      name: "get_top_countries",
      description: "Get top countries by visitor count. Use this to see which countries your visitors are coming from.",
      parameters: {
        limit: {
          type: "number",
          description: "Number of top countries to retrieve (optional, default is 5)",
        },
      },
    },
    {
      name: "get_top_referrers",
      description: "Get top referrers (traffic sources) by visitor count. Use this to see where your visitors are coming from.",
      parameters: {
        limit: {
          type: "number",
          description: "Number of top referrers to retrieve (optional, default is 5)",
        },
      },
    },
    {
      name: "get_top_pages",
      description: "Get top pages by page views. Use this to see which pages are most popular.",
      parameters: {
        startDate: {
          type: "string",
          description: "Start date in format 'yyyy-MM-dd' (e.g., '2024-01-01')",
        },
        endDate: {
          type: "string",
          description: "End date in format 'yyyy-MM-dd' (e.g., '2024-01-31')",
        },
        limit: {
          type: "number",
          description: "Number of top pages to retrieve (optional, default is 5)",
        },
      },
    },
    {
      name: "save_answered_question",
      description: "Save a question and its answer to the answered collection in the knowledge base. Used for special [HUMAN-ANSWER] chats.",
      parameters: {
        question: {
          type: "string",
          description: "The question that was asked (required)",
        },
        answer: {
          type: "string",
          description: "The answer that was provided (required)",
        },
        ticket_id: {
          type: "string",
          description: "The ID of the support ticket associated with this question (optional)",
        },
        session_id: {
          type: "string",
          description: "The ID of the chat session where this question was asked (optional)",
        },
        more_info: {
          type: "string",
          description: "Additional information or context about the question and answer (optional)",
        },
      },
    },
  ],
};

/**
 * Get tools specific to an employee
 * @param employeeId - The employee ID (e.g., 'emma', 'charlie', 'marquavious', 'sung-wen')
 * @returns Array of tool definitions for that employee, or empty array if employee not found
 */
export function getEmployeeTools(employeeId?: string) {
  if (!employeeId) {
    return [];
  }
  return employeeSpecificTools[employeeId as keyof typeof employeeSpecificTools] || [];
}

/**
 * Get shared tools available to all employees
 * @returns Array of shared tool definitions
 */
export function getSharedTools() {
  return sharedTools;
}

/**
 * Get all tools for a specific employee (shared + employee-specific)
 * @param employeeId - The employee ID (e.g., 'emma', 'charlie', 'marquavious', 'sung-wen')
 * @returns Array of all tool definitions for that employee
 */
export function getAllToolsForEmployee(employeeId?: string) {
  return [...getSharedTools(), ...getEmployeeTools(employeeId)];
}

// Legacy export for backward compatibility
export const toolsList = sharedTools;

