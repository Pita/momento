import { useChat } from "@/context/ChatContext";
import React from "react";
import ChatInput from "./ChatInput";
import AgentPicker from "./AgentPicker";
import StartChatInteraction from "./StartChatInteraction";

const ChatInteraction: React.FC = () => {
  const { chatLifecycleState, currentChat } = useChat();

  if (!currentChat) {
    return null;
  }

  const component = (() => {
    switch (chatLifecycleState) {
      case null:
        return;
      case "nonExistent":
        return <StartChatInteraction />;
      case "concluded":
        return <AgentPicker />;
      case "ready":
      case "sending":
        return <ChatInput />;
    }
  })();

  return (
    <div className="w-full p-4">
      <div className="flex flex-col max-w-4xl mx-auto w-full bg-gray-200 py-6 px-4 rounded-xl">
        {component}
      </div>
    </div>
  );
};

export default ChatInteraction;
