"use server";

import { Chat, ChatState } from "./chat";
import { AgentInitReason, AgentSuggestion } from "./dbSchemas";
import { listKeys } from "./keyValueDB";

export type ChatSummary = {
  id: string; // standardized date stamp (e.g., "2023-10-11")
};

export async function serverFetchOldChats(): Promise<ChatSummary[]> {
  const chats = listKeys("chatState");
  return chats.map((c) => ({ id: c }));
}

export async function serverStartNewChat(chatId: string): Promise<{
  chat: ChatState;
  welcomeMessageStream: AsyncGenerator<string>;
}> {
  const { chat, welcomeMessageStream } = await Chat.create(chatId);
  return {
    chat: chat.state,
    welcomeMessageStream,
  };
}

export async function* serverSendMessageToChat(
  content: string,
  chatId: string
): AsyncGenerator<string> {
  const chat = await Chat.loadOrThrow(chatId);
  yield* await chat.processUserMessage(content);
}

export async function serverLoadChatDetails(
  chatId: string
): Promise<ChatState> {
  const chat = await Chat.loadOrThrow(chatId);
  return chat.state;
}

export async function serverGetAgentSuggestions(
  chatId: string
): Promise<AgentSuggestion[]> {
  const chat = await Chat.loadOrThrow(chatId);
  return await chat.getAgentSuggestions();
}

export async function serverStartAgentChat(
  chatId: string,
  agentId: string,
  initReason: AgentInitReason
): Promise<AsyncGenerator<string>> {
  const chat = await Chat.loadOrThrow(chatId);
  return await chat.startAgentChat(agentId, initReason);
}
