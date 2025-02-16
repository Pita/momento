"use server";

import { Chat, ChatID, ChatState, getAllChats } from "./chat";
import { getMentorsWithStates, MentorCheckinState } from "./mentor";
import { MentorId } from "./mentorConstants";

export async function serverChatsOfMentor(mentorID: string): Promise<string[]> {
  const chats = getAllChats();
  return chats.filter((c) => c.mentorId === mentorID).map((c) => c.date);
}

export async function serverGetMentorState(
  mentorID: MentorId,
  today: string
): Promise<{ dates: string[]; todaysChat: ChatState | null }> {
  const dates = await serverChatsOfMentor(mentorID);
  const todaysChat = await serverTryLoadChatDetails({
    date: today,
    mentorId: mentorID,
  });
  return { dates, todaysChat };
}

export async function serverStartNewChat(chatID: ChatID): Promise<{
  chat: ChatState;
  welcomeMessageStream: AsyncGenerator<string>;
}> {
  console.log("Starting new chat", chatID);
  const { chat, welcomeMessageStream } = await Chat.create(chatID);
  return {
    chat: chat.state,
    welcomeMessageStream,
  };
}

export async function serverSendMessageToChat(
  content: string,
  chatID: ChatID
): Promise<AsyncGenerator<string>> {
  const chat = await Chat.loadOrThrow(chatID);
  return chat.processUserMessage(content);
}

export async function serverTryLoadChatDetails(
  chatID: ChatID
): Promise<ChatState | null> {
  const chat = await Chat.tryLoad(chatID);
  if (!chat) {
    return null;
  }
  return chat.state;
}

export type MentorWithCheckinState = {
  mentorId: MentorId;
  state: MentorCheckinState;
};

export async function serverGetMentorsWithStates(
  dateId: string
): Promise<Array<MentorWithCheckinState>> {
  return getMentorsWithStates(dateId);
}
