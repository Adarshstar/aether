import { createAIBot } from "../index";
import { PacketId } from "../src/protocol/packets";

const auth = JSON.parse(require('fs').readFileSync('/home/ubuntu/aether-live/.aether-auth/msa-AetherBot.json', 'utf8'));

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
    console.log("!!! VIOLATION !!!");
    console.log(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    process.exit(0);
  }
  if (id === PacketId.Disconnect) {
    console.log("Disconnected:", data.message);
    process.exit(1);
  }
});

bot.on('spawn', () => {
    console.log("Spawned successfully!");
    // We stay online for a bit to see if violations happen post-spawn
});

setTimeout(() => {
  console.log("Test timed out.");
  process.exit(1);
}, 15000);
