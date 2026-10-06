/**
 * PvP / combat companion – mineflayer-pvp inspired
 */

import type { Bot } from "../core/Bot";
import type { Entity } from "../types";
import { distance } from "../types";

export class PvP {
  private bot: Bot;
  private target: Entity | null = null;
  private active = false;
  private range = 3.5;
  private tickHandler: (() => void) | null = null;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  attack(entity: Entity) {
    this.target = entity;
    this.active = true;
    if (!this.tickHandler) {
      this.tickHandler = () => this.onTick();
      this.bot.on("physicsTick", this.tickHandler);
    }
  }

  stop() {
    this.active = false;
    this.target = null;
    if (this.tickHandler) {
      this.bot.removeListener("physicsTick", this.tickHandler);
      this.tickHandler = null;
    }
  }

  private onTick() {
    if (!this.active || !this.target || !this.bot.entity) return;
    const d = distance(this.bot.entity.position, this.target.position);
    if (d > 16) {
      this.stop();
      return;
    }
    this.bot.lookAt(this.target.position);
    if (d <= this.range) {
      this.bot.combat.attack(this.target);
    } else {
      this.bot.setControlState("forward", true);
      this.bot.setControlState("sprint", true);
    }
  }

  get isFighting() { return this.active; }
}
