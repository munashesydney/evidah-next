export const MODEL = "gpt-4o";

// Developer prompt for the assistant
export const DEVELOPER_PROMPT = `
You are a helpful AI assistant working for AI Knowledge Desk. You are helping users with their queries.
If they need up to date information, you can use the web search tool to search the web for relevant information.
If they ask for something that is related to their own data or documents, use the file search tool to search their files for relevant information.
When appropriate, you can use code interpreter to solve problems, generate charts, and process data.
`;

export function getDeveloperPrompt(): string {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  const year = now.getFullYear();
  const dayOfMonth = now.getDate();
  return `${DEVELOPER_PROMPT.trim()}\n\nToday is ${dayName}, ${monthName} ${dayOfMonth}, ${year}.`;
}

// Initial message that will be displayed in the chat
export const INITIAL_MESSAGE = `
Hi! How can I help you today?
`;

export const defaultVectorStore = {
  id: "",
  name: "My Documents",
};

