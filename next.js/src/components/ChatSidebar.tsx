import React from "react";
import { useChat } from "../context/ChatContext";
import { toAbsoluteDateStr, toRelativeDateStr } from "../lib/date";

const ChatSidebar: React.FC = () => {
  const { chatSummaries, currentChat, selectChat } = useChat();

  const sortedChatSummaries = [...chatSummaries].sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return (
    <aside className="w-full md:w-64 bg-gray-100 p-4 border-b md:border-b-0 md:border-r border-gray-300 h-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-bold">Chats</h2>
      </div>
      <ul className="space-y-2">
        {sortedChatSummaries.map((chat) => (
          <li
            key={chat.id}
            onClick={() => selectChat(chat)}
            className={`cursor-pointer p-2 rounded hover:bg-gray-200 ${
              currentChat?.id === chat.id ? "bg-blue-100" : ""
            }`}
          >
            <div>
              <div>{toAbsoluteDateStr(chat.id)}</div>
              <div className="text-sm text-gray-500">
                {toRelativeDateStr(chat.id)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ChatSidebar;
