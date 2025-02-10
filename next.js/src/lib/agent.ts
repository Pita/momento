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
import { AgentInitReason, AgentState, ChatMessage } from "./dbSchemas";
import { AGENT_CONSTANTS } from "./agentConstants";

export type GeneratorWithDoneStatus = {
  generator: AsyncGenerator<string>;
  isDonePromise: Promise<boolean>;
};

function quoteBlock(content: string): string {
  return `\n'''\n${content}\n'''\n`;
}

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
      allEntries: {},
    };
  }

  save() {
    setValue(this.id, "agentState", this.state);
  }

  public getHistoryString(): string | null {
    if (Object.keys(this.state.allEntries).length === 0) {
      return null;
    }

    return Object.values(this.state.allEntries)
      .sort((a, b) => a.localeCompare(b))
      .map((content) => content)
      .join("\n");
  }

  // TODO: will need a summarize function to not grow forever
  private async getContextString(): Promise<string> {
    const context: string[][] = [[`Today is ${getTodayDateStr()}`]];

    const journalEntries = JOURNALING_AGENT.getHistoryString();
    const ownEntries =
      this.id === "journaling" ? null : this.getHistoryString();

    if (journalEntries) {
      context.push([
        "For context here are summaries of previous journal entries:",
        quoteBlock(journalEntries),
      ]);
    }

    if (ownEntries) {
      context.push([
        "Here are the summaries of previous conversations the user had with you:",
        quoteBlock(ownEntries),
      ]);
    }

    return context.map((c) => c.join("\n")).join("\n");
  }

  async summarizeChat(messages: ChatMessage[]): Promise<string> {
    const chatStr = quoteBlock(
      messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    );

    const userMessagesCharacterCount = messages
      .filter((m) => m.role === "user")
      .reduce((acc, m) => acc + m.content.length, 0);
    const averageSentenceLength = 75;
    const compressedSentencesCount = Math.round(
      userMessagesCharacterCount / averageSentenceLength / 2
    );

    const prompt =
      `Summarize all the information the user said in the provided dialog below in roughly ${compressedSentencesCount} sentences. Use the previous notes for a better understanding of the conversation and connect to them. Answer with only the summary.` +
      "\n" +
      "Here is the dialog:\n" +
      chatStr;

    const fullMessage = await callOllamaToString({
      model: FAST_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    this.state.allEntries[getTodayDateStr()] = fullMessage;
    this.save();

    return fullMessage;
  }

  async getWelcomeMessage(initReason: AgentInitReason): Promise<OllamaResult> {
    const hasHistory = Object.keys(this.state.allEntries).length > 0;
    if (!hasHistory || initReason === "firstMeet") {
      const firstMessage = AGENT_CONSTANTS[this.id].firstMessage;
      return {
        stream: (async function* () {
          yield firstMessage;
        })(),
        fullMessagePromise: Promise.resolve(firstMessage),
      };
    }

    let rule: string;
    if (this.id === "journaling") {
      rule =
        "Start the conversation by asking them about how their day today went";
    } else {
      rule =
        initReason === "relevantToToday"
          ? "Use today's journal entry to start the conversation."
          : "Based on the last conversation you two had, start the conversation by recalling the last topic in one sentence and why it's important, then based on that ask a question.";
    }

    const fullSystemPrompt =
      this.systemPrompt + "\n" + (await this.getContextString()) + "\n" + rule;

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

  get lastCheckInDate(): string | undefined {
    return Object.keys(this.state.allEntries).sort().at(-1);
  }

  checkInPressure(date: Date): number | null {
    const lastCheckInDate = this.lastCheckInDate;
    if (!lastCheckInDate) {
      return null;
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
