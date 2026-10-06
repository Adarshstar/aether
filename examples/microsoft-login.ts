/**
 * Example: Microsoft / Xbox account login
 * For real online servers set offline: false or auth: "microsoft"
 */

import { createBot } from "../index";

const bot = createBot({
  host: "play.example.com",
  port: 19132,
  username: "youremail@outlook.com", // Microsoft account email
  auth: "microsoft",                 // or offline: false
  transport: "nethernet",
  // clientId: "optional-azure-app-id",
});

bot.on("login", () => console.log("Authenticated & logged in"));
bot.on("spawn", () => {
  console.log("Spawned in world");
  bot.chat("Online with Microsoft account");
});
bot.on("error", console.error);
bot.on("disconnect", console.log);

await bot.connect();
