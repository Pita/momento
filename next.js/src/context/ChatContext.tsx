"use client";

import { getTodayDateStr } from "@/lib/date";
import {
  MentorWithCheckinState,
  serverGetMentorState,
  serverGetMentorsWithStates,
  serverSendMessageToChat,
  serverStartNewChat,
  serverTryLoadChatDetails,
} from "@/lib/server";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { ChatID } from "@/lib/chat";
import { ChatMessage } from "@/lib/dbSchemas";
import { MentorId } from "@/lib/mentorConstants";

export type ActiveChatState = {
  date: string;
  messages: ChatMessage[];
  isProcessing: boolean;
};

export type MentorChatState = {
  mentorId: MentorId;
  state: "needs_creation" | null | ActiveChatState;
  dates: string[] | null;
};

interface ChatContextType {
  mentorSelected: MentorChatState | null;
  mentorsWithCheckinStates: Array<MentorWithCheckinState>;
  selectMentor: (mentorId: MentorId) => void;
  sendMessage: (content: string, chatID: ChatID) => void;
  startNewChat: (mentorId: MentorId) => void;
  selectOlderChat: (chatID: ChatID) => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ChatProvider component that holds the chat state and exposes context functions
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mentorSelected, setMentorSelected] = useState<MentorChatState | null>(
    null
  );
  const [mentorsWithCheckinStates, setMentorsWithCheckinStates] = useState<
    Array<MentorWithCheckinState>
  >([]);

  /**
   * Helper type guard to ensure that the given state is an ActiveChatState.
   */
  const isActiveChatState = (state: unknown): state is ActiveChatState => {
    return (
      !!state &&
      typeof state === "object" &&
      "isProcessing" in state &&
      "messages" in state
    );
  };

  /**
   * Helper function to update the active chat state.
   * It checks that the current state is an ActiveChatState and applies the updater.
   */
  const updateActiveChatState = (
    updater: (chat: ActiveChatState) => ActiveChatState
  ) => {
    setMentorSelected((prev) => {
      if (!prev) {
        return prev;
      }
      if (!isActiveChatState(prev.state)) {
        throw new Error("Operation allowed only on active chat state");
      }
      const updatedActiveChat = updater(prev.state);
      return { ...prev, state: updatedActiveChat };
    });
  };

  /**
   * Helper function for updating the assistant message.
   * It applies the update function to the last message with the assistant role.
   */
  const updateLastAssistantMessage = (
    updateFn: (content: string) => string
  ) => {
    updateActiveChatState((chat) => {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (!lastMessage || lastMessage.role !== "assistant") {
        throw new Error("Last message is not from assistant");
      }

      return {
        ...chat,
        messages: chat.messages.map((msg, idx, arr) => {
          if (idx === arr.length - 1) {
            const updatedContent = updateFn(msg.content);
            return { ...msg, content: updatedContent };
          }
          return msg;
        }),
      };
    });
  };

  /**
   * Helper function to switch the mentor's state to a new ActiveChatState.
   */
  const switchToActiveChatState = (activeChat: ActiveChatState) => {
    setMentorSelected((prev) => (prev ? { ...prev, state: activeChat } : prev));
  };

  /**
   * Helper function to set the entire chat details.
   * Useful when loading an older chat.
   */
  const setChatDetails = (chatDetails: {
    date: string;
    messages: ChatMessage[];
    isProcessing: boolean;
  }) => {
    setMentorSelected((prev) =>
      prev ? { ...prev, state: chatDetails } : prev
    );
  };

  useEffect(() => {
    const fetchMentorsWithCheckinStates = async () => {
      const mentors = await serverGetMentorsWithStates(getTodayDateStr());
      setMentorsWithCheckinStates(mentors);
      selectMentor("journaling");
    };
    fetchMentorsWithCheckinStates();
  }, []);

  const selectMentor = (mentorId: MentorId) => {
    if (mentorSelected?.mentorId === mentorId) {
      return;
    }

    setMentorSelected({
      mentorId,
      state: null,
      dates: null,
    });

    const today = getTodayDateStr();

    serverGetMentorState(mentorId, today).then(({ dates, todaysChat }) => {
      setMentorSelected((prev) => {
        if (!prev || prev.mentorId !== mentorId) {
          return prev; // Mentor selection has changed; do not update dates.
        }
        return {
          ...prev,
          dates,
          state: todaysChat
            ? {
                date: todaysChat.date,
                messages: todaysChat.messages,
                isProcessing: false,
              }
            : "needs_creation",
        };
      });
    });
  };

  const startNewChat = (mentorId: MentorId) => {
    const date = getTodayDateStr();
    const chatID: ChatID = {
      date,
      mentorId,
    };

    if (!mentorSelected) {
      throw new Error("No mentor selected");
    }

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
    };

    const activeChatState: ActiveChatState = {
      date,
      messages: [assistantMessage],
      isProcessing: true,
    };

    // Switch to the new active chat state using our helper
    switchToActiveChatState(activeChatState);

    serverStartNewChat(chatID).then(async ({ welcomeMessageStream }) => {
      for await (const chunk of welcomeMessageStream) {
        // Update the assistant message using our new helper
        updateLastAssistantMessage((currentContent) => currentContent + chunk);
      }

      updateActiveChatState((chat) => ({
        ...chat,
        isProcessing: false,
      }));
    });
  };

  const sendMessage = (content: string, chatID: ChatID) => {
    if (!mentorSelected) {
      throw new Error("No mentor selected");
    }

    const userMessage: ChatMessage = {
      role: "user",
      content,
    };

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
    };

    // Append both the user and assistant messages using our helper
    updateActiveChatState((chat) => ({
      ...chat,
      messages: [...chat.messages, userMessage, assistantMessage],
      isProcessing: true,
    }));

    serverSendMessageToChat(content, chatID).then(async (stream) => {
      for await (const chunk of stream) {
        updateLastAssistantMessage((currentContent) => currentContent + chunk);
      }

      // Once done, mark the chat as no longer processing the message.
      updateActiveChatState((chat) => ({
        ...chat,
        isProcessing: false,
      }));
    });
  };

  const selectChat = (chatID: ChatID) => {
    if (!mentorSelected) {
      throw new Error("No mentor selected");
    }

    serverTryLoadChatDetails(chatID).then((chat) => {
      if (!chat) {
        throw new Error(`Chat ${chatID.date} not found`);
      }
      setChatDetails({
        date: chat.date,
        messages: chat.messages,
        isProcessing: false,
      });
    });
  };

  return (
    <ChatContext.Provider
      value={{
        mentorSelected,
        mentorsWithCheckinStates,
        selectMentor,
        startNewChat,
        sendMessage,
        selectOlderChat: selectChat,
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
