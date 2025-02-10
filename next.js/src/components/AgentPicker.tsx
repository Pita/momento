import React, { useEffect, useState, useLayoutEffect } from "react";
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

import { AGENT_CONSTANTS, AgentMaterialUIIcon } from "../lib/agentConstants";
import { AgentSuggestion } from "../lib/dbSchemas";
import { serverGetAgentSuggestions } from "@/lib/server";
import { useChat } from "@/context/ChatContext";
import { IconType } from "react-icons";

// Updated icon mapping to use react-icons
const iconMapping: Record<AgentMaterialUIIcon, IconType> = {
  AutoStories: MdAutoStories,
  DirectionsRun: MdDirectionsRun,
  Psychology: MdPsychology,
  Groups: MdGroups,
  Explore: MdExplore,
  TrendingUp: MdTrendingUp,
  Wallet: MdWallet,
  SelfImprovement: MdSelfImprovement,
};

const reasonToLabelMapping = {
  firstMeet: "Start topic",
  relevantToToday: "Relevant to today",
  catchUp: "Catch up",
} as const;

const AgentPicker: React.FC = () => {
  const { currentChat, startAgentChat } = useChat();
  const [suggestions, setSuggestions] = useState<AgentSuggestion[] | null>(
    null
  );

  useEffect(() => {
    const fetchSuggestions = async () => {
      const suggestions = await serverGetAgentSuggestions(currentChat!.id);
      console.log("suggestions", suggestions);
      setSuggestions(suggestions);
    };
    fetchSuggestions();
  }, [currentChat]);

  useLayoutEffect(() => {
    if (suggestions && suggestions.length > 0) {
      const firstSuggestion = document.querySelector('[data-suggestion="0"]');
      if (firstSuggestion) {
        firstSuggestion.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [suggestions]);

  if (suggestions === null) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center justify-center space-x-4 p-4 border rounded-md w-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-500">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col items-center justify-center space-y-2 p-4 border rounded-md w-full">
          <span className="text-lg font-medium text-green-600">Well done!</span>
          <span className="text-sm text-gray-500">
            You&apos;ve completed all your check-ins for today. Come back
            tomorrow for new suggestions!
          </span>
        </div>
      </div>
    );
  }

  const onSelect = (suggestion: AgentSuggestion) => {
    startAgentChat(suggestion.agentId, suggestion.reason);
  };

  const renderSuggestion = (suggestion: AgentSuggestion, index: number) => {
    const agent = AGENT_CONSTANTS[suggestion.agentId];
    const Icon = iconMapping[agent.materialUIIcon];
    return (
      <button
        key={`${suggestion.agentId}-${suggestion.reason}-${index}`}
        data-suggestion={index}
        onClick={() => onSelect(suggestion)}
        className="flex items-center p-3 bg-white shadow-sm border-1 border-gray-300 rounded-md hover:bg-gray-50 max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
      >
        <Icon className="w-8 h-8 mr-3 flex-shrink-0" />
        <div className="flex flex-col items-start">
          <span className="font-bold text-start">{agent.name}</span>
          <span className="text-xs text-gray-600 line-clamp-2">
            {reasonToLabelMapping[suggestion.reason]}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-6">
        Pick a topic to dive deeper into
      </h1>
      <div className="flex flex-row flex-wrap gap-4 max-w-2xl mx-auto">
        {suggestions.map(renderSuggestion)}
      </div>
    </div>
  );
};

export default AgentPicker;
