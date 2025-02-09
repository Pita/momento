import { getValue, setValue } from "./keyValueDB";
import { differenceInDays } from "date-fns";
import {
  callOllamaStream,
  callOllamaToString,
  FAST_MODEL,
  OllamaResult,
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

  async extractEntryFromChat(messages: ChatMessage[]): Promise<string> {
    const messagesWithoutLastAssistantMessage =
      messages.at(-1)!.role === "assistant" ? messages.slice(0, -1) : messages;

    const chatStr =
      "\n'''\n" +
      messagesWithoutLastAssistantMessage
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n") +
      "\n'''\n";

    const userMessagesCharacterCount = messages
      .filter((m) => m.role === "user")
      .reduce((acc, m) => acc + m.content.length, 0);
    const averageSentenceLength = 75;
    const compressedSentencesCount = Math.round(
      userMessagesCharacterCount / averageSentenceLength / 2
    );

    const contextStr = await this.getContextString();

    const prompt =
      `Summarize all the information the user said in the provided dialog below in roughly ${compressedSentencesCount} sentences. Use the previous notes for a better understanding of the conversation and connect to them. Answer with only the summary.` +
      "\n" +
      contextStr +
      "Here is the dialog:\n" +
      chatStr;

    const fullMessage = await callOllamaToString({
      model: FAST_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    this.state.allEntries.push({
      date: getTodayDateStr(),
      content: fullMessage,
    });
    this.state.allEntries.sort((a, b) => a.date.localeCompare(b.date));
    this.save();

    return fullMessage;
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

    return await callOllamaStream({
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

    return await callOllamaStream({
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
