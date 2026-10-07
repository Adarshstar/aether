/**
 * High-level decision engine — modes + AI overrides.
 * Modes: idle | explore | follow | goto | guard | ai
 * Runs faster than the LLM planner for reactive behavior.
 */

import type { Bot } from "../core/Bot";
import type { Agent } from "../ai/Agent";
import type { ExploreModule } from "../explore/Explore";
import type { HumanBehavior } from "../human/HumanBehavior";
import { distance } from "../types";

export type DecisionMode =
  | "idle"
  | "explore"
  | "follow"
  | "goto"
  | "guard"
  | "ai"
  | "autonomous";

export interface DecisionEngineOptions {
  tickMs?: number;
  /** Hostility distance for guard mode */
  guardRange?: number;
}

export class DecisionEngine {
  private bot: Bot;
  private agent: Agent | null = null;
  private explore: ExploreModule | null = null;
  private human: HumanBehavior | null = null;
  private mode: DecisionMode = "idle";
  private meta: Record<string, any> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickMs: number;
  private guardRange: number;
  private running = false;
  private lastAutoPick = 0;

  constructor(bot: Bot, opts: DecisionEngineOptions = {}) {
    this.bot = bot;
    this.tickMs = opts.tickMs ?? 500;
    this.guardRange = opts.guardRange ?? 12;
  }

  attachAgent(agent: Agent) { this.agent = agent; }
  attachExplore(explore: ExploreModule) { this.explore = explore; }
  attachHuman(human: HumanBehavior) { this.human = human; }

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
    if (this.human?.isHesitating()) return;

    switch (this.mode) {
      case "idle":
        // Personality may self-start exploring
        if (this.human?.wantsExplore()) {
          this.setMode("explore", { radius: 32 + Math.floor(Math.random() * 40) });
        }
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
        await this.tickSurvivalHints();
        break;
      case "autonomous":
        await this.tickAutonomous();
        break;
    }
  }

  /** Personality-driven free play: survive, socialize, explore, or fight */
  private async tickAutonomous() {
    await this.tickSurvivalHints();
    const now = Date.now();
    if (now - this.lastAutoPick < 4000) return;
    this.lastAutoPick = now;

    const p = this.human?.personality;
    const aggression = p?.aggression ?? 0.35;
    const curiosity = p?.curiosity ?? 0.5;
    const sociability = p?.sociability ?? 0.5;

    // Nearby hostile?
    const hostile = this.bot.nearestEntity((e) => {
      if (e.type === "player" || e.type === "item") return false;
      return /zombie|skeleton|creeper|spider|pillager|drowned|husk|stray/i.test(e.type || "");
    });
    if (hostile && this.human?.wantsFight()) {
      this.bot.lookAt(hostile.position);
      if (Math.random() < aggression) this.bot.combat.attack(hostile);
      return;
    }

    // Nearby player — social look / approach
    const player = this.bot.nearestEntity((e) => e.type === "player");
    if (player && this.bot.entity && Math.random() < sociability * 0.3) {
      this.bot.lookAt({
        x: player.position.x,
        y: player.position.y + 1.6,
        z: player.position.z,
      });
      const d = distance(this.bot.entity.position, player.position);
      if (d > 4 && d < 16 && Math.random() < sociability * 0.2) {
        await this.bot.goTo({
          type: "near",
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          range: 3,
        });
      }
      return;
    }

    // Explore
    if (Math.random() < curiosity * 0.5) {
      await this.tickExplore();
    }
  }

  private async tickSurvivalHints() {
    if (this.bot.food <= 6) {
      await this.human?.react(250);
      await this.bot.eat(true).catch(() => {});
    }
    if (this.bot.health <= 8) {
      this.human?.hesitate(500);
      // Casual human phrasing
      if (Math.random() < 0.4) this.bot.chat(Math.random() < 0.5 ? "ow" : "low hp");
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
