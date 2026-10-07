# Changelog

## [1.5.0-alpha] — 2026-10-07

### Xbox / auth
- Full device-code + refresh-token Microsoft login
- Token disk cache (`.aether-auth/`)
- Clearer XBL/XSTS/MC error messages
- Dual XSTS attempt (MC services + Xbox Live)

### Architecture & AI
- **DecisionEngine** — high-level modes (explore, follow, goto, guard, ai)
- **CommandRouter** — in-game `!` commands
- **ScriptRunner** — custom named scripts
- **ExploreModule** — autonomous exploration
- **ChatBrain** — LLM replies to player chat
- `createAIBot` wires the full stack on spawn
- Pathfinder `maxNodes` 16k + avoidLiquid

### Prior
- 1.4.3 UseItem eating + live-join checklist
- 1.4.2 auto-reconnect, auth-input edge cases, WebRTC helper
- 1.4.1 NetherNet reliability, Survival, expanded planner
