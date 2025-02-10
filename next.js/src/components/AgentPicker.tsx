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
import { getAgentSuggestions } from "@/lib/server";
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
  firstMeet: "Meet first time",
  relevantToToday: "Relevant to today",
  catchUp: "Catch up",
} as const;

const AgentPicker: React.FC = () => {
  const { currentChat } = useChat();
  const [suggestions, setSuggestions] = useState<AgentSuggestion[] | null>(
    null
  );

  useEffect(() => {
    const fetchSuggestions = async () => {
      const suggestions = await getAgentSuggestions(currentChat!.id);
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
    console.log("onSelect", suggestion);
  };

  const renderSuggestion = (suggestion: AgentSuggestion, index: number) => {
    const agent = AGENT_CONSTANTS[suggestion.agentId];
    const Icon = iconMapping[agent.materialUIIcon];
    return (
      <button
        key={`${suggestion.agentId}-${suggestion.reason}-${index}`}
        data-suggestion={index}
        onClick={() => onSelect(suggestion)}
        className="flex flex-col items-center p-4 border rounded-md hover:bg-gray-100 w-48 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Icon className="w-12 h-12 mb-3" />
        <span className="font-medium mb-1 font-bold">{agent.name}</span>
        <span className="text-xs text-gray-600 text-center line-clamp-2">
          {reasonToLabelMapping[suggestion.reason]}
        </span>
      </button>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-6">
        Pick a mentor to dive deeper into a specific topic
      </h1>
      <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
        {suggestions.map(renderSuggestion)}
      </div>
    </div>
  );
};

export default AgentPicker;
