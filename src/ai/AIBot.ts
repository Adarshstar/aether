/**
 * High-level AI Bot factory — full Aether stack with human-like behavior
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
import {
  createHumanBehavior,
  type HumanBehavior,
} from "../human/HumanBehavior";
import type { PersonalityPreset, PersonalityTraits } from "../human/Personality";

export interface AIBotOptions extends BotOptions {
  aiApiKey: string;
  aiBaseUrl?: string;
  aiModel?: string;
  temperature?: number;
  maxTokens?: number;
  agentTickMs?: number;
  autoStartAgent?: boolean;
  systemPrompt?: string;
  headers?: Record<string, string>;
  enableCommands?: boolean;
  enableChatBrain?: boolean;
  enableDecision?: boolean;
  commandPrefix?: string;
  commandAllowUsers?: string[];
  /** Human personality preset or partial traits */
  personality?: PersonalityPreset | Partial<PersonalityTraits>;
  /** Start in autonomous human-like freeplay (default true with AI) */
  autonomous?: boolean;
  /** Ambient fidget / look-around (default true) */
  humanFidget?: boolean;
}

export interface AIBot extends Bot {
  llm: LLMClient;
  decision: DecisionEngine;
  commands: CommandRouter;
  explore: ExploreModule;
  scripts: ScriptRunner;
  chatBrain: ChatBrain;
  survival: Survival;
  human: HumanBehavior;
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
    temperature: options.temperature ?? 0.55,
    maxTokens: options.maxTokens ?? 800,
    systemPrompt: options.systemPrompt,
    headers: options.headers,
  };

  bot.llm = new LLMClient(llmOpts);
  bot.agent.setPlanner(createLLMPlanner(llmOpts));
  bot.agent.setTickInterval(options.agentTickMs ?? 2200);

  bot.human = createHumanBehavior(bot, {
    personality: options.personality ?? "default",
    fidget: options.humanFidget !== false,
    ambientChat: true,
  });

  bot.explore = createExplore(bot);
  bot.decision = createDecisionEngine(bot, { tickMs: 450 });
  bot.decision.attachAgent(bot.agent);
  bot.decision.attachExplore(bot.explore);
  bot.decision.attachHuman(bot.human);

  bot.scripts = bot.scripts ?? createScriptRunner(bot);
  bot.commands = createCommandRouter(bot, {
    prefix: options.commandPrefix ?? "!",
    allowUsers: options.commandAllowUsers,
    decision: bot.decision,
    scripts: bot.scripts,
  });

  bot.chatBrain = createChatBrain(
    bot,
    options.enableChatBrain === false ? null : bot.llm,
    { requireMention: false, replyChance: 0.35 * (bot.human.personality.sociability + 0.2) }
  );

  bot.survival = createSurvival(bot, { autoEat: true });
  bot.survival.attachAgent(bot.agent);

  bot.startAI = async () => {
    console.log("[Aether AI] Human + agent + decision starting");
    bot.human.start();
    bot.survival.start();
    bot.decision.start();
    const mode = options.autonomous === false ? "ai" : "autonomous";
    bot.decision.setMode(mode as any, {});
    // Still run LLM planner for richer decisions when mode is ai;
    // autonomous uses personality; also start agent for hybrid
    await bot.agent.start();
  };

  bot.stopAI = () => {
    bot.agent.stop();
    bot.decision.stop();
    bot.survival.stop();
    bot.human.stop();
    console.log("[Aether AI] Stopped");
  };

  bot.askAI = async (prompt: string) => {
    return bot.llm.complete(
      "You are Aether, a human-like Minecraft Bedrock player. Be concise and casual.",
      prompt
    );
  };

  if (options.autoStartAgent !== false) {
    bot.on("spawn", () => {
      bot.startAI().catch((e) => console.error("[Aether AI]", e));
    });
  }

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    const m = message.toLowerCase();
    if (m.includes("explore") && (m.includes("aether") || m.includes(bot.username.toLowerCase()))) {
      bot.decision.setMode("explore", { radius: 48 });
      bot.chat("on it");
    }
  });

  return bot;
}
