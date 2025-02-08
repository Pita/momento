import React from "react";
import { useChat } from "../context/ChatContext";
import AgentChat from "./AgentChat";

const AgentChats: React.FC = () => {
  const { currentChat } = useChat();

  return (
    <div className="flex-grow overflow-y-scroll space-y-2 w-full">
      {currentChat?.agentChats.map((agentChat, index) => (
        <AgentChat key={index} agentChat={agentChat} />
      ))}
    </div>
  );
};

export default AgentChats;
