import { createAIBot } from "./index";
import { PacketId } from "./src/protocol/packets";
import fs from "fs";

const auth = JSON.parse(fs.readFileSync('./.aether-auth/msa-AetherBot.json', 'utf8'));

const bot = createAIBot({
  host: "lotus.taspmail.online",
  port: 19132,
  username: "VikramDon9580",
  aiApiKey: "REDACTED_GEMINI_KEY",
  offline: false,
  auth,
  autoStartAgent: true,
  autonomous: true,
  enableCommands: true,
  enableChatBrain: true,
  enableDecision: true
});

bot.on('spawn', () => {
  console.log("⚡ [Aether] Bot spawned and AI is initializing...");
  bot.chat("Aether Engine Online. Gemini 3.8 Flash brain active.");
});

bot.on('chat', (username, message) => {
  console.log(`[CHAT] <${username}> ${message}`);
});

bot.on('error', (err) => {
  console.error("❌ [Aether Error]", err);
});

bot.on('disconnect', (reason) => {
  console.log("⚠️ [Aether] Disconnected:", reason);
  process.exit(0);
});

console.log("🚀 [Aether] Starting connection to lotus.taspmail.online...");
bot.connect().catch(console.error);
