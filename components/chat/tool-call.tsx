import React, { useState, useEffect } from "react";

import { ToolCallItem } from "@/lib/chat/assistant";
import { BookOpenText, Clock, Globe, Zap, Code2, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ToolCallProps {
  toolCall: ToolCallItem;
}

function ApiCallCell({ toolCall }: ToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Inject dark mode styles for syntax highlighter
  useEffect(() => {
    const styleId = 'tool-call-syntax-dark-mode';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .dark .tool-call-syntax pre,
      .dark .tool-call-syntax code {
        color: #e5e7eb !important;
      }
      .dark .tool-call-syntax .token.string {
        color: #a78bfa !important;
      }
      .dark .tool-call-syntax .token.number {
        color: #60a5fa !important;
      }
      .dark .tool-call-syntax .token.boolean {
        color: #f472b6 !important;
      }
      .dark .tool-call-syntax .token.null {
        color: #9ca3af !important;
      }
      .dark .tool-call-syntax .token.punctuation {
        color: #d1d5db !important;
      }
      .dark .tool-call-syntax .token.property {
        color: #34d399 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
      <div className="flex flex-col w-[70%] relative mb-[-8px]">
        <div>
          <div className="flex flex-col text-sm rounded-[16px]">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="font-semibold p-3 pl-0 text-gray-700 dark:text-gray-300 rounded-b-none flex gap-2 items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="flex gap-2 items-center text-violet-500 ml-[-8px]">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Zap size={16} />
                <div className="text-sm font-medium">
                  {toolCall.status === "completed"
                    ? `Called ${toolCall.name}`
                    : `Calling ${toolCall.name}...`}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl py-2 ml-4 mt-2">
                <div className="max-h-96 overflow-y-scroll text-xs border-b border-gray-200 dark:border-gray-700 mx-6 p-2">
                  <div className="text-gray-600 dark:text-gray-400 mb-1 text-[10px] font-medium uppercase tracking-wide">
                    Arguments
                  </div>
                  <div className="tool-call-syntax">
                    <SyntaxHighlighter
                      customStyle={{
                        backgroundColor: "transparent",
                        padding: "8px",
                        paddingLeft: "0px",
                        marginTop: 0,
                        marginBottom: 0,
                      }}
                      language="json"
                      style={coy}
                      PreTag="div"
                    >
                      {JSON.stringify(toolCall.parsedArguments, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-scroll mx-6 p-2 text-xs">
                  {toolCall.output ? (
                    <>
                      <div className="text-gray-600 dark:text-gray-400 mb-1 text-[10px] font-medium uppercase tracking-wide">
                        Output
                      </div>
                      <div className="tool-call-syntax">
                        <SyntaxHighlighter
                          customStyle={{
                            backgroundColor: "transparent",
                            padding: "8px",
                            paddingLeft: "0px",
                            marginTop: 0,
                          }}
                          language="json"
                          style={coy}
                          PreTag="div"
                        >
                          {JSON.stringify(JSON.parse(toolCall.output), null, 2)}
                        </SyntaxHighlighter>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2 py-2">
                      <Clock size={16} /> Waiting for result...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

function FileSearchCell({ toolCall }: ToolCallProps) {
  return (
    <div className="flex gap-2 items-center text-violet-500 mb-[-16px] ml-[-8px]">
      <BookOpenText size={16} />
      <div className="text-sm font-medium mb-0.5">
        {toolCall.status === "completed"
          ? "Searched files"
          : "Searching files..."}
      </div>
    </div>
  );
}

function WebSearchCell({ toolCall }: ToolCallProps) {
  return (
    <div className="flex gap-2 items-center text-violet-500 mb-[-16px] ml-[-8px]">
      <Globe size={16} />
      <div className="text-sm font-medium">
        {toolCall.status === "completed"
          ? "Searched the web"
          : "Searching the web..."}
      </div>
    </div>
  );
}

function CodeInterpreterCell({ toolCall }: ToolCallProps) {
  return (
    <div className="flex flex-col w-[70%] relative mb-[-8px]">
      <div className="flex flex-col text-sm rounded-[16px]">
        <div className="font-semibold p-3 pl-0 text-gray-700 dark:text-gray-300 rounded-b-none flex gap-2">
          <div className="flex gap-2 items-center text-violet-500 ml-[-8px]">
            <Code2 size={16} />
            <div className="text-sm font-medium">
              {toolCall.status === "completed"
                ? "Code executed"
                : "Running code interpreter..."}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl py-2 ml-4 mt-2">
          <div className="mx-6 p-2 text-xs">
            <SyntaxHighlighter
              customStyle={{
                backgroundColor: "transparent",
                padding: "8px",
                paddingLeft: "0px",
                marginTop: 0,
              }}
              language="python"
              style={coy}
            >
              {toolCall.code || ""}
            </SyntaxHighlighter>
          </div>
        </div>
        {toolCall.files && toolCall.files.length > 0 && (
          <div className="flex gap-2 mt-2 ml-4 flex-wrap">
            {toolCall.files.map((f) => (
              <a
                key={f.file_id}
                href={`/api/chat/container_files/content?file_id=${f.file_id}${
                  f.container_id ? `&container_id=${f.container_id}` : ""
                }${
                  f.filename
                    ? `&filename=${encodeURIComponent(f.filename)}`
                    : ""
                }`}
                download
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300"
              >
                {f.filename || f.file_id}
                <Download size={12} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToolCall({ toolCall }: ToolCallProps) {
  return (
    <div className="flex justify-start pt-2">
      {(() => {
        switch (toolCall.tool_type) {
          case "function_call":
            return <ApiCallCell toolCall={toolCall} />;
          case "file_search_call":
            return <FileSearchCell toolCall={toolCall} />;
          case "web_search_call":
            return <WebSearchCell toolCall={toolCall} />;
          case "code_interpreter_call":
            return <CodeInterpreterCell toolCall={toolCall} />;
          default:
            return null;
        }
      })()}
    </div>
  );
}

