import { z } from "zod";
import { getValue, setValue } from "./keyValueDB";
import { ALL_AGENTS, JOURNALING_AGENT } from "./agent";
import {
  AgentChat,
  AgentInitReason,
  AgentSuggestion,
  ChatStateZod,
} from "./dbSchemas";
import { callOllamaToString } from "./llmCall";
import { FAST_MODEL } from "./llmCall";
import { fromDateStr } from "./date";

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
      await JOURNALING_AGENT.getWelcomeMessage("catchUp", id);
    const newState: ChatState = {
      id,
      version: "1",
      agentChats: [
        {
          agentId: "journaling",
          messages: [],
        },
      ],
      agentsRelevantToToday: [],
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

  private getAgentsWithOverdueCheckin(): string[] {
    const today = fromDateStr(this.id);
    return Object.values(ALL_AGENTS)
      .map((a) => ({ id: a.id, pressure: a.checkInPressure(today) }))
      .filter((a) => a.pressure !== null)
      .sort((a, b) => b.pressure! - a.pressure!)
      .map((a) => a.id);
  }

  private getAgentsWithNoCheckin(): string[] {
    return Object.values(ALL_AGENTS)
      .filter((a) => a.lastCheckInDate === undefined)
      .map((a) => a.id);
  }

  private async createAgentsRelevantToToday(): Promise<void> {
    const journalingEntry = JOURNALING_AGENT.state.allEntries[this.id];
    if (!journalingEntry) {
      throw new Error("Journaling entry not found");
    }
    const agentsAvailable = Object.values(ALL_AGENTS);

    const agents = agentsAvailable.map((a) => ({
      id: a.id,
      description: a.systemPrompt,
    }));

    const prompt =
      "Return a list of up to 3 coaches that can help the user based on today's journal entry. Use a bullet point list and only return the coach ids." +
      "\n\nEntry:\n''' \n" +
      journalingEntry +
      "\n'''\n" +
      "Here is the list of coaches and their descriptions:" +
      "\n" +
      JSON.stringify(agents);

    const response = await callOllamaToString({
      model: FAST_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const agentIds = agentsAvailable
      .filter((a) => response.includes(a.id))
      .map((a) => a.id);

    this.state.agentsRelevantToToday = agentIds;
    this.save();
  }

  private getAgentsRelevantToToday(agentsWithNoCheckin: string[]): string[] {
    if (!this.state.agentsRelevantToToday) {
      this.createAgentsRelevantToToday();
    }
    const agentsWithNoCheckinSet = new Set(agentsWithNoCheckin);
    return this.state.agentsRelevantToToday!.filter(
      (a) => !agentsWithNoCheckinSet.has(a)
    );
  }

  async getAgentSuggestions(): Promise<AgentSuggestion[]> {
    const agentsWithNoCheckin = this.getAgentsWithNoCheckin();
    const agentsRelevantToToday = await this.getAgentsRelevantToToday(
      agentsWithNoCheckin
    );
    const agentsWithOverdueCheckin = this.getAgentsWithOverdueCheckin();

    const suggestions: AgentSuggestion[] = [];
    const agentsCompleted = this.state.agentChats.map((a) => a.agentId);

    const agentsIDsUsed = new Set<string>(agentsCompleted);
    const agentSources: {
      agents: string[];
      reason: AgentSuggestion["reason"];
    }[] = [
      { agents: agentsRelevantToToday, reason: "relevantToToday" },
      { agents: agentsWithOverdueCheckin, reason: "catchUp" },
      { agents: agentsWithNoCheckin, reason: "firstMeet" },
    ];

    for (const { agents, reason } of agentSources) {
      for (const agentId of agents) {
        if (!agentsIDsUsed.has(agentId)) {
          suggestions.push({ agentId, reason });
          agentsIDsUsed.add(agentId);
        }
      }
    }

    return suggestions;
  }

  async startAgentChat(
    agentId: string,
    initReason: AgentInitReason
  ): Promise<AsyncGenerator<string>> {
    const agent = ALL_AGENTS[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    if (this.state.agentChats.some((chat) => chat.agentId === agentId)) {
      throw new Error(`Agent chat for agent ${agentId} already exists`);
    }
    const newAgentChat: AgentChat = {
      agentId,
      messages: [],
    };
    this.state.agentChats.push(newAgentChat);

    this.save();

    const { stream, fullMessagePromise } = await agent.getWelcomeMessage(
      initReason,
      this.id
    );

    fullMessagePromise.then((welcomeMessage) => {
      setTimeout(() => {
        newAgentChat.messages.push({
          role: "assistant",
          content: welcomeMessage,
        });
        this.save();
      }, 1);
    });

    return stream;
  }

  async processUserMessage(message: string): Promise<AsyncGenerator<string>> {
    const agentHistory = this.state.agentChats.at(-1)!;
    const agentMessages = agentHistory.messages;
    // add message to history
    agentMessages.push({
      role: "user",
      content: message,
    });

    const messagesForSummary = agentMessages.slice();

    const agent = ALL_AGENTS[agentHistory.agentId];
    if (!agent) {
      throw new Error(`Agent ${agentHistory.agentId} not found`);
    }

    const { stream, fullMessagePromise } = await agent.getNewAssistantMessage(
      agentMessages,
      this.id
    );

    fullMessagePromise.then((newAssistantMessage) => {
      agentMessages.push({
        role: "assistant",
        content: newAssistantMessage,
      });
      this.save();
    });

    (async () => {
      await agent.summarizeChat(messagesForSummary, this.id);
    })();

    return stream;
  }
}
