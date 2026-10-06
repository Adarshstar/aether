# Aether 1.4.0-alpha — BDS networking stack

AI bot client engine for **Minecraft Bedrock Dedicated Server 1.26.52.3** (protocol **2193**).

## Real BDS path (NetherNet)

For BDS with `transport=nethernet` (default on 1.26.5x):

1. **GET** `http://host:19132/v1/join` — probe (JSON: `protocol`, `version`, `networkId`, MOTD)
2. **WebRTC** `RTCPeerConnection` + data channels `ReliableDataChannel` / `UnreliableDataChannel`
3. **POST** `http://host:19132/v1/join/{networkId}` — SDP offer (optional `a=identity` ES384) → answer
4. Each data-channel message starts with a **1-byte fragment header** (0 = complete)
5. After NetworkSettings: compression id `0x00` raw DEFLATE / `0x01` Snappy / `0xFF` uncompressed
6. **Login** — RequestNetworkSettings → ClientCacheStatus → Login (JWT chain) → packs → StartGame → spawn
7. **Gameplay** — 20 Hz `PlayerAuthInput` (67-flag bitset), paletted `LevelChunk`, **SubChunkRequest** when the server uses request mode (`0xFFFFFFFF` / `0xFFFFFFFE`)

```ts
const bot = createBot({
  host: "127.0.0.1",
  port: 19132,
  username: "Aether",
  offline: true,
  transport: "nethernet",
});

// Inject WebRTC when runtime has no RTCPeerConnection
// import { RTCPeerConnection } from "werift";
// createPeerConnection: () => new RTCPeerConnection({ iceServers: [...] })

await bot.connect();
bot.on("spawn", () => bot.chat("online"));
```

Live join still needs a reachable BDS **and** a working `RTCPeerConnection`. Without WebRTC, Aether uses a **development loopback** so AI/pathfinding can be tested offline. That loopback is **not** a live BDS session. Real clients may refuse answers that omit `a=identity`; Aether signs the offer from the login ES384 key and can require a server identity on the answer.

## AI bot

```bash
AI_API_KEY=sk-... bun run examples/ai-bot.ts
```

`createAIBot({ aiApiKey, aiBaseUrl, aiModel })` is the stable high-level API.

## Tests

```bash
bun test
```

## License

MIT
