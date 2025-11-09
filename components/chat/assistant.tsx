"use client";
import React from "react";
import Chat from "./chat";
import useConversationStore from "@/stores/chat/useConversationStore";
import { Item, processMessages } from "@/lib/chat/assistant";

export default function Assistant() {
  const { chatMessages, addConversationItem, addChatMessage, setAssistantLoading } =
    useConversationStore();

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };
    const userMessage: any = {
      role: "user",
      content: message.trim(),
    };

    try {
      setAssistantLoading(true);
      addConversationItem(userMessage);
      addChatMessage(userItem);
      await processMessages();
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  return (
    <div className="h-full p-4 w-full bg-white dark:bg-gray-900">
      <Chat
        items={chatMessages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

