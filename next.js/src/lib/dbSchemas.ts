import { z } from "zod";

export const ChatMessageZod = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageZod>;

export const AgentChatZod = z.object({
  agentId: z.string(),
  messages: z.array(ChatMessageZod),
});

export type AgentChat = z.infer<typeof AgentChatZod>;

export type AgentInitReason = "relevantToToday" | "catchUp" | "firstMeet";

export type AgentSuggestion = {
  agentId: string;
  reason: AgentInitReason;
};

export const ChatStateZod = z.object({
  id: z.string(),
  version: z.literal("1"),
  agentChats: z.array(AgentChatZod),
  agentsRelevantToToday: z.nullable(z.array(z.string())),
});

export type ChatState = z.infer<typeof ChatStateZod>;

export const AgentStateZod = z.object({
  allEntries: z.record(z.string(), z.string()),
});

export type AgentState = z.infer<typeof AgentStateZod>;

// Dictionary of valid Zod types.
// You can extend this with additional types.
export const schemas = {
  agentState: AgentStateZod,
  chatState: ChatStateZod,
};
