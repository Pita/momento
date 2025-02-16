import { getValue, setValue } from "./keyValueDB";
import { differenceInDays } from "date-fns";
import {
  callOllamaStream,
  callOllamaToString,
  FAST_MODEL,
  OllamaResult,
  SMART_MODEL,
} from "./llmCall";
import { toAbsoluteDateStr, toRelativeDateStr } from "./date";
import { MentorState, ChatMessage } from "./dbSchemas";
import { MENTOR_CONSTANTS, MentorId, MentorSchema } from "./mentorConstants";
import { getAllChats } from "./chat";

export type GeneratorWithDoneStatus = {
  generator: AsyncGenerator<string>;
  isDonePromise: Promise<boolean>;
};

function quoteBlock(content: string): string {
  return `\n'''\n${content}\n'''\n`;
}

const standardMentoringPrompt = `You ask questions to understand the user's perspective, uncover patterns, and challenge limiting beliefs. Your goal is to guide self-reflection, facilitate emotional processing, and support growth by helping them set goals and take action. Rather than giving direct advice, encourage insight and personal responsibility for change.`;

export class Mentor {
  id: MentorId;
  name: string;
  systemPrompt: string;
  checkInPeriodDays: number;
  state: MentorState;

  constructor(mentor: MentorSchema) {
    this.id = mentor.id;
    this.name = mentor.name;
    this.systemPrompt = mentor.systemPrompt;
    this.checkInPeriodDays = mentor.checkInPeriodDays;

    this.state = getValue(this.id, "mentorState") ?? {
      summaries: {},
    };
  }

  save() {
    setValue(this.id, "mentorState", this.state);
  }

  public getHistoryString(): string | null {
    if (Object.keys(this.state.summaries).length === 0) {
      return null;
    }

    return Object.entries(this.state.summaries)
      .sort(([aDate], [bDate]) => bDate.localeCompare(aDate))
      .map(([date, content]) => `${toRelativeDateStr(date)}: ${content}`)
      .join("\n");
  }

  // TODO: will need a summarize function to not grow forever
  private async getContextString(date: string): Promise<string> {
    const context: string[][] = [[`Today is ${toAbsoluteDateStr(date)}`]];

    const journalEntries = JOURNALING_MENTOR.getHistoryString();
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

  async summarizeChat(messages: ChatMessage[], date: string): Promise<string> {
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

    this.state.summaries[date] = fullMessage;
    this.save();

    return fullMessage;
  }

  async getInitialMessage(date: string): Promise<OllamaResult> {
    const hasHistory = Object.keys(this.state.summaries).length > 0;
    if (hasHistory) {
      return this.getCheckInMessage(date);
    }
    return this.getWelcomeMessage();
  }

  private async getWelcomeMessage(): Promise<OllamaResult> {
    const firstMessage = MENTOR_CONSTANTS[this.id].firstMessage;
    return {
      stream: (async function* () {
        yield firstMessage;
      })(),
      fullMessagePromise: Promise.resolve(firstMessage),
    };
  }

  private async getCheckInMessage(date: string): Promise<OllamaResult> {
    const rule =
      "Based on the last conversation you two had, start the conversation by recalling the last topic in one sentence and why it's important, then ask them what they would like to talk about today.";

    const fullSystemPrompt =
      this.systemPrompt +
      "\n" +
      (await this.getContextString(date)) +
      "\n" +
      rule;

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

  async getNewAssistantMessage(
    messages: ChatMessage[],
    date: string
  ): Promise<OllamaResult> {
    const fullSystemPrompt =
      this.systemPrompt +
      "\n\n" +
      standardMentoringPrompt +
      "\n\n" +
      (await this.getContextString(date)) +
      "\nBriefly give your thoughts on the last message. Then ask 3 very short easy questions in your response, use a numbered list.";

    return await callOllamaStream({
      model: SMART_MODEL,
      messages: messages,
      system: fullSystemPrompt,
    });
  }

  get lastCheckInDate(): string | undefined {
    return Object.keys(this.state.summaries).sort().at(-1);
  }

  needsCheckIn(date: Date): boolean {
    const lastCheckInDate = this.lastCheckInDate;
    if (!lastCheckInDate) {
      return true;
    }

    const daysSinceLastCheckIn = differenceInDays(
      date,
      new Date(lastCheckInDate)
    );
    return daysSinceLastCheckIn > this.checkInPeriodDays;
  }
}

export const JOURNALING_MENTOR = new Mentor(MENTOR_CONSTANTS.journaling);

export const MENTORS = [
  new Mentor(MENTOR_CONSTANTS["physical-health"]),
  new Mentor(MENTOR_CONSTANTS["mental-health"]),
  new Mentor(MENTOR_CONSTANTS.social),
  new Mentor(MENTOR_CONSTANTS.purpose),
  new Mentor(MENTOR_CONSTANTS.growth),
  new Mentor(MENTOR_CONSTANTS.finance),
  new Mentor(MENTOR_CONSTANTS.mindfulness),
];

export const ALL_MENTORS: Record<MentorId, Mentor> = {
  journaling: JOURNALING_MENTOR,
  "physical-health": MENTORS[0],
  "mental-health": MENTORS[1],
  social: MENTORS[2],
  purpose: MENTORS[3],
  growth: MENTORS[4],
  finance: MENTORS[5],
  mindfulness: MENTORS[6],
};

export type MentorCheckinState =
  | { type: "regular" }
  | { type: "needs_attention"; msg: string };

async function getJournalingState(
  dateId: string
): Promise<"never" | "not_today" | "today"> {
  const journalingDates = new Set(
    getAllChats()
      .filter((c) => c.mentorId === "journaling")
      .map((c) => c.date)
  );

  if (journalingDates.size === 0) {
    return "never";
  }
  if (journalingDates.has(dateId)) {
    return "today";
  }
  return "not_today";
}

export async function getMentorsWithStates(
  dateId: string
): Promise<Array<{ mentorId: MentorId; state: MentorCheckinState }>> {
  const journalingState = await getJournalingState(dateId);
  if (journalingState === "never") {
    return Object.keys(ALL_MENTORS).map((m) => ({
      mentorId: m,
      state:
        m === "journaling"
          ? { type: "needs_attention", msg: "Needs introduction" }
          : { type: "regular" },
    })) as Array<{ mentorId: MentorId; state: MentorCheckinState }>;
  }

  if (journalingState === "not_today") {
    return Object.keys(ALL_MENTORS).map((mentorId) => {
      // Journaling mentor always needs a check-in if not done today
      if (mentorId === "journaling") {
        return {
          mentorId,
          state: { type: "needs_attention", msg: "Let's check in" },
        };
      }

      return {
        mentorId,
        state: { type: "regular" },
      };
    }) as Array<{ mentorId: MentorId; state: MentorCheckinState }>;
  }

  return Object.entries(ALL_MENTORS).map(([mentorId, mentor]) => {
    const needsCheckIn = mentor.needsCheckIn(new Date(dateId));

    return {
      mentorId,
      state: needsCheckIn
        ? { type: "needs_attention", msg: "Let's check in" }
        : { type: "regular" },
    };
  }) as Array<{ mentorId: MentorId; state: MentorCheckinState }>;
}
