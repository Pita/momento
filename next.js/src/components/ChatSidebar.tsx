import React from "react";
import { useChat } from "../context/ChatContext";
import {
  formatDistanceToNow,
  format,
  parseISO,
  isAfter,
  subWeeks,
} from "date-fns";

const formatDate = (dateStr: string) => {
  const date = parseISO(dateStr);
  const oneWeekAgo = subWeeks(new Date(), 1);

  if (isAfter(date, oneWeekAgo)) {
    return format(date, "EEEE, MMMM do"); // Within last week show day and date
  }

  return formatDistanceToNow(date, { addSuffix: true }); // Otherwise show relative time
};

const ChatSidebar: React.FC = () => {
  const { chatSummaries, currentChat, selectChat } = useChat();

  return (
    <aside className="w-full md:w-64 bg-gray-100 dark:bg-gray-800 p-4 border-b md:border-b-0 md:border-r border-gray-300">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-bold">Chats</h2>
      </div>
      <ul className="space-y-2">
        {chatSummaries.map((chat) => (
          <li
            key={chat.id}
            onClick={() => selectChat(chat)}
            className={`cursor-pointer p-2 rounded hover:bg-gray-200 ${
              currentChat?.id === chat.id ? "bg-blue-100" : ""
            }`}
          >
            {formatDate(chat.id)}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ChatSidebar;
