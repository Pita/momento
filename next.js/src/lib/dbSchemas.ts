import { z } from "zod";

export const ChatMessageZod = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageZod>;

export const ChatStateZod = z.object({
  date: z.string(),
  mentorId: z.string(),
  version: z.literal("1"),
  messages: z.array(ChatMessageZod),
});

export type ChatState = z.infer<typeof ChatStateZod>;

export const MentorStateZod = z.object({
  summaries: z.record(z.string(), z.string()),
});

export type MentorState = z.infer<typeof MentorStateZod>;

// Dictionary of valid Zod types.
// You can extend this with additional types.
export const schemas = {
  mentorState: MentorStateZod,
  chatState: ChatStateZod,
};
