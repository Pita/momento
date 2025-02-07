import ollama, { Tool } from "ollama";
import { ChatMessage } from "./server";
import { Message as OllamaMessage } from "ollama";

export const SMART_MODEL = "llama3.1:8b";
export const FAST_MODEL = "llama3.2:1b";
export const REASONING_MODEL = "deepseek-r1:8b";

type CallOllamaOpts = {
  model: string;
  messages: ChatMessage[];
  system?: string;
  tools?: Tool[];
};

export async function* callOllamaStream(
  opts: CallOllamaOpts
): AsyncGenerator<string> {
  const { model, messages, system, tools } = opts;

  let messagesWithSystem: OllamaMessage[] = messages;
  if (system) {
    messagesWithSystem = [{ role: "system", content: system }, ...messages];
  }
  const response = await ollama.chat({
    model,
    messages: messagesWithSystem,
    stream: true,
    tools: tools,
  });

  console.log("== OLLAMA ==");
  console.log("MODEL:", model);
  for (const [index, message] of messagesWithSystem.entries()) {
    console.log(`Message ${index + 1}:`);
    console.log(`  Role: ${message.role}`);
    console.log(`  Content: ${message.content}`);
  }

  console.log("== START ==");
  for await (const part of response) {
    process.stdout.write(part.message.content);
    yield part.message.content;
  }
  console.log("\n== END ==");
}

export async function callOllama(opts: CallOllamaOpts): Promise<string> {
  let result = "";
  for await (const chunk of callOllamaStream(opts)) {
    result += chunk;
  }
  return result;
}
