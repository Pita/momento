import React, { useState, useRef, useEffect } from "react";
import AutoGrowTextArea from "./AutoGrowTextArea";

const ChatInput: React.FC<{
  isProcessing: boolean;
  sendMessage: (message: string) => void;
}> = (props) => {
  const { isProcessing, sendMessage } = props;
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;
    const message = inputText;
    setInputText("");
    await sendMessage(message);
  };

  useEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  return (
    <>
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
          disabled={isProcessing}
          className="flex-1 p-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed resize-none min-h-[40px]"
          minHeight={70}
          maxHeight={500}
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </>
  );
};

export default ChatInput;
