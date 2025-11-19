"use client";
import React from "react";
import FunctionsView from "./functions-view";
import useToolsStore from "@/stores/chat/useToolsStore";

export default function ToolsPanel() {
  const {
    fileSearchEnabled,
    setFileSearchEnabled,
    webSearchEnabled,
    setWebSearchEnabled,
    functionsEnabled,
    setFunctionsEnabled,
    codeInterpreterEnabled,
    setCodeInterpreterEnabled,
  } = useToolsStore();

  return (
    <div className="h-full p-6 w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Tools Configuration</h2>
      
      <div className="space-y-6">
        {/* Web Search */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Web Search</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Search the web for information</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={webSearchEnabled}
                onChange={(e) => setWebSearchEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-500 dark:peer-checked:bg-violet-500"></div>
            </label>
          </div>
        </div>

        {/* File Search */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">File Search</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Search your company's knowledge base articles</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={fileSearchEnabled}
                onChange={(e) => setFileSearchEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-500 dark:peer-checked:bg-violet-500"></div>
            </label>
          </div>
        </div>

        {/* Code Interpreter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Code Interpreter</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Run Python code and generate charts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={codeInterpreterEnabled}
                onChange={(e) => setCodeInterpreterEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-500 dark:peer-checked:bg-violet-500"></div>
            </label>
          </div>
        </div>

        {/* Functions */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Functions</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Use custom functions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={functionsEnabled}
                onChange={(e) => setFunctionsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-500 dark:peer-checked:bg-violet-500"></div>
            </label>
          </div>
          {functionsEnabled && (
            <div className="mt-4 pl-4 border-l-2 border-violet-500">
              <FunctionsView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

