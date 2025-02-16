import React, { useEffect, useRef } from "react";
import { ActiveChatState } from "../context/ChatContext";
import Spinning from "./spinning.svg";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface AgentChatProps {
  activeChatState: ActiveChatState;
}

const AgentChat: React.FC<AgentChatProps> = ({
  activeChatState,
}: AgentChatProps) => {
  const { messages } = activeChatState;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-2 rounded-lg w-fit max-w-[70%] prose prose-base ${
            msg.role === "user"
              ? "bg-blue-100 text-black self-end ml-auto"
              : "bg-gray-200 text-black self-start mr-auto"
          }`}
        >
          {msg.role === "assistant" ? (
            msg.content !== "" ? (
              <ReactMarkdown>
                {msg.content.replaceAll("• ", "- ")}
              </ReactMarkdown>
            ) : (
              <Image priority src={Spinning} alt="Loading..." />
            )
          ) : (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default AgentChat;
