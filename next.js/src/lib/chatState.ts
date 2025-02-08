import { ChatState, ChatMessage } from "./dbSchemas";
import { DeepReadonly } from "./deepReadonly";

export function updateLastMessage(
  state: DeepReadonly<ChatState>,
  message: ChatMessage
): ChatState {
  return {
    ...state,
    agentChats: [
      ...state.agentChats.slice(0, -1),
      {
        ...state.agentChats.at(-1)!,
        messages: [...state.agentChats.at(-1)!.messages.slice(0, -1), message],
      },
    ],
  } as ChatState;
}

export function addMessageToLastAgentChat(
  state: DeepReadonly<ChatState>,
  message: ChatMessage
): ChatState {
  return {
    ...state,
    agentChats: [
      ...state.agentChats.slice(0, -1),
      {
        ...state.agentChats.at(-1)!,
        messages: [...state.agentChats.at(-1)!.messages, message],
      },
    ],
  } as ChatState;
}

export function addAgentChat(
  state: DeepReadonly<ChatState>,
  agentId: string
): ChatState {
  return {
    ...state,
    agentChats: [
      ...state.agentChats,
      { agentId, messages: [], concluded: false },
    ],
  } as ChatState;
}

export function concludeLastAgentChat(
  state: DeepReadonly<ChatState>
): ChatState {
  return {
    ...state,
    agentChats: [
      ...state.agentChats.slice(0, -1),
      {
        ...state.agentChats.at(-1)!,
        concluded: true,
      },
    ],
  } as ChatState;
}
