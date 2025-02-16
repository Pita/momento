import React from "react";
import { useChat } from "../context/ChatContext";
import { MENTOR_CONSTANTS, MentorMaterialUIIcon } from "@/lib/mentorConstants";
import { IconType } from "react-icons";
import {
  MdAutoStories,
  MdDirectionsRun,
  MdPsychology,
  MdGroups,
  MdExplore,
  MdTrendingUp,
  MdWallet,
  MdSelfImprovement,
} from "react-icons/md";

/*
  active: Chat Bubble
  chat unread: 
*/

const iconMapping: Record<MentorMaterialUIIcon, IconType> = {
  AutoStories: MdAutoStories,
  DirectionsRun: MdDirectionsRun,
  Psychology: MdPsychology,
  Groups: MdGroups,
  Explore: MdExplore,
  TrendingUp: MdTrendingUp,
  Wallet: MdWallet,
  SelfImprovement: MdSelfImprovement,
};

const ChatSidebar: React.FC = () => {
  const { mentorsWithCheckinStates, selectMentor, mentorSelected } = useChat();

  const mentorElements = mentorsWithCheckinStates.map((mentor) => {
    const state = mentor.state;

    return (
      <li
        key={mentor.mentorId}
        onClick={() => selectMentor(mentor.mentorId)}
        className={`cursor-pointer p-2 rounded-lg ${
          mentorSelected?.mentorId === mentor.mentorId ? "bg-blue-100" : ""
        }`}
      >
        <div className="relative flex items-center justify-between w-full">
          <div className="w-6 h-6 flex-shrink-0">
            {React.createElement(
              iconMapping[MENTOR_CONSTANTS[mentor.mentorId].materialUIIcon],
              { className: `w-full h-full` }
            )}
          </div>
          <div className="whitespace-normal flex-1 mx-2 text-left">
            {MENTOR_CONSTANTS[mentor.mentorId].name}
          </div>
          {state.type === "needs_attention" && (
            <div className="relative inline-block group">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
              <span className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                {state.msg}
              </span>
            </div>
          )}
        </div>
      </li>
    );
  });

  return (
    <aside className="w-full md:w-64 bg-gray-100 p-4 border-b md:border-b-0 md:border-r border-gray-300 h-full">
      <ul className="space-y-2">{mentorElements}</ul>
    </aside>
  );
};

export default ChatSidebar;
