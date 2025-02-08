import { z } from "zod";
import { getValue, setValue } from "./keyValueDB";
import { ALL_AGENTS, JOURNALING_AGENT } from "./agent";
import { ChatStateZod } from "./dbSchemas";

export type ChatState = z.infer<typeof ChatStateZod>;

export class Chat {
  id: string;
  state: ChatState;

  constructor(id: string, state: ChatState) {
    this.id = id;
    this.state = state;
  }

  static async loadOrThrow(id: string): Promise<Chat> {
    const storedState = getValue(id, "chatState") as ChatState | undefined;
    if (!storedState) {
      throw new Error(`Chat ${id} not found`);
    }
    return new Chat(id, storedState);
  }

  static async create(
    id: string
  ): Promise<{ chat: Chat; welcomeMessageStream: AsyncGenerator<string> }> {
    const storedState = getValue(id, "chatState") as ChatState | undefined;
    if (storedState) {
      throw new Error(`Chat ${id} already exists`);
    }

    const { stream: welcomeMessageStream, fullMessagePromise } =
      await JOURNALING_AGENT.getWelcomeMessage();
    const newState: ChatState = {
      id,
      version: "1",
      agentChats: [
        {
          agentId: "journaling",
          messages: [],
          concluded: false,
        },
      ],
    };
    const newChat = new Chat(id, newState);
    newChat.save();

    fullMessagePromise.then((welcomeMessage) => {
      setTimeout(() => {
        newChat.state.agentChats[0].messages.push({
          role: "assistant",
          content: welcomeMessage,
        });
        newChat.save();
      }, 1);
    });
    return { chat: newChat, welcomeMessageStream };
  }

  save() {
    setValue(this.id, "chatState", this.state);
  }

  //   private async onDiaryCompleted(messages: ChatMessage[]) {
  //     // get all messages from diary agent and extract entries for each agent
  //     const diaryRelatedAgents = new Set<string>();
  //     for (const agent of AGENTS) {
  //       const hasEntry = await agent.extractEntryFromChat(messages);
  //       if (hasEntry) {
  //         diaryRelatedAgents.add(agent.id);
  //       }
  //     }

  //     // get agents with pressure and related agents
  //     const today = new Date();
  //     const linedupAgents = AGENTS.map((a) => ({
  //       id: a.id,
  //       pressure:
  //         a.checkInPressure(today) + (diaryRelatedAgents.has(a.id) ? 1 : 0),
  //     }))
  //       .filter((a) => a.pressure > 1)
  //       .sort((a, b) => b.pressure - a.pressure)
  //       .map((a) => a.id);

  //   }

  async processUserMessage(message: string): Promise<AsyncGenerator<string>> {
    const agentHistory = this.state.agentChats.at(-1)!;
    const agentMessages = agentHistory.messages;
    // add message to history
    agentMessages.push({
      role: "user",
      content: message,
    });

    const agent = ALL_AGENTS[agentHistory.agentId];
    if (!agent) {
      throw new Error(`Agent ${agentHistory.agentId} not found`);
    }

    const { stream, fullMessagePromise } = await agent.getNewAssistantMessage(
      agentMessages
    );

    fullMessagePromise.then((newAssistantMessage) => {
      agentMessages.push({
        role: "assistant",
        content: newAssistantMessage,
      });
      this.save();
    });

    return stream;
  }
}
