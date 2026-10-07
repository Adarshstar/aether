/**
 * High-level AI Bot factory — full Aether stack:
 * createBot + LLM planner + decision engine + commands + explore + scripts + chat brain
 */

import { createBot } from "../core/createBot";
import type { Bot } from "../core/Bot";
import type { BotOptions } from "../types";
import { createLLMPlanner, type LLMPlannerOptions } from "./LLMPlanner";
import { LLMClient } from "./LLMClient";
import { createDecisionEngine, type DecisionEngine } from "../decision/DecisionEngine";
import { createCommandRouter, type CommandRouter } from "../commands/CommandRouter";
import { createExplore, type ExploreModule } from "../explore/Explore";
import { createScriptRunner, type ScriptRunner } from "../script/ScriptRunner";
import { createChatBrain, type ChatBrain } from "../chat/ChatBrain";
import { createSurvival, type Survival } from "../survival/Survival";

export interface AIBotOptions extends BotOptions {
  /** OpenAI-compatible API key */
  aiApiKey: string;
  aiBaseUrl?: string;
  aiModel?: string;
  temperature?: number;
  maxTokens?: number;
  agentTickMs?: number;
  autoStartAgent?: boolean;
  systemPrompt?: string;
  headers?: Record<string, string>;
  /** Enable chat commands (!goto, !explore, …) default true */
  enableCommands?: boolean;
  /** AI replies to player chat default true */
  enableChatBrain?: boolean;
  /** Start decision engine on spawn default true */
  enableDecision?: boolean;
  commandPrefix?: string;
  commandAllowUsers?: string[];
}

export interface AIBot extends Bot {
  llm: LLMClient;
  decision: DecisionEngine;
  commands: CommandRouter;
  explore: ExploreModule;
  scripts: ScriptRunner;
  chatBrain: ChatBrain;
  survival: Survival;
  startAI(): Promise<void>;
  stopAI(): void;
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
  else bot.agent.setTickInterval(2000); // slightly faster default

  bot.explore = createExplore(bot);
  bot.decision = createDecisionEngine(bot, { tickMs: 450 });
  bot.decision.attachAgent(bot.agent);
  bot.decision.attachExplore(bot.explore);

  bot.scripts = createScriptRunner(bot);
  bot.commands = createCommandRouter(bot, {
    prefix: options.commandPrefix ?? "!",
    allowUsers: options.commandAllowUsers,
    decision: bot.decision,
    scripts: bot.scripts,
  });
  if (options.enableCommands === false) {
    /* still constructed for API; chat handler only if attach was called — attach always for now */
  }

  bot.chatBrain = createChatBrain(
    bot,
    options.enableChatBrain === false ? null : bot.llm,
    { requireMention: false, replyChance: 0.3 }
  );

  bot.survival = createSurvival(bot, { autoEat: true });
  bot.survival.attachAgent(bot.agent);

  bot.startAI = async () => {
    console.log("[Aether AI] Agent + decision + survival starting");
    bot.survival.start();
    bot.decision.start();
    bot.decision.setMode("ai", {});
    await bot.agent.start();
  };

  bot.stopAI = () => {
    bot.agent.stop();
    bot.decision.stop();
    bot.survival.stop();
    console.log("[Aether AI] Stopped");
  };

  bot.askAI = async (prompt: string) => {
    return bot.llm.complete(
      "You are an assistant for a Minecraft Bedrock bot (Aether). Be concise.",
      prompt
    );
  };

  if (options.autoStartAgent !== false) {
    bot.on("spawn", () => {
      bot.startAI().catch((e) => console.error("[Aether AI]", e));
    });
  }

  // Optional: chat "Aether, explore" style natural language without !
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    const m = message.toLowerCase();
    if (m.includes("explore") && (m.includes("aether") || m.includes(bot.username.toLowerCase()))) {
      bot.decision.setMode("explore", { radius: 48 });
      bot.chat("Exploring!");
    }
  });

  return bot;
}
