import { createAIBot } from "./index";
import { PacketId } from "./src/protocol/packets";
import fs from "fs";

async function run() {
    const authPath = './.aether-auth/msa-AetherBot.json';
    if (!fs.existsSync(authPath)) {
        console.log("ERROR: Auth file missing at " + authPath);
        process.exit(1);
    }
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));

    const bot = createAIBot({
        host: "lotus.taspmail.online",
        port: 19132,
        username: "VikramDon9580",
        aiApiKey: "REDACTED_GEMINI_KEY",
        offline: false,
        auth
    });

    console.log("LOG: Bot instance created. Connecting...");

    bot.on('packet', (id, data) => {
        const hexId = "0x" + id.toString(16).padStart(2, '0');
        
        // Log critical handshake packets
        if (id === PacketId.PlayStatus) console.log(`PKT [${hexId}] PlayStatus:`, data.statusName || data.status);
        if (id === PacketId.Disconnect) console.log(`PKT [${hexId}] Disconnect:`, data.message);
        if (id === PacketId.PacketViolationWarning) {
            console.log(`PKT [${hexId}] VIOLATION:`, JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        }
        
        if (id === PacketId.StartGame) {
            console.log(`PKT [${hexId}] StartGame! Server Protocol:`, data.protocolVersion);
            // Implement "Ghost Mode" requests here once spawned
        }
    });

    bot.on('spawn', () => {
        console.log("LOG: SUCCESS! Bot spawned in the world.");
        bot.chat("Aether Engine: Ghost Mode Initializing...");
        
        // Implementation of "No Damage / No Mobs"
        // 1. Try to set permissions/abilities if we have them
        // 2. We can try sending AdventureSettings or UpdateAbilities
        
        console.log("LOG: Sending invincibility flags...");
        // In some engines, we can set specific flags in the auth input or separate packets
    });

    bot.on('error', (err) => {
        console.error("LOG: ERROR:", err);
    });
}

run().catch(console.error);
setTimeout(() => { console.log("LOG: Script timeout (30s)"); process.exit(0); }, 30000);
