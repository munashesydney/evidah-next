"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Chat from "./chat";
import useConversationStore from "@/stores/chat/useConversationStore";
import { Item, processMessages } from "@/lib/chat/assistant";

export default function Assistant() {
  const params = useParams();
  const selectedCompany = params.selectedCompany as string;
  const [uid, setUid] = useState<string | null>(null);
  
  const { chatMessages, addConversationItem, addChatMessage, setAssistantLoading } =
    useConversationStore();

  // Get uid from auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setUid(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    if (!uid || !selectedCompany) {
      console.error("Missing uid or selectedCompany");
      return;
    }

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
      await processMessages(uid, selectedCompany);
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

