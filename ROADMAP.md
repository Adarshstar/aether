# Aether Roadmap

**Current version:** 1.4.3-alpha  
**Target:** Bedrock Dedicated Server **1.26.52.3** (Protocol **2193**, NetherNet)

## Completed

### 1.4.3-alpha
- [x] Real UseItem + ReleaseItem for eating / activate item
- [x] AutoEat wired to live session packets
- [x] Minimal live-join checklist (`docs/LIVE_JOIN.md`)

### 1.4.2-alpha
- [x] Auto-reconnect, auth-input edge cases, WebRTC helper, SubChunk retries

### 1.4.1-alpha
- [x] NetherNet reliability, expanded AI planner, Survival module

## Phase 1 — Core Stability (remaining)
- [ ] Full live join validation against real BDS 1.26.52.3 (follow LIVE_JOIN.md)
- [ ] End-to-end werift integration test with food eat on server
- [ ] Session resume / token refresh

## Phase 2 — AI & Gameplay
- [ ] Goal-oriented task planner
- [ ] Long-term memory
- [ ] Crafting recipe solver
- [ ] Better combat targeting

## Phase 3 — Modules
- [ ] Farming, building, storage, villager trading

## Phase 4 — Production
- [ ] CLI, metrics, CI against official BDS
