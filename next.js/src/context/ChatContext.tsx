"use client";

import {
  ChatSummary,
  ChatDetail,
  fetchOldChats,
  loadChatDetails,
  startNewChat,
  ChatMessage,
  sendMessageToChat,
} from "@/lib/chats";
import React, { createContext, useContext, useState, useEffect } from "react";

interface ChatContextType {
  chatSummaries: ChatSummary[];
  currentChat: ChatDetail | null;
  selectChat: (chat: ChatSummary) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ChatProvider component that holds the chat state and exposes context functions
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatDetail | null>(null);

  // On mount, initialize chats
  useEffect(() => {
    async function initChat() {
      const summaries = await fetchOldChats();
      setChatSummaries(summaries);

      const today = new Date().toISOString().split("T")[0];
      // Try to find today's chat detail in the in-memory storage
      const todaysChatExists = summaries.find((chat) => chat.id === today);
      if (todaysChatExists) {
        setCurrentChat(await loadChatDetails(today));
      } else {
        setCurrentChat(await startNewChat());
        setChatSummaries((prev) => [...prev, { id: today }]);
      }
    }
    initChat();
  }, []);

  // Function to select a chat from the sidebar by loading its details
  // REST endpoint: GET /api/chats/:chatId/messages
  const selectChat = async (chat: ChatSummary) => {
    try {
      const fullChat = await loadChatDetails(chat.id);
      setCurrentChat(fullChat);
    } catch (e) {
      console.error(e);
      alert("Chat details not found.");
    }
  };

  // Function to send a user message, then simulate an assistant response
  // REST endpoint: POST /api/chats/:chatId/messages
  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentChat) return;

    // Immediately add user message to state
    const userMessage: ChatMessage = { role: "user", content: text };
    const previousMessages = [...currentChat.messages, userMessage];
    setCurrentChat({
      ...currentChat,
      messages: previousMessages,
    });

    const stream = await sendMessageToChat(text, currentChat);
    let currentAssistantMessage = "";

    // Update assistant message as stream comes in
    for await (const chunk of stream) {
      currentAssistantMessage += chunk;
      setCurrentChat({
        ...currentChat,
        messages: [
          ...previousMessages,
          { role: "assistant", content: currentAssistantMessage },
        ],
      });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chatSummaries,
        currentChat,
        selectChat,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook for easy access to the ChatContext
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
