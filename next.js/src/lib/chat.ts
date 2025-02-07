import { ChatDetail, ChatMessage } from "./server";
import { z } from "zod";
import { getValue, setValue } from "./keyValueDB";
import { Agent, AGENTS, ALL_AGENTS, DIARY_AGENT } from "./agent";
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

    const welcomeMessageStream = await DIARY_AGENT.getWelcomeMessageStream();
    const newState: ChatState = {
      version: "1",
      history: [
        {
          agentId: "diary",
          messages: [],
          completed: false,
        },
      ],
      agentsLinedup: [],
    };
    const newChat = new Chat(id, newState);
    newChat.save();
    return { chat: newChat, welcomeMessageStream };
  }

  save() {
    setValue(this.id, "chatState", this.state);
  }

  private async onDiaryCompleted(messages: ChatMessage[]) {
    // get all messages from diary agent and extract entries for each agent
    const diaryRelatedAgents = new Set<string>();
    for (const agent of AGENTS) {
      const hasEntry = await agent.extractEntryFromChat(messages);
      if (hasEntry) {
        diaryRelatedAgents.add(agent.id);
      }
    }

    // get agents with pressure and related agents
    const today = new Date();
    const linedupAgents = AGENTS.map((a) => ({
      id: a.id,
      pressure:
        a.checkInPressure(today) + (diaryRelatedAgents.has(a.id) ? 1 : 0),
    }))
      .filter((a) => a.pressure > 1)
      .sort((a, b) => b.pressure - a.pressure)
      .map((a) => a.id);

    this.state.agentsLinedup = linedupAgents;
  }

  async *processUserMessage(message: string): AsyncGenerator<string> {
    const firstAgentHistory = this.state.history.at(-1)!;
    const firstAgentMessages = firstAgentHistory.messages;
    // add message to history
    firstAgentMessages.push({
      role: "user",
      content: message,
    });

    const firstAgent = ALL_AGENTS[firstAgentHistory.agentId];
    if (!firstAgent) {
      throw new Error(`Agent ${firstAgentHistory.agentId} not found`);
    }

    const firstAgentGenerator = await firstAgent.streamNewAssistantMessage(
      firstAgentMessages
    );

    const hasConcluded = firstAgentGenerator === null;
    if (!hasConcluded) {
      let assistantMessage = "";
      for await (const chunk of firstAgentGenerator) {
        assistantMessage += chunk;
        yield chunk;
      }

      firstAgentMessages.push({
        role: "assistant",
        content: assistantMessage,
      });

      this.save();

      return;
    }

    firstAgentHistory.completed = true;
    if (firstAgent.id === "diary") {
      await this.onDiaryCompleted(firstAgentMessages);
    }

    const secondAgentId = this.state.agentsLinedup.shift();
    if (!secondAgentId) {
      yield "That's all for now. Goodbye!";
      return;
    }

    const secondAgent = ALL_AGENTS[secondAgentId];
    if (!secondAgent) {
      throw new Error(`Agent ${secondAgentId} not found`);
    }

    let secondAssistantMessage = "";

    const secondAgentGenerator = await secondAgent.streamNewAssistantMessage(
      []
    );

    for await (const chunk of secondAgentGenerator) {
      secondAssistantMessage += chunk;
      yield chunk;
    }

    this.state.history.push({
      agentId: secondAgentId,
      messages: [
        {
          role: "assistant",
          content: secondAssistantMessage,
        },
      ],
      completed: false,
    });

    this.save();
  }

  getChatDetails(): ChatDetail {
    return {
      id: this.id,
      messages: this.state.history.flatMap((h) => h.messages),
    };
  }
}
