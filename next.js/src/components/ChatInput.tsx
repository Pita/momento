import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";

const ChatInput: React.FC = () => {
  const {
    sendMessage,
    isProcessingUserMessage,
    concludeChat,
    canChatConclude,
  } = useChat();
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isProcessingUserMessage) return;
    const message = inputText;
    setInputText("");
    await sendMessage(message);
  };

  useEffect(() => {
    if (!isProcessingUserMessage) {
      inputRef.current?.focus();
    }
  }, [isProcessingUserMessage]);

  return (
    <div className="w-full p-4">
      <div className="flex flex-col max-w-4xl mx-auto w-full bg-gray-200 py-6 px-4 rounded-xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            disabled={isProcessingUserMessage}
            className="flex-1 p-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={isProcessingUserMessage}
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
            disabled={canChatConclude}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Conclude chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
