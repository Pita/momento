"use server";

// Types for messages and chats
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Updated ChatSummary without messages.
export type ChatSummary = {
  id: string; // standardized date stamp (e.g., "2023-10-11")
};

// New type for full chat details including messages.
export type ChatDetail = ChatSummary & {
  messages: ChatMessage[];
};

// In-memory storage for chats (the "mock database") now holds full chat details
const mockChats: ChatDetail[] = [];
const MOCK_DELAY = 500;

// Simulated endpoint to fetch old chats
export async function fetchOldChats(): Promise<ChatSummary[]> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(mockChats.map((chat) => ({ id: chat.id }))),
      MOCK_DELAY
    );
  });
}

// Simulated endpoint to start a new chat for today
// REST endpoint: POST /api/chats
export async function startNewChat(): Promise<ChatDetail> {
  const today = new Date().toISOString().split("T")[0];
  const newChat: ChatDetail = {
    id: today,
    messages: [
      {
        role: "assistant",
        content: "Hello, tell me about your day.",
      },
    ],
  };
  mockChats.push(newChat);
  return new Promise((resolve) => {
    setTimeout(() => resolve(newChat), MOCK_DELAY);
  });
}

// Simulated sending of a message
// REST endpoint: POST /api/chats/:chatId/messages
export async function* sendMessageToChat(
  content: string,
  chatSummary: ChatSummary // eslint-disable-line @typescript-eslint/no-unused-vars
): AsyncGenerator<string> {
  const mockResponse = "Assistant mock response to: " + content;
  const words = mockResponse.split(" ");

  for (const word of words) {
    await new Promise((resolve) =>
      setTimeout(resolve, MOCK_DELAY / words.length)
    );
    yield word + " ";
  }
}

// Simulated endpoint to load the full details of a chat
// REST endpoint: GET /api/chats/:chatId
export async function loadChatDetails(chatId: string): Promise<ChatDetail> {
  return new Promise((resolve, reject) => {
    const chat = mockChats.find((c) => c.id === chatId);
    setTimeout(() => {
      if (chat) {
        resolve(chat);
      } else {
        reject(new Error("Chat not found"));
      }
    }, MOCK_DELAY);
  });
}
