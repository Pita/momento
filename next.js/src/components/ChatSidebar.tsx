import React from "react";
import { useChat } from "../context/ChatContext";
import {
  toAbsoluteDateStr,
  toRelativeDateStr,
  getTodayDateStr,
  getYesterdayDateStr,
} from "../lib/date";

const ChatSidebar: React.FC = () => {
  const { chatSummaries, currentChat, selectChat, selectNonExistentChat } =
    useChat();

  const existingChatIds = new Set(chatSummaries.map((chat) => chat.id));
  const chats: { chatId: string; exists: boolean }[] = chatSummaries.map(
    (chat) => {
      return {
        chatId: chat.id,
        exists: true,
      };
    }
  );

  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();

  [today, yesterday].forEach((chatId) => {
    if (!existingChatIds.has(chatId)) {
      chats.push({ chatId, exists: false });
    }
  });

  chats.sort((a, b) => b.chatId.localeCompare(a.chatId));

  return (
    <aside className="w-full md:w-64 bg-gray-100 p-4 border-b md:border-b-0 md:border-r border-gray-300 h-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-bold">Chats</h2>
      </div>
      <ul className="space-y-2">
        {chats.map((chat) => (
          <li
            key={chat.chatId}
            onClick={() =>
              chat.exists
                ? selectChat(chat.chatId)
                : selectNonExistentChat(chat.chatId)
            }
            className={`cursor-pointer p-2 rounded hover:bg-gray-200 ${
              currentChat?.id === chat.chatId ? "bg-blue-100" : ""
            }`}
          >
            <div>
              <div>{toAbsoluteDateStr(chat.chatId)}</div>
              <div className="text-sm text-gray-500">
                {toRelativeDateStr(chat.chatId)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ChatSidebar;
