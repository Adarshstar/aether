/**
 * Combat – InventoryTransaction + Animate via BDSSession when available
 */

import type { Bot } from "../core/Bot";
import type { Entity } from "../types";
import { distance } from "../types";

export class Combat {
  private bot: Bot;
  private attackCooldownMs = 500;
  private lastAttack = 0;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  swingArm() {
    this.bot.session?.protocol.send(0x2c, {
      actionId: 1,
      runtimeEntityId: 1,
    });
  }

  attack(target?: Entity) {
    const now = Date.now();
    if (now - this.lastAttack < this.attackCooldownMs) return false;

    const entity = target ?? this.bot.nearestEntity((e) => e.type !== "player" && e.type !== "item");
    if (!entity || !this.bot.entity) return false;

    if (distance(this.bot.entity.position, entity.position) > 4.5) return false;

    this.bot.lookAt(entity.position);
    this.bot.session?.attackEntity(entity.id);
    this.lastAttack = now;
    return true;
  }
}
