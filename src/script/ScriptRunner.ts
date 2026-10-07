/**
 * Custom script runner — register named scripts invoked via !script name
 */

import type { Bot } from "../core/Bot";
import type { CommandContext } from "../commands/CommandRouter";

export type ScriptFn = (ctx: CommandContext) => Promise<void> | void;

export class ScriptRunner {
  private scripts = new Map<string, ScriptFn>();
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
    this.registerBuiltins();
  }

  register(name: string, fn: ScriptFn) {
    this.scripts.set(name.toLowerCase(), fn);
  }

  list(): string[] {
    return [...this.scripts.keys()].sort();
  }

  async run(name: string, ctx: CommandContext) {
    const fn = this.scripts.get(name.toLowerCase());
    if (!fn) throw new Error(`Unknown script: ${name}`);
    await fn(ctx);
  }

  private registerBuiltins() {
    this.register("wave", async (ctx) => {
      ctx.bot.chat("o/");
      ctx.bot.setControlState("jump", true);
      await sleep(200);
      ctx.bot.setControlState("jump", false);
    });

    this.register("spin", async (ctx) => {
      if (!ctx.bot.entity) return;
      for (let i = 0; i < 8; i++) {
        ctx.bot.entity.yaw += Math.PI / 4;
        await sleep(100);
      }
    });

    this.register("home", async (ctx) => {
      const spawn = ctx.bot.spawnPoint;
      await ctx.bot.goTo({
        type: "near",
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        range: 2,
      });
      ctx.bot.chat("Back near spawn.");
    });

    this.register("scan", async (ctx) => {
      const n = ctx.bot.entities.size;
      const p = ctx.bot.players.size;
      ctx.reply(`Entities=${n} players=${p} chunks=${ctx.bot.world.loadedColumns}`);
    });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createScriptRunner(bot: Bot) {
  return new ScriptRunner(bot);
}
