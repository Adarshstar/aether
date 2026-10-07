# Aether Roadmap

**Current version:** 1.4.1-alpha  
**Target:** Bedrock Dedicated Server **1.26.52.3** (Protocol **2193**, NetherNet)

## Completed in 1.4.1-alpha (this release)

- [x] NetherNet join reliability improvements
  - Exponential backoff retries for probe + signaling
  - Configurable ICE gather timeout & candidate collection
  - Health monitor / stale detection
  - Extra STUN servers + User-Agent
- [x] Expanded AI planner action set
  - dig, place, equip, use_item, eat, follow_entity, remember
  - Richer observation (inventory summary, recent failures)
- [x] Survival module (health / food / oxygen awareness)
- [x] Documentation & version bump

## Phase 1 — Core Stability (next)
- [ ] Full live join validation against real BDS 1.26.52.3
- [ ] Robust WebRTC injection (werift) documentation + helper
- [ ] SubChunkRequest reliability under load
- [ ] PlayerAuthInput edge cases (sneak, swim, glide)
- [ ] Automatic reconnect with session resume

## Phase 2 — AI & Gameplay
- [ ] Goal-oriented task planner (mine X, build schematic, farm)
- [ ] Long-term memory store (SQLite / JSON)
- [ ] Multi-bot coordination primitives
- [ ] Crafting recipe solver
- [ ] Better combat targeting + threat evaluation

## Phase 3 — Modules
- [ ] Farming module (plant / harvest / breed)
- [ ] Building / schematic placer
- [ ] Storage & chest management
- [ ] Villager trading helper
- [ ] Redstone interaction helpers

## Phase 4 — Production
- [ ] Config profiles & CLI
- [ ] Metrics / structured logging
- [ ] Plugin API freeze
- [ ] Example bots + tutorials
- [ ] CI against official BDS docker image

## Long-term
Become the reference open-source AI client engine for official Minecraft Bedrock Dedicated Servers.
