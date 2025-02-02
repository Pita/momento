import React, { useState } from "react";
import { useChat } from "../context/ChatContext";

const ChatInput: React.FC = () => {
  const { sendMessage } = useChat();
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      await sendMessage(inputText);
      setInputText("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Type your message..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }}
        disabled={isProcessing}
        className="flex-1 p-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSend}
        disabled={isProcessing}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Sending..." : "Send"}
      </button>
    </div>
  );
};

export default ChatInput;
