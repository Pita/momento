"use client";

import { getTodayDateStr } from "@/lib/date";
import {
  ChatSummary,
  fetchOldChats,
  loadChatDetails,
  startNewChat,
  sendMessageToChat,
  concludeLastAgentChat,
} from "@/lib/server";
import { ChatMessage, ChatState } from "@/lib/dbSchemas";
import React, { createContext, useContext, useState, useEffect } from "react";
import { addMessageToLastAgentChat, updateLastMessage } from "@/lib/chatState";

type ChatLifecycleState =
  | "initial"
  | "ready"
  | "sending"
  | "concluding"
  | "concluded";
interface ChatContextType {
  chatSummaries: ChatSummary[];
  currentChat: ChatState | null;
  selectChat: (chat: ChatSummary) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  chatLifecycleState: ChatLifecycleState;
  canChatConclude: boolean;
  concludeChat: () => Promise<void>;
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
    useState<ChatLifecycleState>("initial");

  // On mount, initialize chats
  useEffect(() => {
    async function initChat() {
      const summaries = await fetchOldChats();
      setChatSummaries(summaries);

      const today = getTodayDateStr();
      // Try to find today's chat detail in the in-memory storage
      const todaysChatExists = summaries.find((chat) => chat.id === today);
      if (todaysChatExists) {
        setCurrentChat(await loadChatDetails(today));
        setChatLifecycleState("ready");
      } else {
        const { chat, welcomeMessageStream } = await startNewChat();
        setChatSummaries((prev) => [...prev, { id: today }]);
        setChatLifecycleState("sending");
        const currentAssistantMessage: ChatMessage = {
          role: "assistant",
          content: "",
        };

        let updatedChat = addMessageToLastAgentChat(
          chat,
          currentAssistantMessage
        );

        setCurrentChat(updatedChat);

        for await (const chunk of welcomeMessageStream) {
          currentAssistantMessage.content += chunk;
          updatedChat = updateLastMessage(updatedChat, currentAssistantMessage);
          setCurrentChat(updatedChat);
        }
        setChatLifecycleState("ready");
      }
    }
    initChat();
  }, []);

  // Function to select a chat from the sidebar by loading its details
  const selectChat = async (chat: ChatSummary) => {
    if (chat.id === currentChat?.id) {
      return;
    }
    const fullChat = await loadChatDetails(chat.id);
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

    const stream = await sendMessageToChat(text, currentChat.id);
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
    setCurrentChat({
      ...currentChat,
      agentChats: [
        ...currentChat.agentChats.slice(0, -1),
        {
          ...currentChat.agentChats.at(-1)!,
          concluded: true,
        },
      ],
    });
    setChatLifecycleState("concluding");
    await concludeLastAgentChat(currentChat.id);
    setChatLifecycleState("concluded");
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
