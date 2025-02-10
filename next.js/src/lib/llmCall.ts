import ollama, { Tool } from "ollama";
import { Message as OllamaMessage } from "ollama";
import yaml from "js-yaml";
import { ChatMessage } from "./dbSchemas";

export const SMART_MODEL = "llama3.1:8b";
export const FAST_MODEL = "llama3.2:3b";

type CallOllamaOpts = {
  model: string;
  messages: ChatMessage[];
  system?: string;
  tools?: Tool[];
};

export type OllamaResult = {
  stream: AsyncGenerator<string>;
  fullMessagePromise: Promise<string>;
};

export async function callOllamaStream(
  opts: CallOllamaOpts
): Promise<OllamaResult> {
  let combinedMessage = "";
  let resolveFullMessage!: (message: string) => void;
  const fullMessagePromise = new Promise<string>((resolve) => {
    resolveFullMessage = resolve;
  });

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
  console.log(yaml.dump(messagesWithSystem));

  async function* streamGenerator(): AsyncGenerator<string> {
    console.log("== START ==");
    for await (const part of response) {
      process.stdout.write(part.message.content);
      combinedMessage += part.message.content;
      yield part.message.content;
    }
    console.log();
    console.log("== END ==");
    resolveFullMessage(combinedMessage);
  }

  return {
    stream: streamGenerator(),
    fullMessagePromise: fullMessagePromise,
  };
}

// Start Generation Here
export async function callOllamaToString(
  opts: CallOllamaOpts
): Promise<string> {
  const { stream, fullMessagePromise } = await callOllamaStream(opts);
  // Consume the entire stream to trigger the generator
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of stream) {
    // No operation needed; just ensure full consumption
  }
  // Return the concatenated full message once the stream is fully consumed
  return await fullMessagePromise;
}
