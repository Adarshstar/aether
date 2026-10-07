/**
 * High-level decision engine — modes + AI overrides.
 * Modes: idle | explore | follow | goto | guard | ai
 * Runs faster than the LLM planner for reactive behavior.
 */

import type { Bot } from "../core/Bot";
import type { Agent } from "../ai/Agent";
import type { ExploreModule } from "../explore/Explore";
import { distance } from "../types";

export type DecisionMode =
  | "idle"
  | "explore"
  | "follow"
  | "goto"
  | "guard"
  | "ai";

export interface DecisionEngineOptions {
  tickMs?: number;
  /** Hostility distance for guard mode */
  guardRange?: number;
}

export class DecisionEngine {
  private bot: Bot;
  private agent: Agent | null = null;
  private explore: ExploreModule | null = null;
  private mode: DecisionMode = "idle";
  private meta: Record<string, any> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickMs: number;
  private guardRange: number;
  private running = false;

  constructor(bot: Bot, opts: DecisionEngineOptions = {}) {
    this.bot = bot;
    this.tickMs = opts.tickMs ?? 500;
    this.guardRange = opts.guardRange ?? 12;
  }

  attachAgent(agent: Agent) { this.agent = agent; }
  attachExplore(explore: ExploreModule) { this.explore = explore; }

  getMode() { return this.mode; }
  getMeta() { return { ...this.meta }; }

  setMode(mode: DecisionMode, meta: Record<string, any> = {}) {
    this.mode = mode;
    this.meta = meta;
    console.log(`[Decision] mode=${mode}`, meta);
    if (mode === "idle") {
      this.bot.stopPath();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.tick().catch((e) => console.error("[Decision]", e));
    }, this.tickMs);
    console.log("[Decision] Engine started");
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (!this.running || !this.bot.entity) return;

    switch (this.mode) {
      case "idle":
        return;
      case "explore":
        await this.tickExplore();
        break;
      case "follow":
        await this.tickFollow();
        break;
      case "goto":
        await this.tickGoto();
        break;
      case "guard":
        await this.tickGuard();
        break;
      case "ai":
        // LLM agent owns planning; decision engine only keeps survival pressure
        await this.tickSurvivalHints();
        break;
    }
  }

  private async tickSurvivalHints() {
    if (this.bot.food <= 6) {
      await this.bot.eat(true).catch(() => {});
    }
    if (this.bot.health <= 8) {
      this.bot.chat("Low health!");
    }
  }

  private async tickExplore() {
    if (!this.explore) return;
    const radius = this.meta.radius ?? 48;
    await this.explore.step(radius);
  }

  private async tickFollow() {
    const name = this.meta.player as string | undefined;
    if (!name || !this.bot.entity) return;
    let target = null as ReturnType<Bot["nearestEntity"]>;
    for (const [, e] of this.bot.players) {
      if (e.username?.toLowerCase() === name.toLowerCase()) {
        target = e;
        break;
      }
    }
    if (!target) {
      target = this.bot.nearestEntity((e) => e.type === "player") as any;
    }
    if (!target) return;
    const d = distance(this.bot.entity.position, target.position);
    if (d > 3) {
      await this.bot.goTo({
        type: "near",
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
        range: 2,
      });
    }
  }

  private async tickGoto() {
    const { x, y, z } = this.meta;
    if (x == null || !this.bot.entity) return;
    const d = distance(this.bot.entity.position, { x, y, z });
    if (d < 2.5) {
      this.setMode("idle");
      this.bot.chat("Arrived.");
      return;
    }
    // Re-path occasionally
    if (Math.random() < 0.15) {
      await this.bot.goTo({ type: "near", x, y, z, range: 2 });
    }
  }

  private async tickGuard() {
    await this.tickSurvivalHints();
    if (!this.bot.entity) return;
    const hostile = this.bot.nearestEntity((e) => {
      if (e.type === "player" || e.type === "item") return false;
      const n = (e.type || "").toLowerCase();
      return /zombie|skeleton|creeper|spider|pillager|vindicator|witch|enderman|drowned|husk|stray/.test(n);
    });
    if (hostile && this.bot.entity) {
      const d = distance(this.bot.entity.position, hostile.position);
      if (d <= this.guardRange) {
        this.bot.lookAt(hostile.position);
        this.bot.combat.attack(hostile);
        if (d > 3) {
          await this.bot.goTo({
            type: "near",
            x: hostile.position.x,
            y: hostile.position.y,
            z: hostile.position.z,
            range: 2,
          });
        }
      }
    }
  }
}

export function createDecisionEngine(bot: Bot, opts?: DecisionEngineOptions) {
  return new DecisionEngine(bot, opts);
}
