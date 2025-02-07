"use server";

import { Chat } from "./chat";
import { getTodayDateStr } from "./date";
import { listKeys } from "./keyValueDB";

// Types for messages and chats
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Updated ChatSummary without messages.
export type ChatSummary = {
  id: string; // standardized date stamp (e.g., "2023-10-11")
};

// New type for full chat details including messages.
export type ChatDetail = ChatSummary & {
  messages: ChatMessage[];
};

// Simulated endpoint to fetch old chats
export async function fetchOldChats(): Promise<ChatSummary[]> {
  const chats = listKeys("chatState");
  return chats.map((c) => ({ id: c })).sort((a, b) => b.id.localeCompare(a.id));
}

// Simulated endpoint to start a new chat for today
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

export async function saveWelcomeMessage(chatId: string, message: string) {
  const chat = await Chat.loadOrThrow(chatId);
  chat.state.history[0].messages.push({
    role: "assistant",
    content: message,
  });
  chat.save();
}

// Simulated sending of a message
export async function* sendMessageToChat(
  content: string,
  chatSummary: ChatSummary
): AsyncGenerator<string> {
  const chat = await Chat.loadOrThrow(chatSummary.id);
  yield* chat.processUserMessage(content);
}

// Simulated endpoint to load the full details of a chat
export async function loadChatDetails(chatId: string): Promise<ChatDetail> {
  const chat = await Chat.loadOrThrow(chatId);
  return chat.getChatDetails();
}
