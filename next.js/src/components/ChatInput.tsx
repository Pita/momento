import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import AutoGrowTextArea from "./AutoGrowTextArea";
import { AGENT_CONSTANTS } from "@/lib/agentConstants";

const ChatInput: React.FC = () => {
  const { sendMessage, chatLifecycleState, concludeChat, canChatConclude } =
    useChat();
  const lockInput = chatLifecycleState !== "ready";
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { currentChat } = useChat();
  const handleSend = async () => {
    if (!inputText.trim() || lockInput) return;
    const message = inputText;
    setInputText("");
    await sendMessage(message);
  };

  useEffect(() => {
    if (!lockInput) {
      inputRef.current?.focus();
    }
  }, [lockInput]);

  const agentId = currentChat?.agentChats.at(-1)?.agentId;
  const currentAgentName = agentId ? AGENT_CONSTANTS[agentId].name : "";

  return (
    <div className="w-full p-4">
      <div className="flex flex-col max-w-4xl mx-auto w-full bg-gray-200 py-6 px-4 rounded-xl">
        <div className="flex gap-2">
          <AutoGrowTextArea
            ref={inputRef}
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={lockInput}
            className="flex-1 p-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed resize-none min-h-[40px]"
            minHeight={70}
            maxHeight={500}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={lockInput}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="flex items-center py-3 mx-auto w-full">
          <div className="flex-grow border-t border-gray-400"></div>
          <span className="mx-2 text-black">or</span>
          <div className="flex-grow border-t border-gray-400"></div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={concludeChat}
            disabled={!canChatConclude}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Conclude {currentAgentName}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
