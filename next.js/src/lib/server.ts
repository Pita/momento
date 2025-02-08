"use server";

import { Chat, ChatState } from "./chat";
import { getTodayDateStr } from "./date";
import { listKeys } from "./keyValueDB";

export type ChatSummary = {
  id: string; // standardized date stamp (e.g., "2023-10-11")
};

export async function fetchOldChats(): Promise<ChatSummary[]> {
  const chats = listKeys("chatState");
  return chats.map((c) => ({ id: c })).sort((a, b) => b.id.localeCompare(a.id));
}

export async function startNewChat(): Promise<{
  chat: ChatState;
  welcomeMessageStream: AsyncGenerator<string>;
}> {
  const chatId = getTodayDateStr();
  const { chat, welcomeMessageStream } = await Chat.create(chatId);
  return {
    chat: chat.state,
    welcomeMessageStream,
  };
}

export async function* sendMessageToChat(
  content: string,
  chatId: string
): AsyncGenerator<string> {
  const chat = await Chat.loadOrThrow(chatId);
  yield* await chat.processUserMessage(content);
}

export async function loadChatDetails(chatId: string): Promise<ChatState> {
  const chat = await Chat.loadOrThrow(chatId);
  return chat.state;
}
