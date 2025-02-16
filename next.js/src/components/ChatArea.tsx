import { useChat } from "@/context/ChatContext";
import React from "react";
import AgentChat from "./AgentChat";
import ChatInteraction from "./ChatInteraction";

const ChatArea: React.FC = () => {
  const { mentorSelected } = useChat();
  if (!mentorSelected) return null;

  const activeChatState =
    typeof mentorSelected.state === "string" ? null : mentorSelected.state;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-scroll space-y-2 w-full pb-10">
        {activeChatState && <AgentChat activeChatState={activeChatState} />}
      </div>
      <ChatInteraction />
    </div>
  );
};

export default ChatArea;
