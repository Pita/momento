import { ChatDetail, ChatMessage } from "./server";
import { z } from "zod";
import { getValue, setValue } from "./keyValueDB";
import { Agent, AGENTS } from "./agent";
import { ChatStateZod } from "./dbSchemas";

export type ChatState = z.infer<typeof ChatStateZod>;

export class Chat {
  id: string;
  state: ChatState;

  constructor(id: string) {
    this.id = id;
    this.state = getValue(this.id, "chatState") ?? {
      version: "1",
      history: [
        {
          agentId: "diary",
          messages: [
            {
              role: "assistant",
              content: "Hello, please tell me about your day.",
            },
          ],
          completed: false,
        },
      ],
      agentsLinedup: [],
    };
  }

  save() {
    setValue(this.id, "chatState", this.state);
  }

  private async onDiaryCompleted(messages: ChatMessage[]) {
    // get all messages from diary agent and extract entries for each agent
    const diaryRelatedAgents = new Set<string>();
    for (const agent of AGENTS) {
      const hasEntry = await agent.extractEntryFromChat(messages);
      if (hasEntry) {
        diaryRelatedAgents.add(agent.id);
      }
    }

    // get agents with pressure and related agents
    const today = new Date();
    const linedupAgents = AGENTS.map((a) => ({
      id: a.id,
      pressure:
        a.checkInPressure(today) + (diaryRelatedAgents.has(a.id) ? 1 : 0),
    }))
      .filter((a) => a.pressure > 1)
      .sort((a, b) => b.pressure - a.pressure)
      .map((a) => a.id);

    this.state.agentsLinedup = linedupAgents;
  }

  private async runFirstAgentIfNotConcluded(
    agent: Agent,
    messages: ChatMessage[]
  ): Promise<AsyncGenerator<string> | null> {
    return agent.streamNewAssistantMessage(messages);
  }

  async *processUserMessage(message: string): AsyncGenerator<string> {
    const firstAgentHistory = this.state.history.at(-1)!;
    const firstAgentMessages = firstAgentHistory.messages;
    // add message to history
    firstAgentMessages.push({
      role: "user",
      content: message,
    });

    const firstAgent = AGENTS.find((a) => a.id === firstAgentHistory.agentId);
    if (!firstAgent) {
      throw new Error(`Agent ${firstAgentHistory.agentId} not found`);
    }

    const firstAgentGenerator = await this.runFirstAgentIfNotConcluded(
      firstAgent,
      firstAgentMessages
    );
    const hasConcluded = firstAgentGenerator === null;
    if (!hasConcluded) {
      let assistantMessage = "";
      for await (const chunk of firstAgentGenerator) {
        assistantMessage += chunk;
        yield chunk;
      }

      firstAgentMessages.push({
        role: "assistant",
        content: assistantMessage,
      });

      this.save();

      return;
    }

    firstAgentHistory.completed = true;
    if (firstAgent.id === "diary") {
      await this.onDiaryCompleted(firstAgentMessages);
    }

    const secondAgentId = this.state.agentsLinedup.shift();
    if (!secondAgentId) {
      yield "That's all for now. Goodbye!";
      return;
    }

    const secondAgent = AGENTS.find((a) => a.id === secondAgentId);
    if (!secondAgent) {
      throw new Error(`Agent ${secondAgentId} not found`);
    }

    let secondAssistantMessage = "";

    const secondAgentGenerator = await secondAgent.streamNewAssistantMessage(
      []
    );

    for await (const chunk of secondAgentGenerator) {
      secondAssistantMessage += chunk;
      yield chunk;
    }

    this.state.history.push({
      agentId: secondAgentId,
      messages: [
        {
          role: "assistant",
          content: secondAssistantMessage,
        },
      ],
      completed: false,
    });

    this.save();
  }

  getChatDetails(): ChatDetail {
    return {
      id: this.id,
      messages: this.state.history.flatMap((h) => h.messages),
    };
  }
}
