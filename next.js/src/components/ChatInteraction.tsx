import { useChat } from "@/context/ChatContext";
import React from "react";
import ChatInput from "./ChatInput";
import StartChatInteraction from "./StartChatInteraction";

const ChatInteraction: React.FC = () => {
  const { mentorSelected, sendMessage } = useChat();
  const activeChatState = mentorSelected?.state;
  if (!activeChatState) return null;

  const component =
    activeChatState === "needs_creation" ? (
      <StartChatInteraction mentorId={mentorSelected.mentorId} />
    ) : (
      <ChatInput
        isProcessing={activeChatState.isProcessing}
        sendMessage={(message) =>
          sendMessage(message, {
            date: activeChatState.date,
            mentorId: mentorSelected.mentorId,
          })
        }
      />
    );

  return (
    <div className="w-full p-4">
      <div className="flex flex-col max-w-4xl mx-auto w-full bg-gray-200 py-6 px-4 rounded-xl">
        {component}
      </div>
    </div>
  );
};

export default ChatInteraction;
