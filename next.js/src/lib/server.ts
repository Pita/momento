"use server";

import { Chat } from "./chat";
import { getTodayDateStr } from "./date";
import { listKeys } from "./keyValueDB";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatSummary = {
  id: string; // standardized date stamp (e.g., "2023-10-11")
};

export type ChatDetail = ChatSummary & {
  messages: ChatMessage[];
};

export async function fetchOldChats(): Promise<ChatSummary[]> {
  const chats = listKeys("chatState");
  return chats.map((c) => ({ id: c })).sort((a, b) => b.id.localeCompare(a.id));
}

export async function startNewChat(): Promise<{
  chat: ChatDetail;
  welcomeMessageStream: AsyncGenerator<string>;
}> {
  const chatId = getTodayDateStr();
  const { chat, welcomeMessageStream } = await Chat.create(chatId);
  return {
    chat: chat.getChatDetails(),
    welcomeMessageStream,
  };
}

export async function* sendMessageToChat(
  content: string,
  chatSummary: ChatSummary
): AsyncGenerator<string> {
  const chat = await Chat.loadOrThrow(chatSummary.id);
  yield* await chat.processUserMessage(content);
}

export async function loadChatDetails(chatId: string): Promise<ChatDetail> {
  const chat = await Chat.loadOrThrow(chatId);
  return chat.getChatDetails();
}
