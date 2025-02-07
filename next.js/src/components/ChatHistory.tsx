import React, { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import Spinning from "./spinning.svg";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

const ChatHistory: React.FC = () => {
  const { currentChat, isProcessingUserMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  // Show the loading bubble if a user message is processing and the last message isn't an assistant.
  const shouldShowLoadingBubble =
    isProcessingUserMessage &&
    (!currentChat ||
      currentChat.messages.length === 0 ||
      currentChat.messages[currentChat.messages.length - 1].role !==
        "assistant");

  return (
    <div className="flex-grow overflow-y-scroll space-y-2 w-full">
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        {currentChat && currentChat.messages.length > 0 ? (
          currentChat.messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg max-w-[70%] prose prose-base ${
                msg.role === "user"
                  ? "bg-blue-500 text-white self-end ml-auto"
                  : "bg-gray-200 text-black self-start mr-auto"
              }`}
            >
              <ReactMarkdown>
                {msg.content.replaceAll("• ", "- ")}
              </ReactMarkdown>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No messages yet.</p>
        )}

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

export default ChatHistory;
