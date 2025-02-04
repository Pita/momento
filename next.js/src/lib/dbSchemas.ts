import { z } from "zod";

export const AgentHistoryZod = z.object({
  agentId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  completed: z.boolean(),
});

export const ChatStateZod = z.object({
  version: z.literal("1"),
  history: z.array(AgentHistoryZod),
  agentsLinedup: z.array(z.string()),
});

export const AgentEntry = z.object({
  date: z.string(),
  content: z.string(),
});

export const AgentStateZod = z.object({
  allEntries: z.array(AgentEntry),
  lastCheckInDate: z.string().nullable(),
});

// Dictionary of valid Zod types.
// You can extend this with additional types.
export const schemas = {
  agentState: AgentStateZod,
  chatState: ChatStateZod,
};
