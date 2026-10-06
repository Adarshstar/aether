/**
 * Auto-eat companion – mineflayer-auto-eat inspired
 */

import type { Bot } from "../core/Bot";

const FOOD_IDS = new Set([260, 297, 319, 320, 350, 357, 360, 364, 366, 391, 392, 393, 400]);

export class AutoEat {
  private bot: Bot;
  private enabled = false;
  private foodThreshold = 14;
  private tickHandler: (() => void) | null = null;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  enable(threshold = 14) {
    this.foodThreshold = threshold;
    this.enabled = true;
    if (!this.tickHandler) {
      this.tickHandler = () => this.check();
      this.bot.on("health", this.tickHandler);
      this.bot.on("physicsTick", this.tickHandler);
    }
  }

  disable() {
    this.enabled = false;
    if (this.tickHandler) {
      this.bot.removeListener("health", this.tickHandler);
      this.bot.removeListener("physicsTick", this.tickHandler);
      this.tickHandler = null;
    }
  }

  private check() {
    if (!this.enabled || this.bot.food > this.foodThreshold) return;
    const food = this.bot.inventory.findItem((i) => FOOD_IDS.has(i.networkId) || (i.name?.includes("apple") ?? false) || (i.name?.includes("bread") ?? false));
    if (!food) return;
    this.bot.inventory.selectHotbar(Math.min(8, food.slot));
    console.log(`[AutoEat] eating slot ${food.slot}`);
    // Real: use item packet
  }
}
