/**
 * Aether — full agent demo
 */

import {
  createBot, GoalNear, AETHER_NAME, AETHER_VERSION, TARGET_BDS,
} from "../index";
import { loggerPlugin } from "../src/plugins/logger";

console.log(`${AETHER_NAME} v${AETHER_VERSION} — target BDS ${TARGET_BDS}`);

const bot = createBot({
  host: "127.0.0.1",
  port: 19132,
  username: "AetherAgent",
  offline: true,
  transport: "nethernet",
  enablePhysics: true,
});

bot.loadPlugin(loggerPlugin);
bot.autoEat.enable(16);

bot.on("login", () => console.log("✓ login"));
bot.on("spawn", async () => {
  console.log("✓ spawn", bot.entity?.position);
  console.log("  dimension:", bot.dimension, "gameMode:", bot.gameMode);
  console.log("  blocks registered:", bot.blocks.size, "entities:", bot.entityTypes.size);

  // Seed ground for pathfinding demo
  for (let x = -8; x <= 8; x++)
    for (let z = -8; z <= 8; z++)
      bot.world.setBlock(x, 64, z, 1);

  bot.chat("Aether online");

  // Pathfind
  const path = await bot.goTo(new GoalNear(5, 65, 5, 1.5));
  console.log("path waypoints:", path.length);

  // Block query
  const b = bot.blockAt({ x: 0, y: 64, z: 0 });
  console.log("block under spawn:", b.name, "digMs:", bot.digTime(b.type));
});

bot.on("error", console.error);
bot.on("disconnect", (r) => console.log("disconnect:", r));

await bot.connect();
