import { useChat } from "@/context/ChatContext";
import React from "react";
import { toRelativeDateStr } from "@/lib/date";

const StartChatInteraction: React.FC = () => {
  const { initNonExistentChat, currentChat } = useChat();
  if (!currentChat) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
        onClick={() => initNonExistentChat(currentChat.id)}
      >
        Start {toRelativeDateStr(currentChat.id)}&apos;s chat
      </button>
    </div>
  );
};

export default StartChatInteraction;
