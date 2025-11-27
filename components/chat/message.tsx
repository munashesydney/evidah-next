import { MessageItem } from "@/lib/chat/assistant";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  theme: {
    primary: string
    gradient: string
  }
  capabilities?: string[]
}

const defaultEmployee: Employee = {
  id: 'assistant',
  name: 'Assistant',
  role: 'AI Assistant',
  avatar: '',
  theme: {
    primary: '#6366F1',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  capabilities: [],
};

interface MessageProps {
  message: MessageItem;
  employee?: Employee;
}

const Message: React.FC<MessageProps> = ({ message, employee = defaultEmployee }) => {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex items-start mb-6 last:mb-0 ${isUser ? 'justify-end' : ''}`}>
      {/* Message Content */}
      <div
        className={`${
          isUser ? 'max-w-[75%] sm:max-w-[70%]' : 'flex-1'
        } ${
          isUser
            ? `bg-gradient-to-r ${employee.theme.gradient} text-white rounded-2xl  shadow-lg`
            : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 rounded-2xl  shadow-lg border border-gray-200/50 dark:border-gray-700/50'
        } p-5 break-words backdrop-blur-sm mt-4`}
      >
        <div className={`markdown-content ${isUser ? 'markdown-user' : 'markdown-assistant'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              // Headings with better styling
              h1: ({ children }) => (
                <h1 className={`text-2xl font-bold mb-4 mt-6 first:mt-0 pb-2 border-b ${isUser ? 'border-white/20 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}`}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className={`text-xl font-bold mb-3 mt-5 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className={`text-lg font-semibold mb-2 mt-4 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className={`text-base font-semibold mb-2 mt-3 first:mt-0 ${isUser ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                  {children}
                </h4>
              ),
              // Paragraphs with proper spacing
              p: ({ children }) => (
                <p className={`mb-4 last:mb-0 leading-7 ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {children}
                </p>
              ),
              // Unordered lists with better styling
              ul: ({ children }) => (
                <ul className={`mb-4 space-y-2 ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {children}
                </ul>
              ),
              // Ordered lists
              ol: ({ children }) => (
                <ol className={`mb-4 space-y-2 ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {children}
                </ol>
              ),
              // List items with custom bullets
              li: ({ children }) => (
                <li className="ml-6 leading-7">
                  <span className="pl-2">{children}</span>
                </li>
              ),
              // Inline code
              code: ({ inline, className, children, ...props }: any) => {
                if (inline) {
                  return (
                    <code 
                      className={`${
                        isUser 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-400'
                      } px-1.5 py-0.5 rounded text-[0.9em] font-mono`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                // Block code
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                return (
                  <div className="my-4 rounded-lg overflow-hidden">
                    {language && (
                      <div className={`${isUser ? 'bg-white/10' : 'bg-gray-700 dark:bg-gray-900'} px-4 py-2 text-xs font-mono ${isUser ? 'text-white/80' : 'text-gray-300'}`}>
                        {language}
                      </div>
                    )}
                    <pre className={`${isUser ? 'bg-white/10' : 'bg-gray-800 dark:bg-gray-950'} p-4 overflow-x-auto`}>
                      <code className={`${className} text-sm font-mono ${isUser ? 'text-white' : ''}`} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
              // Blockquotes
              blockquote: ({ children }) => (
                <blockquote className={`border-l-4 ${isUser ? 'border-white/40 bg-white/10' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'} pl-4 py-2 my-4 italic`}>
                  {children}
                </blockquote>
              ),
              // Links
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  className={`${
                    isUser 
                      ? 'text-white underline decoration-white/50 hover:decoration-white' 
                      : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-600/30 hover:decoration-blue-600'
                  } transition-colors`}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              // Tables
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto">
                  <table className={`min-w-full border-collapse ${isUser ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className={`${isUser ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-800'}`}>
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className={`px-4 py-2 text-left font-semibold border ${isUser ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className={`px-4 py-2 border ${isUser ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  {children}
                </td>
              ),
              // Horizontal rule
              hr: () => (
                <hr className={`my-6 border-t ${isUser ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`} />
              ),
              // Strong (bold)
              strong: ({ children }) => (
                <strong className="font-semibold">
                  {children}
                </strong>
              ),
              // Emphasis (italic)
              em: ({ children }) => (
                <em className="italic">
                  {children}
                </em>
              ),
            }}
          >
            {message.content[0].text as string}
          </ReactMarkdown>
          
          {/* Image annotations */}
          {message.content[0].annotations &&
            message.content[0].annotations
              .filter(
                (a) =>
                  a.type === "container_file_citation" &&
                  a.filename &&
                  /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(a.filename)
              )
              .map((a, i) => (
                <img
                  key={i}
                  src={`/api/chat/container_files/content?file_id=${a.fileId}${a.containerId ? `&container_id=${a.containerId}` : ""}${a.filename ? `&filename=${encodeURIComponent(a.filename)}` : ""}`}
                  alt={a.filename || ""}
                  className="mt-4 max-w-full rounded-lg shadow-md"
                />
              ))}
        </div>
      </div>

      {/* User Avatar - Right side */}
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-white font-bold ml-3 shrink-0 shadow-lg">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default Message;

