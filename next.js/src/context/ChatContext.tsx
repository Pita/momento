"use client";

import { getTodayDateStr } from "@/lib/date";
import {
  ChatSummary,
  serverFetchOldChats,
  serverLoadChatDetails,
  serverStartNewChat,
  serverSendMessageToChat,
  serverStartAgentChat,
} from "@/lib/server";
import {
  AgentChat,
  AgentInitReason,
  ChatMessage,
  ChatState,
} from "@/lib/dbSchemas";
import React, { createContext, useContext, useState, useEffect } from "react";
import { addMessageToLastAgentChat, updateLastMessage } from "@/lib/chatState";

type ChatLifecycleState = "nonExistent" | "ready" | "sending" | "concluded";

interface ChatContextType {
  chatSummaries: ChatSummary[];
  currentChat: ChatState | null;
  sendMessage: (text: string) => Promise<void>;
  chatLifecycleState: ChatLifecycleState | null;
  canChatConclude: boolean;
  concludeChat: () => Promise<void>;
  startAgentChat: (
    agentId: string,
    initReason: AgentInitReason
  ) => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  selectNonExistentChat: (chatId: string) => void;
  initNonExistentChat: (chatId: string) => Promise<void>;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ChatProvider component that holds the chat state and exposes context functions
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatState | null>(null);
  const [chatLifecycleState, setChatLifecycleState] =
    useState<ChatLifecycleState | null>(null);

  // On mount, initialize chats
  useEffect(() => {
    async function initChat() {
      const summaries = await serverFetchOldChats();
      setChatSummaries(summaries);

      const today = getTodayDateStr();
      // Try to find today's chat detail in the in-memory storage
      const todaysChatExists = summaries.find((chat) => chat.id === today);
      if (todaysChatExists) {
        setCurrentChat(await serverLoadChatDetails(today));
        setChatLifecycleState("ready");
      }
    }
    initChat();
  }, []);

  const initNonExistentChat = async (chatId: string) => {
    setChatLifecycleState("sending");
    const { chat, welcomeMessageStream } = await serverStartNewChat(chatId);
    setChatSummaries((prev) => [...prev, { id: chatId }]);
    const currentAssistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
    };

    let updatedChat = addMessageToLastAgentChat(chat, currentAssistantMessage);

    setCurrentChat(updatedChat);

    for await (const chunk of welcomeMessageStream) {
      currentAssistantMessage.content += chunk;
      updatedChat = updateLastMessage(updatedChat, currentAssistantMessage);
      setCurrentChat(updatedChat);
    }
    setChatLifecycleState("ready");
  };

  const selectNonExistentChat = (chatId: string) => {
    setCurrentChat({
      id: chatId,
      version: "1",
      agentChats: [],
      agentsRelevantToToday: null,
    });
    setChatLifecycleState("nonExistent");
  };

  // Function to select a chat from the sidebar by loading its details
  const selectChat = async (chatId: string) => {
    if (chatId === currentChat?.id) {
      return;
    }
    const fullChat = await serverLoadChatDetails(chatId);
    setChatLifecycleState("ready");
    setCurrentChat(fullChat);
  };

  // Function to send a user message, then simulate an assistant response
  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentChat) return;
    setChatLifecycleState("sending");

    // Immediately add user message to state
    const userMessage: ChatMessage = { role: "user", content: text };
    let updatedChat = addMessageToLastAgentChat(currentChat!, userMessage);
    setCurrentChat(updatedChat);

    const stream = await serverSendMessageToChat(text, currentChat.id);
    let currentAssistantMessage = "";
    updatedChat = addMessageToLastAgentChat(updatedChat, {
      role: "assistant",
      content: "",
    });

    // Update assistant message as stream comes in
    for await (const chunk of stream) {
      currentAssistantMessage += chunk;
      updatedChat = updateLastMessage(updatedChat, {
        role: "assistant",
        content: currentAssistantMessage,
      });
      setCurrentChat(updatedChat);
    }
    setChatLifecycleState("ready");
  };

  const canChatConclude = () => {
    if (!currentChat || chatLifecycleState !== "ready") {
      return false;
    }

    const lastAgentChat = currentChat.agentChats.at(-1);
    if (!lastAgentChat) {
      return false;
    }

    const userMessageCount = lastAgentChat.messages.filter(
      (msg) => msg.role === "user"
    ).length;

    if (userMessageCount === 0) {
      return false;
    }

    return true;
  };

  const getConcludeChat = async () => {
    if (!currentChat || chatLifecycleState !== "ready") {
      return;
    }
    setChatLifecycleState("concluded");
  };

  const startAgentChat = async (
    agentId: string,
    initReason: AgentInitReason
  ) => {
    if (!currentChat) {
      return;
    }

    setChatLifecycleState("sending");

    const stream = await serverStartAgentChat(
      currentChat.id,
      agentId,
      initReason
    );

    const newAgentChat: AgentChat = {
      messages: [],
      agentId,
    };
    let updatedChat = {
      ...currentChat,
      agentChats: [...currentChat.agentChats, newAgentChat],
    };

    let currentAssistantMessage = "";
    for await (const chunk of stream) {
      currentAssistantMessage += chunk;
      updatedChat = updateLastMessage(updatedChat, {
        role: "assistant",
        content: currentAssistantMessage,
      });
      setCurrentChat(updatedChat);
    }
    setChatLifecycleState("ready");
  };

  return (
    <ChatContext.Provider
      value={{
        chatSummaries,
        currentChat,
        selectChat,
        sendMessage,
        chatLifecycleState,
        canChatConclude: canChatConclude(),
        concludeChat: getConcludeChat,
        startAgentChat,
        selectNonExistentChat,
        initNonExistentChat,
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
