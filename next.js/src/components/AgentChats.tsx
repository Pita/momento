import React from "react";
import { useChat } from "../context/ChatContext";
import AgentChat from "./AgentChat";

const AgentChats: React.FC = () => {
  const { currentChat } = useChat();

  return (
    <div className="flex-grow overflow-y-scroll space-y-2 w-full pb-10">
      {currentChat?.agentChats.map((agentChat, index) => (
        <React.Fragment key={index}>
          {index > 0 && <hr className="border-t-2 border-gray-200 my-4" />}
          <AgentChat agentChat={agentChat} />
        </React.Fragment>
      ))}
    </div>
  );
};

export default AgentChats;
