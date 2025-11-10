export const MODEL = "gpt-4o";

// Personality level descriptions
const PERSONALITY_LEVELS = {
  0: {
    name: 'Very Playful',
    description: 'Casual, fun, and relaxed communication style',
    instructions: 'Use a very casual, playful, and relaxed tone. Feel free to use emojis, casual language, jokes, and friendly banter. Be enthusiastic and approachable. Keep it light and fun while still being helpful.',
  },
  1: {
    name: 'Balanced',
    description: 'Friendly yet professional approach',
    instructions: 'Use a friendly yet professional tone. Be warm and approachable, but maintain a professional demeanor. You can be conversational but avoid being too casual or too formal. Strike a balance between being helpful and personable.',
  },
  2: {
    name: 'Professional',
    description: 'Formal and business-focused communication',
    instructions: 'Use a professional and business-focused tone. Be clear, concise, and respectful. Avoid casual language, emojis, or jokes. Maintain a formal but not overly stiff communication style. Focus on being helpful and efficient.',
  },
  3: {
    name: 'Very Professional',
    description: 'Strictly formal and corporate tone',
    instructions: 'Use a strictly formal and corporate tone. Be extremely professional, formal, and business-like. Use proper business language, avoid any casual expressions, emojis, or humor. Maintain a serious, corporate communication style at all times.',
  },
};

// Base developer prompt template
export const DEVELOPER_PROMPT_TEMPLATE = `
You are {employeeName}, a {employeeRole} AI assistant working for {companyName}. You are helping users with their queries and tasks.

Your role and capabilities:
{employeeCapabilities}

Communication Style and Personality:
{personalityInstructions}

If they need up to date information, you can use the web search tool to search the web for relevant information.
If they ask for something that is related to their own data or documents, use the file search tool to search their files for relevant information.
When appropriate, you can use code interpreter to solve problems, generate charts, and process data.

Always respond in a manner that aligns with your role as {employeeName} and your communication style.
`;

export async function getDeveloperPrompt(
  uid?: string,
  selectedCompany?: string,
  employeeId?: string,
  personalityLevel: number = 2
): Promise<string> {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  const year = now.getFullYear();
  const dayOfMonth = now.getDate();

  // Default values
  let companyName = 'the company';
  let employeeName = 'an AI assistant';
  let employeeRole = 'helpful';
  let employeeCapabilities = 'Helping users with their queries and tasks.';

  // Fetch company name if uid and selectedCompany are provided
  if (uid && selectedCompany) {
    try {
      const { getCompanyName } = await import('@/lib/services/knowledge-base-helpers');
      const name = await getCompanyName(uid, selectedCompany);
      if (name && name !== 'Company Name') {
        companyName = name;
      }
    } catch (error) {
      console.error('[PROMPT] Error fetching company name:', error);
    }
  }

  // Get employee info if employeeId is provided
  if (employeeId) {
    try {
      const { getEmployee } = await import('@/lib/services/employee-helpers');
      const employee = getEmployee(employeeId);
      if (employee) {
        employeeName = employee.name;
        employeeRole = employee.role;
        employeeCapabilities = employee.capabilities
          .map((cap) => `• ${cap}`)
          .join('\n');
      }
    } catch (error) {
      console.error('[PROMPT] Error fetching employee info:', error);
    }
  }

  // Get personality instructions (clamp to valid range 0-3)
  const clampedPersonalityLevel = Math.max(0, Math.min(3, Math.round(personalityLevel)));
  const personality = PERSONALITY_LEVELS[clampedPersonalityLevel as keyof typeof PERSONALITY_LEVELS] || PERSONALITY_LEVELS[2];
  const personalityInstructions = personality.instructions;

  // Build the personalized prompt
  let prompt = DEVELOPER_PROMPT_TEMPLATE
    .replace(/{companyName}/g, companyName)
    .replace(/{employeeName}/g, employeeName)
    .replace(/{employeeRole}/g, employeeRole)
    .replace(/{employeeCapabilities}/g, employeeCapabilities)
    .replace(/{personalityInstructions}/g, personalityInstructions);

  // Add date
  prompt += `\n\nToday is ${dayName}, ${monthName} ${dayOfMonth}, ${year}.`;

  return prompt.trim();
}

// Initial message that will be displayed in the chat
export const INITIAL_MESSAGE = `
Hi! How can I help you today?
`;

