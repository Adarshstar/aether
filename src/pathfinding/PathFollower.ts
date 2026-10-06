/**
 * PathFollower – drives the bot with real control states
 */

import type { Bot } from "../core/Bot";
import type { Vec3 } from "../types";
import { distanceSquared } from "../types";

export interface PathFollowerOptions {
  arrivalThreshold?: number;
  sprint?: boolean;
  jumpObstacles?: boolean;
}

export class PathFollower {
  private bot: Bot;
  private path: Vec3[] = [];
  private index = 0;
  private active = false;
  private opts: Required<PathFollowerOptions>;
  private tickHandler: (() => void) | null = null;

  constructor(bot: Bot, opts: PathFollowerOptions = {}) {
    this.bot = bot;
    this.opts = {
      arrivalThreshold: opts.arrivalThreshold ?? 0.6,
      sprint: opts.sprint ?? true,
      jumpObstacles: opts.jumpObstacles ?? true,
    };
  }

  follow(path: Vec3[]): void {
    this.stop();
    if (!path.length) return;
    this.path = path;
    this.index = 0;
    this.active = true;
    this.tickHandler = () => this.onTick();
    this.bot.on("physicsTick", this.tickHandler);
    console.log(`[PathFollower] Following ${path.length} waypoints`);
    (this.bot as any).emit?.("pathStart", path);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.path = [];
    this.index = 0;
    if (this.tickHandler) {
      this.bot.removeListener("physicsTick", this.tickHandler);
      this.tickHandler = null;
    }
    for (const c of ["forward", "back", "left", "right", "jump", "sprint"] as const) {
      this.bot.setControlState(c, false);
    }
  }

  get isFollowing() { return this.active; }
  get remaining() { return Math.max(0, this.path.length - this.index); }

  private onTick(): void {
    if (!this.active || !this.bot.entity) return;
    if (this.index >= this.path.length) {
      (this.bot as any).emit?.("goalReached");
      this.stop();
      return;
    }

    const target = this.path[this.index];
    const pos = this.bot.entity.position;
    const distSq = distanceSquared(pos, target);

    if (distSq <= this.opts.arrivalThreshold ** 2) {
      this.index++;
      if (this.index >= this.path.length) {
        this.stop();
        return;
      }
      return;
    }

    this.bot.lookAt(target);
    this.bot.setControlState("forward", true);
    this.bot.setControlState("sprint", this.opts.sprint);

    const dy = target.y - pos.y;
    this.bot.setControlState("jump", this.opts.jumpObstacles && dy > 0.4);

    // Send movement if protocol supports it
    (this.bot as any).protocol?.sendMovement?.(
      { x: pos.x, y: pos.y, z: pos.z },
      this.bot.entity.yaw,
      this.bot.entity.pitch
    );
  }
}
