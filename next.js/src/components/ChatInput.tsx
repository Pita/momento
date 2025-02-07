import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";

const ChatInput: React.FC = () => {
  const { sendMessage, isProcessingUserMessage } = useChat();
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
    <div className="flex gap-2 py-4 px-2 max-w-3xl mx-auto w-full">
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
  );
};

export default ChatInput;
