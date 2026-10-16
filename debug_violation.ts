import { createAIBot } from "./index";
import { PacketId } from "./src/protocol/packets";

const auth = JSON.parse(require('fs').readFileSync('./.aether-auth/msa-AetherBot.json', 'utf8'));

const bot = createAIBot({
  host: "lotus.taspmail.online",
  port: 19132,
  username: "VikramDon9580",
  aiApiKey: "REDACTED_GEMINI_KEY",
  offline: false,
  auth
});

bot.on('packet', (id, data) => {
  if (id === PacketId.PacketViolationWarning) {
    console.log("VIOLATION_DETECTED:", JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    process.exit(0);
  }
  if (id === PacketId.Disconnect) {
      console.log("DISCONNECT:", data.message);
      process.exit(1);
  }
});

bot.on('spawn', () => {
    console.log("SPAWNED");
    process.exit(0);
});

setTimeout(() => {
  console.log("TIMEOUT");
  process.exit(1);
}, 20000);
