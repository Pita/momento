import { getValue, setValue } from "./keyValueDB";
import { differenceInDays } from "date-fns";
import {
  callOllama,
  OllamaResult,
  REASONING_MODEL,
  SMART_MODEL,
} from "./llmCall";
import { getTodayDateStr } from "./date";
import { AgentState, ChatMessage } from "./dbSchemas";
import { AGENT_CONSTANTS } from "./agentConstants";

export type GeneratorWithDoneStatus = {
  generator: AsyncGenerator<string>;
  isDonePromise: Promise<boolean>;
};

export class Agent {
  id: string;
  name: string;
  systemPrompt: string;
  checkInPeriodDays: number;
  state: AgentState;

  constructor(agent: {
    id: string;
    name: string;
    systemPrompt: string;
    checkInPeriodDays: number;
  }) {
    this.id = agent.id;
    this.name = agent.name;
    this.systemPrompt = agent.systemPrompt;
    this.checkInPeriodDays = agent.checkInPeriodDays;

    this.state = getValue(this.id, "agentState") ?? {
      allEntries: [],
      lastCheckInDate: null,
    };
  }

  save() {
    setValue(this.id, "agentState", this.state);
  }

  // TODO: will need a summarize function to not grow forever
  async getContextString(): Promise<string> {
    const dateStr = `\nToday is ${getTodayDateStr()}\n`;

    if (this.state.allEntries.length === 0) {
      return dateStr;
    }
    const entriesStr = this.state.allEntries
      .map((entry) => `${entry.date}: ${entry.content}`)
      .join("\n");

    return (
      dateStr +
      "\nFor context you get some notes from previous conversations:" +
      "\n'''\n" +
      entriesStr +
      "\n'''\n"
    );
  }

  async extractEntryFromChat(
    messages: ChatMessage[],
    force: boolean = false
  ): Promise<boolean> {
    const chatStr =
      "\n'''\n" +
      messages.map((m) => `${m.role}: ${m.content}`).join("\n") +
      "\n'''\n";

    const contextStr = await this.getContextString();

    const rule = force
      ? "Summarize the provided dialog in regards to your mission in 1-2 sentences."
      : "Think about if the conversation contains information relevant to your mission, if yes summarize the important information in 1-2 sentences; otherwise, respond with: NOT_RELEVANT";

    const prompt =
      "Your mission is: \n'''\n" +
      this.systemPrompt +
      "\n'''\n\n" +
      rule +
      "\n" +
      contextStr +
      "Here is the dialog:\n" +
      chatStr;

    const { fullMessagePromise } = await callOllama({
      model: REASONING_MODEL,
      messages: [{ role: "user", content: prompt }],
      system: this.systemPrompt,
    });
    const fullMessage = await fullMessagePromise;

    const thinkEndStr = "</think>";
    const thinkEndIndex = fullMessage.indexOf(thinkEndStr);
    if (thinkEndIndex === -1) {
      throw new Error("No </think> found in response");
    }
    const decision = fullMessage
      .slice(thinkEndIndex + thinkEndStr.length)
      .trim();

    const isEntry = !decision.toLowerCase().includes("not_relevant");
    if (isEntry) {
      this.state.allEntries.push({
        date: getTodayDateStr(),
        content: decision,
      });
      this.state.allEntries.sort((a, b) => a.date.localeCompare(b.date));
      this.save();
    }

    return isEntry;
  }

  async getWelcomeMessage(): Promise<OllamaResult> {
    const hasHistory = this.state.allEntries.length > 0;
    if (!hasHistory) {
      const firstMessage = AGENT_CONSTANTS[this.id].firstMessage;
      return {
        stream: (async function* () {
          yield firstMessage;
        })(),
        fullMessagePromise: Promise.resolve(firstMessage),
      };
    }

    const fullSystemPrompt =
      this.systemPrompt +
      (await this.getContextString()) +
      "\nOpen the conversation with one sentence, use the notes from previous conversations to connect to something that happened recently.";

    return await callOllama({
      model: SMART_MODEL,
      messages: [
        {
          role: "user",
          content: fullSystemPrompt,
        },
      ],
    });
  }

  async getNewAssistantMessage(messages: ChatMessage[]): Promise<OllamaResult> {
    const fullSystemPrompt =
      this.systemPrompt +
      (await this.getContextString()) +
      "\nBriefly comment on the conversation so far similar to how a good supportive friend would. Then ask 3 very short easy questions in your response, use a numbered list. Generally keep the response short and concise.";

    return await callOllama({
      model: SMART_MODEL,
      messages: messages,
      system: fullSystemPrompt,
    });
  }

  checkInPressure(date: Date): number {
    const lastCheckInDate = this.state.lastCheckInDate;
    if (!lastCheckInDate) {
      return 1;
    }

    const daysSinceLastCheckIn = differenceInDays(
      date,
      new Date(lastCheckInDate)
    );
    return daysSinceLastCheckIn / this.checkInPeriodDays;
  }
}

export const JOURNALING_AGENT = new Agent(AGENT_CONSTANTS.journaling);

export const AGENTS = [
  new Agent(AGENT_CONSTANTS["physical-health"]),
  new Agent(AGENT_CONSTANTS["mental-health"]),
  new Agent(AGENT_CONSTANTS.social),
  new Agent(AGENT_CONSTANTS.purpose),
  new Agent(AGENT_CONSTANTS.growth),
  new Agent(AGENT_CONSTANTS.finance),
  new Agent(AGENT_CONSTANTS.mindfulness),
];

export const ALL_AGENTS: Record<string, Agent> = Object.fromEntries(
  [...AGENTS, JOURNALING_AGENT].map((agent) => [agent.id, agent])
);
