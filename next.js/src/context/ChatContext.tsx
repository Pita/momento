"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Types for messages and chats
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Updated ChatSummary without messages.
export type ChatSummary = {
  id: string; // standardized date stamp (e.g., "2023-10-11")
};

// New type for full chat details including messages.
export type ChatDetail = ChatSummary & {
  messages: ChatMessage[];
};

interface ChatContextType {
  chatSummaries: ChatSummary[];
  currentChat: ChatDetail | null;
  selectChat: (chat: ChatSummary) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// In-memory storage for chats (the "mock database") now holds full chat details
const mockChats: ChatDetail[] = [];
const MOCK_DELAY = 500;

// Simulated endpoint to fetch old chats
// REST endpoint: GET /api/chats
async function fetchOldChats(): Promise<ChatSummary[]> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(mockChats.map((chat) => ({ id: chat.id }))),
      MOCK_DELAY
    );
  });
}

// Simulated endpoint to start a new chat for today
// REST endpoint: POST /api/chats
async function startNewChat(): Promise<ChatDetail> {
  const today = new Date().toISOString().split("T")[0];
  const newChat: ChatDetail = {
    id: today,
    messages: [
      {
        role: "assistant",
        content: "Hello, tell me about your day.",
      },
    ],
  };
  mockChats.push(newChat);
  return new Promise((resolve) => {
    setTimeout(() => resolve(newChat), MOCK_DELAY);
  });
}

// Simulated sending of a message
// REST endpoint: POST /api/chats/:chatId/messages
async function* sendMessageToChat(
  content: string,
  chatSummary: ChatSummary // eslint-disable-line @typescript-eslint/no-unused-vars
): AsyncGenerator<string> {
  const mockResponse = "Assistant mock response to: " + content;
  const words = mockResponse.split(" ");

  for (const word of words) {
    await new Promise((resolve) =>
      setTimeout(resolve, MOCK_DELAY / words.length)
    );
    yield word + " ";
  }
}

// Simulated endpoint to load the full details of a chat
// REST endpoint: GET /api/chats/:chatId
async function loadChatDetails(chatId: string): Promise<ChatDetail> {
  return new Promise((resolve, reject) => {
    const chat = mockChats.find((c) => c.id === chatId);
    setTimeout(() => {
      if (chat) {
        resolve(chat);
      } else {
        reject(new Error("Chat not found"));
      }
    }, MOCK_DELAY);
  });
}

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

    const stream = sendMessageToChat(text, currentChat);
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
