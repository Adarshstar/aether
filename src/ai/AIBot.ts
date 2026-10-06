/**
 * High-level AI Bot factory — Aether as an AI bot client engine
 * Wraps createBot + LLM planner + agent loop
 */

import { createBot } from "../core/createBot";
import type { Bot } from "../core/Bot";
import type { BotOptions } from "../types";
import { createLLMPlanner, type LLMPlannerOptions } from "./LLMPlanner";
import { LLMClient } from "./LLMClient";

export interface AIBotOptions extends BotOptions {
  /** OpenAI-compatible API key */
  aiApiKey: string;
  /** Chat completions URL (default OpenAI) */
  aiBaseUrl?: string;
  /** Model id */
  aiModel?: string;
  temperature?: number;
  maxTokens?: number;
  /** Agent loop interval ms */
  agentTickMs?: number;
  /** Auto-start agent on spawn */
  autoStartAgent?: boolean;
  systemPrompt?: string;
  headers?: Record<string, string>;
}

export interface AIBot extends Bot {
  llm: LLMClient;
  /** Start the LLM agent loop */
  startAI(): Promise<void>;
  stopAI(): void;
  /** One-shot ask the model */
  askAI(prompt: string): Promise<string>;
}

export function createAIBot(options: AIBotOptions): AIBot {
  if (!options.aiApiKey) throw new Error("createAIBot: aiApiKey is required");

  const bot = createBot(options) as AIBot;

  const llmOpts: LLMPlannerOptions = {
    apiKey: options.aiApiKey,
    baseUrl: options.aiBaseUrl,
    model: options.aiModel ?? "gpt-4o-mini",
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens ?? 800,
    systemPrompt: options.systemPrompt,
    headers: options.headers,
  };

  bot.llm = new LLMClient(llmOpts);
  bot.agent.setPlanner(createLLMPlanner(llmOpts));
  if (options.agentTickMs) bot.agent.setTickInterval(options.agentTickMs);

  bot.startAI = async () => {
    console.log("[Aether AI] Agent loop starting");
    await bot.agent.start();
  };

  bot.stopAI = () => {
    bot.agent.stop();
    console.log("[Aether AI] Agent loop stopped");
  };

  bot.askAI = async (prompt: string) => {
    return bot.llm.complete(
      "You are an assistant for a Minecraft Bedrock bot. Be concise.",
      prompt
    );
  };

  if (options.autoStartAgent !== false) {
    bot.on("spawn", () => {
      // non-blocking
      bot.startAI().catch((e) => console.error("[Aether AI]", e));
    });
  }

  return bot;
}
