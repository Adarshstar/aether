import { createAIBot } from "./index";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const username = "VikramDon9580";
const targetUser = "Adarshkumar1783";
const targetPos = { x: 40, y: 77, z: 20 };

const bot = createAIBot({
  host: "lotus.taspmail.online",
  port: 19132,
  username: username,
  // Using the stable Google key from config
  aiApiKey: "REDACTED_GEMINI_KEY",
  aiModel: "gemini-flash-latest", 
  agentTickMs: 4000, 
  offline: false,
  authCacheDir: join(__dirname, '.aether-auth'),
  autoStartAgent: true,
  enableChatBrain: true,
  enableDecision: true,
  autonomous: true,
});

bot.on('error', (err) => console.error("[BOT_ERROR]", err));
bot.on('login', () => console.log("LOGGED_IN"));

bot.on('spawn', () => {
  console.log("BOT_SPAWNED");
  bot.chat(`Aether Engine V6 Online. Brain: Gemini Flash Latest. Meeting Adarsh at x:40 y:77 z:20.`);
  
  if ((bot as any).planner) {
    (bot as any).planner.setObjective(`Find ${targetUser} at x:40, y:77, z:20 and answer every question.`);
  }

  if ((bot as any).pathfinder) {
    (bot as any).pathfinder.goto(targetPos);
  } else {
    (bot as any).targetPos = targetPos;
  }
});

bot.on('chat', (sender, message) => {
  console.log(`[CHAT] ${sender}: ${message}`);
});

bot.on('disconnect', (reason) => {
  console.log("DISCONNECTED:", reason);
  process.exit(0);
});

console.log("Starting Aether Engine V6...");
bot.connect().catch(err => {
  console.error("Connection failed:", err);
  process.exit(1);
});
