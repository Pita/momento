import { z } from "zod";
import { getValue, listKeys, setValue } from "./keyValueDB";
import { Mentor, ALL_MENTORS, JOURNALING_MENTOR } from "./mentor";
import { ChatStateZod } from "./dbSchemas";
import { MentorId } from "./mentorConstants";

export type ChatState = z.infer<typeof ChatStateZod>;

export type ChatID = {
  date: string;
  mentorId: MentorId;
};

function createChatID(chatID: ChatID): string {
  return `${chatID.date}__${chatID.mentorId}`;
}

function parseChatID(id: string): ChatID {
  const match = id.match(/^(\d{4}-\d{2}-\d{2})__(.+)$/);
  if (!match) {
    throw new Error(`Invalid chat ID format: ${id}`);
  }
  const [, date, mentorId] = match;
  return { date, mentorId: mentorId as MentorId };
}

export function getAllChats(): ChatID[] {
  const chats = listKeys("chatState");
  return chats.map(parseChatID);
}

export class Chat {
  date: string;
  mentor: Mentor;
  state: ChatState;

  constructor(date: string, state: ChatState, mentor: Mentor) {
    this.date = date;
    this.state = state;
    this.mentor = mentor;
  }

  static async tryLoad(chatID: ChatID): Promise<Chat | null> {
    const { date, mentorId } = chatID;
    const id = createChatID(chatID);
    const storedState = getValue(id, "chatState");
    if (!storedState) {
      return null;
    }
    return new Chat(date, storedState, ALL_MENTORS[mentorId]);
  }

  static async loadOrThrow(chatID: ChatID): Promise<Chat> {
    const chat = await Chat.tryLoad(chatID);
    if (!chat) {
      const id = createChatID(chatID);
      throw new Error(`Chat ${id} not found`);
    }
    return chat;
  }

  static async create(
    chatID: ChatID
  ): Promise<{ chat: Chat; welcomeMessageStream: AsyncGenerator<string> }> {
    const { date, mentorId } = chatID;
    const existingChat = await Chat.tryLoad(chatID);
    if (existingChat) {
      throw new Error(`Chat already exists`);
    }

    const { stream: welcomeMessageStream, fullMessagePromise } =
      await ALL_MENTORS[mentorId].getInitialMessage(date);

    const newState: ChatState = {
      date,
      mentorId,
      version: "1",
      messages: [],
    };
    const newChat = new Chat(date, newState, ALL_MENTORS[mentorId]);
    newChat.save();

    fullMessagePromise.then((welcomeMessage) => {
      setTimeout(() => {
        newChat.state.messages.push({
          role: "assistant",
          content: welcomeMessage,
        });
        newChat.save();
      }, 1);
    });
    return { chat: newChat, welcomeMessageStream };
  }

  save() {
    console.log("this.date", this.date);
    const id = createChatID({ date: this.date, mentorId: this.mentor.id });
    setValue(id, "chatState", this.state);
  }

  async processUserMessage(message: string): Promise<AsyncGenerator<string>> {
    // add message to history
    this.state.messages.push({
      role: "user",
      content: message,
    });

    const messagesForSummary = this.state.messages.slice();

    const { stream, fullMessagePromise } =
      await this.mentor.getNewAssistantMessage(this.state.messages, this.date);

    fullMessagePromise.then((newAssistantMessage) => {
      this.state.messages.push({
        role: "assistant",
        content: newAssistantMessage,
      });
      this.save();
    });

    (async () => {
      await this.mentor.summarizeChat(messagesForSummary, this.date);
    })();

    return stream;
  }
}
