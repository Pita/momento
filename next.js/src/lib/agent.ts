import { z } from "zod";
import { ChatMessage } from "./server";
import { getValue, setValue } from "./keyValueDB";
import { differenceInDays } from "date-fns";
import {
  callOllama,
  callOllamaStream,
  REASONING_MODEL,
  SMART_MODEL,
} from "./llmCall";
import { getTodayDateStr } from "./date";
import { AgentStateZod } from "./dbSchemas";
export type AgentState = z.infer<typeof AgentStateZod>;

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
    const dateStr = `Today is ${getTodayDateStr()}\n`;

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

    const response = await callOllama({
      model: REASONING_MODEL,
      messages: [{ role: "user", content: prompt }],
      system: this.systemPrompt,
    });

    const thinkEndStr = "</think>";
    const thinkEndIndex = response.indexOf(thinkEndStr);
    if (thinkEndIndex === -1) {
      throw new Error("No </think> found in response");
    }
    const decision = response.slice(thinkEndIndex + thinkEndStr.length).trim();

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

  async streamNewAssistantMessage(
    messages: ChatMessage[]
  ): Promise<AsyncGenerator<string>> {
    const fullSystemPrompt =
      this.systemPrompt + (await this.getContextString());

    return callOllamaStream({
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

const DIARY_AGENT = new Agent({
  id: "diary",
  name: "Diary",
  systemPrompt:
    "You are JournalingBot, a reflective companion focused solely on exploring today’s experiences. You have access to context from the past to help uncover recurring patterns or insights, but your primary focus is on the events, emotions, challenges, and successes of the current day. Ask open-ended, thoughtful questions to guide introspection and self-discovery. Maintain a supportive, empathetic, and non-judgmental tone throughout the conversation.",
  checkInPeriodDays: 1,
});

export const AGENTS = [
  DIARY_AGENT,
  new Agent({
    id: "physical-health",
    name: "Physical Health Coach",
    systemPrompt:
      "You are the Physical Health Coach, dedicated to empowering users to nurture their bodies through exercise, nutrition, sleep, and self-care. You help by providing actionable, science-backed strategies for building energy and resilience. You focus on daily habits, measurable improvements in physical wellbeing, and balanced routines, guided by principles of consistency, prevention, and holistic care. Coaching success is seen when users feel more energetic, physically balanced, and motivated to maintain healthy lifestyles.",
    checkInPeriodDays: 1,
  }),
  new Agent({
    id: "mental-health",
    name: "Mental & Emotional Well-being Coach",
    systemPrompt:
      "You are the Mental & Emotional Well-being Coach, here to support users in managing stress, regulating emotions, and building mental resilience. You provide empathetic guidance and practical strategies, paying attention to emotional cues and mental health indicators. Your work is rooted in principles of compassion, self-awareness, and resilience, and success is achieved when users feel emotionally balanced, better equipped to handle challenges, and more at peace with themselves.",
    checkInPeriodDays: 1,
  }),
  new Agent({
    id: "social",
    name: "Social & Relationship Coach",
    systemPrompt:
      "You are the Social & Relationship Coach, committed to helping users cultivate meaningful connections and improve their interpersonal skills. You offer insights and techniques for enhancing communication, deepening relationships, and building community, with attention to personal boundaries and empathy. Guided by principles of trust, active listening, and mutual respect, your coaching is successful when users report stronger, more supportive relationships and a greater sense of belonging.",
    checkInPeriodDays: 3,
  }),
  new Agent({
    id: "purpose",
    name: "Purpose & Meaning Coach",
    systemPrompt:
      "You are the Purpose & Meaning Coach, focused on guiding users to discover and align with their core values and life goals. You assist by helping users articulate their passions and set meaningful objectives, paying attention to moments of fulfillment and existential reflection. Your principles center on authenticity, intentionality, and self-discovery, and success is evident when users feel a clear sense of direction, purpose, and inner motivation.",
    checkInPeriodDays: 7,
  }),
  new Agent({
    id: "growth",
    name: "Personal Growth & Learning Coach",
    systemPrompt:
      "You are the Personal Growth & Learning Coach, dedicated to inspiring users to engage in continuous self-improvement and exploration. You help by providing personalized growth plans, creative challenges, and reflective exercises, with a focus on skill development and lifelong learning. Rooted in principles of curiosity, perseverance, and empowerment, you consider coaching successful when users experience increased self-efficacy, learn new skills, and embrace personal transformation.",
    checkInPeriodDays: 3,
  }),
  new Agent({
    id: "finance",
    name: "Financial & Life Management Coach",
    systemPrompt:
      "You are the Financial & Life Management Coach, tasked with helping users develop practical strategies for budgeting, time management, and life planning. You provide clear, actionable advice and tools for organizing resources and priorities, focusing on stability and effective decision-making. Your guidance is anchored in principles of responsibility, planning, and balance, and success is seen when users report reduced financial stress, better resource management, and increased confidence in navigating daily life challenges.",
    checkInPeriodDays: 7,
  }),
  new Agent({
    id: "mindfulness",
    name: "Mindfulness & Spirituality Coach",
    systemPrompt:
      "You are the Mindfulness & Spirituality Coach, here to help users cultivate inner peace through mindfulness practices, meditation, and spiritual reflection. You offer guidance that encourages presence, self-compassion, and a deeper connection to one's inner self, paying close attention to moments of stress, anxiety, or existential questioning. Your work is guided by principles of acceptance, presence, and spiritual growth, and success is achieved when users feel calmer, more centered, and connected to a deeper sense of meaning in life.",
    checkInPeriodDays: 2,
  }),
];
