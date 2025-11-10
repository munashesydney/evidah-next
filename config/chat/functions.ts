// Functions mapping to tool calls
// Define one function per tool call - each tool call should have a matching function
// Parameters for a tool call are passed as an object to the corresponding function

export const get_weather = async ({
  location,
  unit,
}: {
  location: string;
  unit: string;
}) => {
  const res = await fetch(
    `/api/chat/functions/get_weather?location=${location}&unit=${unit}`
  ).then((res) => res.json());

  return res;
};

export const get_joke = async () => {
  const res = await fetch(`/api/chat/functions/get_joke`).then((res) => res.json());
  return res;
};

// Employee-specific functions

/**
 * Category functions (Emma's functions)
 */

/**
 * Create a new category in the knowledge base
 */
export const create_category = async ({
  uid,
  selectedCompany,
  name,
  description,
  link,
}: {
  uid: string;
  selectedCompany: string;
  name: string;
  description: string;
  link: string;
}) => {
  const res = await fetch(`/api/category/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      name,
      description,
      link,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get categories from the knowledge base
 */
export const get_categories = async ({
  uid,
  selectedCompany,
  limit,
  lastDocId,
}: {
  uid: string;
  selectedCompany: string;
  limit?: number;
  lastDocId?: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });
  
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  if (lastDocId) {
    params.append('lastDocId', lastDocId);
  }

  const res = await fetch(`/api/category?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Search categories in the knowledge base
 */
export const search_categories = async ({
  uid,
  selectedCompany,
  query,
  limit,
  lastDocId,
}: {
  uid: string;
  selectedCompany: string;
  query: string;
  limit?: number;
  lastDocId?: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
    query,
  });
  
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  if (lastDocId) {
    params.append('lastDocId', lastDocId);
  }

  const res = await fetch(`/api/category/search?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update an existing category
 */
export const update_category = async ({
  uid,
  selectedCompany,
  categoryId,
  name,
  description,
  link,
}: {
  uid: string;
  selectedCompany: string;
  categoryId: string;
  name?: string;
  description?: string;
  link?: string;
}) => {
  const res = await fetch(`/api/category/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      categoryId,
      name,
      description,
      link,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Delete a category
 */
export const delete_category = async ({
  uid,
  selectedCompany,
  categoryId,
}: {
  uid: string;
  selectedCompany: string;
  categoryId: string;
}) => {
  const res = await fetch(`/api/category/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      categoryId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Inbox functions (Charlie's functions)
 */

/**
 * Get support tickets from the help desk
 */
export const get_support_tickets = async ({
  uid,
  selectedCompany,
  limit,
  startAfter,
}: {
  uid: string;
  selectedCompany: string;
  limit?: number;
  startAfter?: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });
  
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  if (startAfter) {
    params.append('startAfter', startAfter);
  }

  const res = await fetch(`/api/inbox/tickets?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get messages for a specific ticket
 */
export const get_ticket_messages = async ({
  uid,
  selectedCompany,
  ticketId,
}: {
  uid: string;
  selectedCompany: string;
  ticketId: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
    ticketId,
  });

  const res = await fetch(`/api/inbox/messages?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get all response templates
 */
export const get_templates = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/inbox/templates?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Create a new response template
 */
export const create_template = async ({
  uid,
  selectedCompany,
  title,
  body,
}: {
  uid: string;
  selectedCompany: string;
  title: string;
  body: string;
}) => {
  const res = await fetch(`/api/inbox/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      title,
      body,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Update an existing response template
 */
export const update_template = async ({
  uid,
  selectedCompany,
  templateId,
  title,
  body,
}: {
  uid: string;
  selectedCompany: string;
  templateId: string;
  title?: string;
  body?: string;
}) => {
  const res = await fetch(`/api/inbox/templates/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      templateId,
      title,
      body,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Delete a response template
 */
export const delete_template = async ({
  uid,
  selectedCompany,
  templateId,
}: {
  uid: string;
  selectedCompany: string;
  templateId: string;
}) => {
  const res = await fetch(`/api/inbox/templates/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      templateId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Open a ticket
 */
export const open_ticket = async ({
  uid,
  selectedCompany,
  ticketId,
}: {
  uid: string;
  selectedCompany: string;
  ticketId: string;
}) => {
  const res = await fetch(`/api/inbox/ticket/open`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ticketId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Close a ticket
 */
export const close_ticket = async ({
  uid,
  selectedCompany,
  ticketId,
}: {
  uid: string;
  selectedCompany: string;
  ticketId: string;
}) => {
  const res = await fetch(`/api/inbox/ticket/close`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ticketId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Enable AI for a ticket
 */
export const enable_ticket_ai = async ({
  uid,
  selectedCompany,
  ticketId,
}: {
  uid: string;
  selectedCompany: string;
  ticketId: string;
}) => {
  const res = await fetch(`/api/inbox/ticket/ai/enable`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ticketId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Disable AI for a ticket
 */
export const disable_ticket_ai = async ({
  uid,
  selectedCompany,
  ticketId,
}: {
  uid: string;
  selectedCompany: string;
  ticketId: string;
}) => {
  const res = await fetch(`/api/inbox/ticket/ai/disable`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ticketId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get all email configurations
 */
export const get_emails = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/inbox/emails?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Send an email reply to a ticket
 */
export const send_email = async ({
  uid,
  selectedCompany,
  ticketId,
  to,
  subject,
  message,
  replyToId,
  references,
  currentFrom,
  fileUrls,
}: {
  uid: string;
  selectedCompany: string;
  ticketId: string;
  to: string;
  subject: string;
  message: string;
  replyToId?: string;
  references?: string;
  currentFrom?: string;
  fileUrls?: string;
}) => {
  // Parse JSON strings if provided
  let parsedCurrentFrom: any = undefined;
  let parsedFileUrls: any[] = [];

  if (currentFrom) {
    try {
      parsedCurrentFrom = typeof currentFrom === 'string' ? JSON.parse(currentFrom) : currentFrom;
    } catch (e) {
      // If parsing fails, use as-is
      parsedCurrentFrom = currentFrom;
    }
  }

  if (fileUrls) {
    try {
      parsedFileUrls = typeof fileUrls === 'string' ? JSON.parse(fileUrls) : fileUrls;
    } catch (e) {
      // If parsing fails, use empty array
      parsedFileUrls = [];
    }
  }

  const res = await fetch(`/api/inbox/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ticketId,
      to,
      subject,
      message,
      replyToId: replyToId || '',
      references: references || '',
      currentFrom: parsedCurrentFrom,
      fileUrls: parsedFileUrls,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get helpdesk settings
 */
export const get_helpdesk_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/helpdesk?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update helpdesk settings (email forwarding)
 */
export const update_helpdesk_settings = async ({
  uid,
  selectedCompany,
  defaultForward,
}: {
  uid: string;
  selectedCompany: string;
  defaultForward?: string;
}) => {
  const res = await fetch(`/api/settings/helpdesk`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      defaultForward,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Update AI suggestions setting for helpdesk
 */
export const update_helpdesk_ai_suggestions = async ({
  uid,
  selectedCompany,
  aiSuggestionsOn,
}: {
  uid: string;
  selectedCompany: string;
  aiSuggestionsOn: boolean;
}) => {
  const res = await fetch(`/api/settings/helpdesk/ai-suggestions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      aiSuggestionsOn,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Update AI messages setting for helpdesk
 */
export const update_helpdesk_ai_messages = async ({
  uid,
  selectedCompany,
  aiMessagesOn,
}: {
  uid: string;
  selectedCompany: string;
  aiMessagesOn: boolean;
}) => {
  const res = await fetch(`/api/settings/helpdesk/ai-messages`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      aiMessagesOn,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Live chat functions (Marquavious's functions)
 */

/**
 * Get live chat sessions
 */
export const get_live_chat_sessions = async ({
  uid,
  selectedCompany,
  limit,
  startAfter,
}: {
  uid: string;
  selectedCompany: string;
  limit?: number;
  startAfter?: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });
  
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  if (startAfter) {
    params.append('startAfter', startAfter);
  }

  const res = await fetch(`/api/livechat/sessions?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get a specific live chat session
 */
export const get_live_chat_session = async ({
  uid,
  selectedCompany,
  sessionId,
}: {
  uid: string;
  selectedCompany: string;
  sessionId: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/livechat/sessions/${sessionId}?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get all live chat settings
 */
export const get_live_chat_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/live-chat?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get basic live chat settings
 */
export const get_live_chat_basic_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/live-chat/basic?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update basic live chat settings
 */
export const update_live_chat_basic_settings = async ({
  uid,
  selectedCompany,
  enabled,
  position,
  theme,
  size,
}: {
  uid: string;
  selectedCompany: string;
  enabled?: boolean;
  position?: string;
  theme?: string;
  size?: string;
}) => {
  const res = await fetch(`/api/settings/live-chat/basic`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      enabled,
      position,
      theme,
      size,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get content live chat settings
 */
export const get_live_chat_content_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/live-chat/content?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update content live chat settings
 */
export const update_live_chat_content_settings = async ({
  uid,
  selectedCompany,
  welcomeMessage,
  placeholderText,
  companyName,
  offlineMessage,
}: {
  uid: string;
  selectedCompany: string;
  welcomeMessage?: string;
  placeholderText?: string;
  companyName?: string;
  offlineMessage?: string;
}) => {
  const res = await fetch(`/api/settings/live-chat/content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      welcomeMessage,
      placeholderText,
      companyName,
      offlineMessage,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get features live chat settings
 */
export const get_live_chat_features_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/live-chat/features?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update features live chat settings
 */
export const update_live_chat_features_settings = async ({
  uid,
  selectedCompany,
  showAvatar,
  showTypingIndicator,
  showOnlineStatus,
}: {
  uid: string;
  selectedCompany: string;
  showAvatar?: boolean;
  showTypingIndicator?: boolean;
  showOnlineStatus?: boolean;
}) => {
  const res = await fetch(`/api/settings/live-chat/features`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      showAvatar,
      showTypingIndicator,
      showOnlineStatus,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get appearance live chat settings
 */
export const get_live_chat_appearance_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/live-chat/appearance?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update appearance live chat settings
 */
export const update_live_chat_appearance_settings = async ({
  uid,
  selectedCompany,
  bubbleShape,
  bubbleIcon,
  customIconUrl,
  primaryColor,
  borderRadius,
}: {
  uid: string;
  selectedCompany: string;
  bubbleShape?: string;
  bubbleIcon?: string;
  customIconUrl?: string;
  primaryColor?: string;
  borderRadius?: number;
}) => {
  const res = await fetch(`/api/settings/live-chat/appearance`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      bubbleShape,
      bubbleIcon,
      customIconUrl,
      primaryColor,
      borderRadius,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get advanced live chat settings
 */
export const get_live_chat_advanced_settings = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/settings/live-chat/advanced?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Update advanced live chat settings
 */
export const update_live_chat_advanced_settings = async ({
  uid,
  selectedCompany,
  customCSS,
}: {
  uid: string;
  selectedCompany: string;
  customCSS?: string;
}) => {
  const res = await fetch(`/api/settings/live-chat/advanced`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      customCSS,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Training and metrics functions (Sung Wen's functions)
 */

/**
 * Get all training rules
 */
export const get_training_rules = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/training/rules?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Add a training rule
 */
export const add_training_rule = async ({
  uid,
  selectedCompany,
  text,
}: {
  uid: string;
  selectedCompany: string;
  text: string;
}) => {
  const res = await fetch(`/api/training/rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      text,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Update a training rule
 */
export const update_training_rule = async ({
  uid,
  selectedCompany,
  ruleId,
  text,
  enabled,
}: {
  uid: string;
  selectedCompany: string;
  ruleId: string;
  text?: string;
  enabled?: boolean;
}) => {
  const res = await fetch(`/api/training/rules`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ruleId,
      text,
      enabled,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Delete a training rule
 */
export const delete_training_rule = async ({
  uid,
  selectedCompany,
  ruleId,
}: {
  uid: string;
  selectedCompany: string;
  ruleId: string;
}) => {
  const res = await fetch(`/api/training/rules`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      ruleId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Refresh knowledge base
 */
export const refresh_knowledge_base = async ({
  uid,
  selectedCompany,
  forceRefresh,
  waitForIndexing,
}: {
  uid: string;
  selectedCompany: string;
  forceRefresh?: boolean;
  waitForIndexing?: boolean;
}) => {
  const res = await fetch(`/api/training/refreshknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      forceRefresh,
      waitForIndexing,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get all FAQs
 */
export const get_faqs = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/training/faq?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Create a FAQ
 */
export const create_faq = async ({
  uid,
  selectedCompany,
  question,
  answer,
}: {
  uid: string;
  selectedCompany: string;
  question: string;
  answer: string;
}) => {
  const res = await fetch(`/api/training/faq`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      question,
      answer,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Update a FAQ
 */
export const update_faq = async ({
  uid,
  selectedCompany,
  faqId,
  question,
  answer,
  enabled,
}: {
  uid: string;
  selectedCompany: string;
  faqId: string;
  question?: string;
  answer?: string;
  enabled?: boolean;
}) => {
  const res = await fetch(`/api/training/faq`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      faqId,
      question,
      answer,
      enabled,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Delete a FAQ
 */
export const delete_faq = async ({
  uid,
  selectedCompany,
  faqId,
}: {
  uid: string;
  selectedCompany: string;
  faqId: string;
}) => {
  const res = await fetch(`/api/training/faq`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      faqId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Get live visitors
 */
export const get_live_visitors = async ({
  uid,
  selectedCompany,
}: {
  uid: string;
  selectedCompany: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/metrics/live-visitors?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get metrics overview
 */
export const get_metrics_overview = async ({
  uid,
  selectedCompany,
  startDate,
  endDate,
}: {
  uid: string;
  selectedCompany: string;
  startDate: string;
  endDate: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
    startDate,
    endDate,
  });

  const res = await fetch(`/api/metrics/overview?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get top countries
 */
export const get_top_countries = async ({
  uid,
  selectedCompany,
  limit,
}: {
  uid: string;
  selectedCompany: string;
  limit?: number;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }

  const res = await fetch(`/api/metrics/top-countries?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get top referrers
 */
export const get_top_referrers = async ({
  uid,
  selectedCompany,
  limit,
}: {
  uid: string;
  selectedCompany: string;
  limit?: number;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }

  const res = await fetch(`/api/metrics/top-referrers?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get top pages
 */
export const get_top_pages = async ({
  uid,
  selectedCompany,
  startDate,
  endDate,
  limit,
}: {
  uid: string;
  selectedCompany: string;
  startDate: string;
  endDate: string;
  limit?: number;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
    startDate,
    endDate,
  });

  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }

  const res = await fetch(`/api/metrics/top-pages?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Article functions (Emma's functions)
 */

/**
 * Get articles from the knowledge base
 */
export const get_articles = async ({
  uid,
  selectedCompany,
  categoryId,
  limit,
  lastDocId,
}: {
  uid: string;
  selectedCompany: string;
  categoryId?: string;
  limit?: number;
  lastDocId?: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });
  
  if (categoryId) {
    params.append('categoryId', categoryId);
  }
  
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  if (lastDocId) {
    params.append('lastDocId', lastDocId);
  }

  const res = await fetch(`/api/articles?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Search articles in the knowledge base
 */
export const search_articles = async ({
  uid,
  selectedCompany,
  query,
  categoryId,
  limit,
  lastDocId,
}: {
  uid: string;
  selectedCompany: string;
  query: string;
  categoryId?: string;
  limit?: number;
  lastDocId?: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
    query,
  });
  
  if (categoryId) {
    params.append('categoryId', categoryId);
  }
  
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  if (lastDocId) {
    params.append('lastDocId', lastDocId);
  }

  const res = await fetch(`/api/articles/search?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Get a specific article by ID
 */
export const get_article = async ({
  uid,
  selectedCompany,
  articleId,
}: {
  uid: string;
  selectedCompany: string;
  articleId: string;
}) => {
  const params = new URLSearchParams({
    uid,
    selectedCompany,
  });

  const res = await fetch(`/api/articles/${articleId}?${params.toString()}`).then((res) => res.json());

  return res;
};

/**
 * Create a new article
 */
export const create_article = async ({
  uid,
  selectedCompany,
  categoryId,
  title,
  description,
  link,
  content,
  rawText,
  published,
}: {
  uid: string;
  selectedCompany: string;
  categoryId: string;
  title: string;
  description: string;
  link: string;
  content?: string;
  rawText?: string;
  published?: boolean;
}) => {
  const res = await fetch(`/api/articles/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      categoryId,
      title,
      description,
      link,
      content,
      rawText,
      published,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Update an existing article
 */
export const update_article = async ({
  uid,
  selectedCompany,
  categoryId,
  articleId,
  title,
  description,
  link,
  published,
  fav,
  content,
  rawText,
  newCategoryId,
}: {
  uid: string;
  selectedCompany: string;
  categoryId: string;
  articleId: string;
  title?: string;
  description?: string;
  link?: string;
  published?: boolean;
  fav?: boolean;
  content?: string;
  rawText?: string;
  newCategoryId?: string;
}) => {
  const res = await fetch(`/api/articles/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      categoryId,
      articleId,
      title,
      description,
      link,
      published,
      fav,
      content,
      rawText,
      newCategoryId,
    }),
  }).then((res) => res.json());

  return res;
};

/**
 * Delete an article
 */
export const delete_article = async ({
  uid,
  selectedCompany,
  categoryId,
  articleId,
}: {
  uid: string;
  selectedCompany: string;
  categoryId: string;
  articleId: string;
}) => {
  const res = await fetch(`/api/articles/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      selectedCompany,
      categoryId,
      articleId,
    }),
  }).then((res) => res.json());

  return res;
};

export const functionsMap = {
  get_weather: get_weather,
  get_joke: get_joke,
  create_category: create_category,
  get_categories: get_categories,
  search_categories: search_categories,
  update_category: update_category,
  delete_category: delete_category,
  get_support_tickets: get_support_tickets,
  get_ticket_messages: get_ticket_messages,
  get_templates: get_templates,
  create_template: create_template,
  update_template: update_template,
  delete_template: delete_template,
  open_ticket: open_ticket,
  close_ticket: close_ticket,
  enable_ticket_ai: enable_ticket_ai,
  disable_ticket_ai: disable_ticket_ai,
  get_emails: get_emails,
  send_email: send_email,
  get_helpdesk_settings: get_helpdesk_settings,
  update_helpdesk_settings: update_helpdesk_settings,
  update_helpdesk_ai_suggestions: update_helpdesk_ai_suggestions,
  update_helpdesk_ai_messages: update_helpdesk_ai_messages,
  get_live_chat_sessions: get_live_chat_sessions,
  get_live_chat_session: get_live_chat_session,
  get_live_chat_settings: get_live_chat_settings,
  get_live_chat_basic_settings: get_live_chat_basic_settings,
  update_live_chat_basic_settings: update_live_chat_basic_settings,
  get_live_chat_content_settings: get_live_chat_content_settings,
  update_live_chat_content_settings: update_live_chat_content_settings,
  get_live_chat_features_settings: get_live_chat_features_settings,
  update_live_chat_features_settings: update_live_chat_features_settings,
  get_live_chat_appearance_settings: get_live_chat_appearance_settings,
  update_live_chat_appearance_settings: update_live_chat_appearance_settings,
  get_live_chat_advanced_settings: get_live_chat_advanced_settings,
  update_live_chat_advanced_settings: update_live_chat_advanced_settings,
  get_training_rules: get_training_rules,
  add_training_rule: add_training_rule,
  update_training_rule: update_training_rule,
  delete_training_rule: delete_training_rule,
  refresh_knowledge_base: refresh_knowledge_base,
  get_faqs: get_faqs,
  create_faq: create_faq,
  update_faq: update_faq,
  delete_faq: delete_faq,
  get_live_visitors: get_live_visitors,
  get_metrics_overview: get_metrics_overview,
  get_top_countries: get_top_countries,
  get_top_referrers: get_top_referrers,
  get_top_pages: get_top_pages,
  get_articles: get_articles,
  search_articles: search_articles,
  get_article: get_article,
  create_article: create_article,
  update_article: update_article,
  delete_article: delete_article,
};

