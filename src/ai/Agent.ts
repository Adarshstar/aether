/**
 * AI Agent – advanced observe/plan/act with real path following
 */

import type { Bot } from "../core/Bot";
import type { Vec3, Entity } from "../types";
import type { Pathfinder, Goal } from "../pathfinding/Pathfinder";

export type AgentAction =
  | { type: "chat"; message: string }
  | { type: "move_to"; goal: Goal }
  | { type: "follow_path"; path: Vec3[] }
  | { type: "look_at"; position: Vec3 }
  | { type: "control"; control: "forward" | "back" | "left" | "right" | "jump" | "sneak" | "sprint"; state: boolean }
  | { type: "attack"; targetId?: number }
  | { type: "wait"; ms: number }
  | { type: "stop" }
  | { type: "custom"; name: string; data?: any };

export interface AgentObservation {
  position: Vec3 | null;
  velocity: Vec3 | null;
  yaw: number;
  pitch: number;
  health: number;
  food: number;
  oxygen: number;
  dimension: number;
  time: number;
  raining: boolean;
  nearestPlayer: Entity | null;
  nearestEntity: Entity | null;
  entityCount: number;
  playerCount: number;
  loadedChunks: number;
  heldItem: any;
  timestamp: number;
}

export type PlannerFn = (observation: AgentObservation, bot: Bot) => Promise<AgentAction[]> | AgentAction[];

export class Agent {
  private bot: Bot;
  private pathfinder: Pathfinder | null = null;
  private running = false;
  private planner: PlannerFn | null = null;
  private tickInterval = 400;
  private actionQueue: AgentAction[] = [];
  private memory: Record<string, any> = {};
  private lastObservation: AgentObservation | null = null;

  constructor(bot: Bot) { this.bot = bot; }

  attachPathfinder(pf: Pathfinder) { this.pathfinder = pf; }
  setPlanner(fn: PlannerFn) { this.planner = fn; }
  setTickInterval(ms: number) { this.tickInterval = Math.max(50, ms); }

  remember(key: string, value: any) { this.memory[key] = value; }
  recall<T = any>(key: string): T | undefined { return this.memory[key]; }
  forget(key?: string) { if (key) delete this.memory[key]; else this.memory = {}; }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log("[Agent] Control loop started");

    while (this.running) {
      try {
        const obs = this.observe();
        this.lastObservation = obs;

        if (this.actionQueue.length === 0 && this.planner) {
          const actions = await this.planner(obs, this.bot);
          if (Array.isArray(actions) && actions.length) this.actionQueue.push(...actions);
        }

        const action = this.actionQueue.shift();
        if (action) await this.execute(action);
      } catch (err) {
        console.error("[Agent] Loop error:", err);
      }
      await this.sleep(this.tickInterval);
    }
  }

  stop() {
    this.running = false;
    this.actionQueue = [];
    this.bot.pathFollower.stop();
    console.log("[Agent] Stopped");
  }

  enqueue(...actions: AgentAction[]) { this.actionQueue.push(...actions); }
  clearQueue() { this.actionQueue = []; }

  observe(): AgentObservation {
    const e = this.bot.entity;
    return {
      position: e?.position ?? null,
      velocity: e?.velocity ?? null,
      yaw: e?.yaw ?? 0,
      pitch: e?.pitch ?? 0,
      health: this.bot.health,
      food: this.bot.food,
      oxygen: this.bot.oxygen,
      dimension: this.bot.game?.dimension ?? 0,
      time: this.bot.game?.time ?? 0,
      raining: this.bot.game?.raining ?? false,
      nearestPlayer: this.bot.nearestEntity((ent) => ent.type === "player") as Entity | null,
      nearestEntity: this.bot.nearestEntity() as Entity | null,
      entityCount: this.bot.entities.size,
      playerCount: this.bot.players.size,
      loadedChunks: this.bot.world.loadedColumns,
      heldItem: this.bot.inventory.heldItem,
      timestamp: Date.now(),
    };
  }

  get lastObs() { return this.lastObservation; }

  private async execute(action: AgentAction): Promise<void> {
    switch (action.type) {
      case "chat":
        this.bot.chat(action.message);
        break;
      case "move_to":
        if (this.pathfinder && this.bot.entity) {
          const path = this.pathfinder.findPath(this.bot.entity.position, action.goal);
          console.log(`[Agent] Path length ${path.length}`);
          if (path.length) this.bot.pathFollower.follow(path);
        }
        break;
      case "follow_path":
        this.bot.pathFollower.follow(action.path);
        break;
      case "look_at":
        this.bot.lookAt(action.position);
        break;
      case "control":
        this.bot.setControlState(action.control, action.state);
        break;
      case "attack":
        this.bot.combat.attack();
        break;
      case "wait":
        await this.sleep(action.ms);
        break;
      case "stop":
        this.clearQueue();
        this.bot.pathFollower.stop();
        break;
      case "custom":
        console.log(`[Agent] custom:${action.name}`, action.data ?? "");
        break;
    }
  }

  private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}
