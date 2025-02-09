import { z } from "zod";
import { getValue, setValue } from "./keyValueDB";
import { ALL_AGENTS, JOURNALING_AGENT } from "./agent";
import { AgentSuggestion, ChatStateZod } from "./dbSchemas";
import { callOllamaToString } from "./llmCall";
import { FAST_MODEL } from "./llmCall";

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

  async concludeAgentChat(): Promise<void> {
    const lastAgentChat = this.state.agentChats.at(-1)!;
    lastAgentChat.concluded = true;
    this.save();

    const agent = ALL_AGENTS[lastAgentChat.agentId];
    if (!agent) {
      throw new Error(`Agent ${lastAgentChat.agentId} not found`);
    }

    const entry = await agent.extractEntryFromChat(lastAgentChat.messages);
    if (lastAgentChat.agentId === "journaling") {
      await this.createAgentsRelevantToToday(entry);
    }
  }

  private getAgentsWithOverdueCheckin(): string[] {
    const today = new Date();
    return Object.values(ALL_AGENTS)
      .map((a) => ({ id: a.id, pressure: a.checkInPressure(today) }))
      .filter((a) => a.pressure > 1)
      .sort((a, b) => b.pressure - a.pressure)
      .map((a) => a.id);
  }

  private getAgentsWithNoCheckin(): string[] {
    return Object.values(ALL_AGENTS)
      .filter((a) => a.state.lastCheckInDate === null)
      .map((a) => a.id);
  }

  private async createAgentsRelevantToToday(entry: string): Promise<void> {
    const agentsAvailable = Object.values(ALL_AGENTS);

    const agents = agentsAvailable.map((a) => ({
      id: a.id,
      description: a.systemPrompt,
    }));

    const prompt =
      "Return a list of up to 3 coaches that can help the user based on today's journal entry. Use a bullet point list and only return the coach ids." +
      "\n\nEntry:\n''' \n" +
      entry +
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

  getAgentSuggestions(): AgentSuggestion[] {
    const agentsRelevantToToday = this.state.agentsRelevantToToday;
    const agentsWithOverdueCheckin = this.getAgentsWithOverdueCheckin();
    const agentsWithNoCheckin = this.getAgentsWithNoCheckin();

    const suggestions: AgentSuggestion[] = [];
    const agentsCompleted = this.state.agentChats
      .filter((a) => a.concluded)
      .map((a) => a.agentId);

    const agentsIDsUsed = new Set<string>(agentsCompleted);
    const agentSources: {
      agents: string[];
      reason: AgentSuggestion["reason"];
    }[] = [
      { agents: agentsRelevantToToday, reason: "relevantToToday" },
      { agents: agentsWithOverdueCheckin, reason: "overdueCheckin" },
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

  async startAgentChat(agentId: string): Promise<void> {
    const agent = ALL_AGENTS[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    if (this.state.agentChats.some((chat) => chat.agentId === agentId)) {
      throw new Error(`Agent chat for agent ${agentId} already exists`);
    }
    this.state.agentChats.push({
      agentId,
      messages: [],
      concluded: false,
    });
    this.save();
  }

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
