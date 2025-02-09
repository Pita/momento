import React from "react";
import { useChat } from "../context/ChatContext";
import AgentChat from "./AgentChat";
import AgentPicker from "./AgentPicker";

const AgentChats: React.FC = () => {
  const { currentChat, chatLifecycleState } = useChat();

  return (
    <div className="flex-grow overflow-y-scroll space-y-2 w-full pb-10">
      {currentChat?.agentChats.map((agentChat, index) => (
        <AgentChat key={index} agentChat={agentChat} />
      ))}
      {chatLifecycleState === "concluded" && <AgentPicker />}
    </div>
  );
};

export default AgentChats;
