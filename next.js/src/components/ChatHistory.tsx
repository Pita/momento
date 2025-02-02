import React, { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";

const ChatHistory: React.FC = () => {
  const { currentChat } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  return (
    <div className="flex-grow overflow-y-auto mb-4 space-y-2">
      {currentChat && currentChat.messages.length > 0 ? (
        currentChat.messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg max-w-[70%] ${
              msg.role === "user"
                ? "bg-blue-500 text-white self-end ml-auto"
                : "bg-gray-200 text-black self-start mr-auto"
            }`}
          >
            {msg.content}
          </div>
        ))
      ) : (
        <p className="text-gray-500">No messages yet.</p>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;
