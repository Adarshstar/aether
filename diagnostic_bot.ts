import { createAIBot } from "./index";
import { PacketId } from "./src/protocol/packets";
import fs from "fs";

async function run() {
    const auth = JSON.parse(fs.readFileSync('./.aether-auth/msa-AetherBot.json', 'utf8'));

    const bot = createAIBot({
        host: "lotus.taspmail.online",
        port: 19132,
        username: "VikramDon9580",
        aiApiKey: "REDACTED_GEMINI_KEY",
        offline: false,
        auth
    });

    console.log("LOG: Bot instance created, starting connection...");

    bot.on('packet', (id, data) => {
        // Log all packets during the handshake to find the violation
        if (id < 0x20 || id === PacketId.PacketViolationWarning || id === PacketId.Disconnect) {
            console.log(`PKT [0x${id.toString(16)}]:`, JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        }
    });

    bot.on('spawn', () => {
        console.log("LOG: BOT_SPAWNED_SUCCESSFULLY");
        bot.chat("Aether Bot Fixed & Online");
    });

    bot.on('error', (err) => {
        console.error("LOG: ERROR:", err);
    });

    bot.on('disconnect', (reason) => {
        console.log("LOG: DISCONNECTED:", reason);
    });
}

run().catch(console.error);
