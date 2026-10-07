# Aether Roadmap

**Current version:** 1.4.2-alpha  
**Target:** Bedrock Dedicated Server **1.26.52.3** (Protocol **2193**, NetherNet)

## Completed

### 1.4.2-alpha
- [x] Auto-reconnect with exponential backoff + events
- [x] PlayerAuthInput swim / glide / fly / ascend / descend
- [x] WebRTC helper module + docs snippet
- [x] SubChunk request retry under load
- [x] BotOptions fully wires NetherNet reliability settings

### 1.4.1-alpha
- [x] NetherNet retries, ICE gather timeout, health monitor
- [x] Expanded AI planner + Survival module

## Phase 1 — Core Stability (remaining)
- [ ] Full live join validation against real BDS 1.26.52.3
- [ ] End-to-end werift integration test
- [ ] Session resume / token refresh for long sessions

## Phase 2 — AI & Gameplay
- [ ] Goal-oriented task planner (mine X, build schematic, farm)
- [ ] Long-term memory store
- [ ] Multi-bot coordination
- [ ] Crafting recipe solver
- [ ] Better combat targeting

## Phase 3 — Modules
- [ ] Farming module
- [ ] Building / schematic placer
- [ ] Storage & chest management
- [ ] Villager trading helper

## Phase 4 — Production
- [ ] Config profiles & CLI
- [ ] Metrics / structured logging
- [ ] Plugin API freeze
- [ ] CI against official BDS
