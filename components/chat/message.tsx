import { MessageItem } from "@/lib/chat/assistant";
import React from "react";
import ReactMarkdown from "react-markdown";

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
      {/* Bot Avatar - Left side */}
      {!isUser && (
        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${employee.theme.gradient} flex items-center justify-center text-white font-bold mr-3 shrink-0 shadow-lg`}>
          {employee.name.charAt(0)}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`max-w-[75%] sm:max-w-[70%] ${
          isUser
            ? `bg-gradient-to-r ${employee.theme.gradient} text-white rounded-2xl rounded-tr-md shadow-lg`
            : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-md shadow-lg border border-gray-200/50 dark:border-gray-700/50'
        } p-4 break-words backdrop-blur-sm`}
      >
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ inline, children, ...props }: any) =>
                inline ? (
                  <code className={`${isUser ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'} px-1.5 py-0.5 rounded text-sm`} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={`block ${isUser ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'} p-3 rounded-lg text-sm overflow-x-auto`} {...props}>
                    {children}
                  </code>
                ),
              a: ({ children, href }) => (
                <a href={href} className={`${isUser ? 'text-white underline' : 'text-violet-600 dark:text-violet-400 hover:underline'}`} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
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
                  className="mt-3 max-w-full rounded-lg shadow-md"
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

