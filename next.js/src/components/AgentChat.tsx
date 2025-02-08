import React, { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import Spinning from "./spinning.svg";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { AgentChat as AgentChatType } from "@/lib/dbSchemas";
import { AGENT_CONSTANTS } from "@/lib/agentConstants";

interface AgentChatProps {
  agentChat: AgentChatType;
}

const AgentChat: React.FC<AgentChatProps> = ({ agentChat }: AgentChatProps) => {
  const { isProcessingUserMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentChat?.messages]);

  // Show the loading bubble if a user message is processing and the last message isn't an assistant.
  const shouldShowLoadingBubble =
    isProcessingUserMessage &&
    (!agentChat ||
      agentChat.messages.length === 0 ||
      agentChat.messages[agentChat.messages.length - 1].role !== "assistant");

  return (
    <div className="space-y-2">
      <div className="max-w-4xl mx-auto space-y-4 p-4">
        <h1 className="text-2xl font-bold text-center">
          {AGENT_CONSTANTS[agentChat.agentId].name}
        </h1>

        {agentChat?.messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg w-fit max-w-[70%] prose prose-base ${
              msg.role === "user"
                ? "bg-blue-100 text-black self-end ml-auto text-right"
                : "bg-gray-200 text-black self-start mr-auto"
            }`}
          >
            {msg.role === "assistant" ? (
              <ReactMarkdown>
                {msg.content.replaceAll("• ", "- ")}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}

        {shouldShowLoadingBubble && (
          <div className="p-2 rounded-lg max-w-[70%] bg-gray-200 text-black self-start mr-auto flex items-center">
            <Image priority src={Spinning} alt="Loading..." />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default AgentChat;
