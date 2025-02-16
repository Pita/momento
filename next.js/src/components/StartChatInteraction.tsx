import { useChat } from "@/context/ChatContext";
import React from "react";
import { getTodayDateStr, toRelativeDateStr } from "@/lib/date";
import { MentorId } from "@/lib/mentorConstants";

const StartChatInteraction: React.FC<{
  mentorId: MentorId;
}> = (props) => {
  const { mentorId } = props;
  const { startNewChat } = useChat();

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
        onClick={() => startNewChat(mentorId)}
      >
        Start {toRelativeDateStr(getTodayDateStr())}&apos;s chat
      </button>
    </div>
  );
};

export default StartChatInteraction;
