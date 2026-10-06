# Aether vs Mineflayer (downloaded master, 2026-10-06)

Source: `https://github.com/PrismarineJS/mineflayer/archive/refs/heads/master.zip`  
Mineflayer version in package.json: **4.39.0**

They are **not interchangeable**. Mineflayer is a Java Edition client. Aether is a Bedrock Edition client for BDS 1.26.52.3 / protocol 2193 / NetherNet.

## Size (source, excluding node_modules)

Counted from a fresh GitHub master zip this session (Python line counts; `cloc` was not available in the sandbox).

| Codebase | Files | Lines | Notes |
|----------|-------|-------|--------|
| Mineflayer `lib/` | 55 `.js` | 7,494 | 43 plugins under `lib/plugins/` |
| Mineflayer whole tree | 241 | 38,757 | includes docs, tests, examples |
| Aether `src/` | ~58 `.ts` | ~7,500+ | Bedrock codecs in-tree |
| Aether tests | 19 `.ts` | ~1,100 | `bun test` |

Mineflayer's real surface is larger once you count companion packages it depends on (`minecraft-protocol`, `prismarine-chunk`, `prismarine-world`, `prismarine-physics`, `mineflayer-pathfinder`, `minecraft-data`, …). Aether keeps those concerns inside this tree.

## Architecture

| | Mineflayer | Aether |
|--|------------|--------|
| Edition | Java | Bedrock |
| Transport | TCP via `minecraft-protocol` | NetherNet (HTTP `/v1/join` + WebRTC data channels) |
| Core style | Thin bot + **43 inject plugins** under `lib/plugins/` | Hot APIs **on Bot** (dig, place, goTo, inventory) |
| Pathfinding | Separate `mineflayer-pathfinder` | Built-in Pathfinder + Goal* classes |
| Auth | Mojang / Microsoft (Java) | Xbox Live + ES384 JWT chain / offline multiplayer token |
| World | `prismarine-world` + `prismarine-chunk` | Internal Chunk (Y -64…319) + paletted LevelChunk + SubChunkRequest |
| Movement | Physics plugin + position packets | 20 Hz **PlayerAuthInput** bitset (67 flags) |
| AI | None first-class | `createAIBot({ aiApiKey, aiBaseUrl })` LLM planner |
| Maturity | Production Java, years of servers | Alpha Bedrock; live public BDS not verified |

## Mineflayer 4.39 dependencies (from downloaded package.json)

minecraft-data, minecraft-protocol, mojangson, prismarine-biome, prismarine-block, prismarine-chat, prismarine-chunk, prismarine-entity, prismarine-item, prismarine-nbt, prismarine-physics, prismarine-recipe, prismarine-registry, prismarine-windows, prismarine-world, protodef, typed-emitter, uuid-1345, vec3

## 43 built-in plugins

abilities, anvil, bed, block_actions, blocks, book, boss_bar, breath, chat, chest, command_block, craft, creative, digging, enchantment_table, entities, experience, explosion, fishing, furnace, game, generic_place, health, inventory, kick, particle, physics, place_block, place_entity, rain, ray_trace, resource_pack, scoreboard, sequence, settings, simple_inventory, sound, spawn_point, tablist, team, time, title, villager

Aether maps many of these as **core methods or first-class modules** (`inventory`, `combat`, `pvp`, `autoeat`, `collect`, `windows`, `physics`, `chat`) rather than inject-only plugins. Plugins remain optional.

Do not claim Aether is a drop-in Mineflayer replacement.
