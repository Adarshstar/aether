# Changelog

## [1.4.2-alpha] — 2026-10-07

### Added
- **Auto-reconnect** (`autoReconnect`, `maxReconnectAttempts`, `reconnectBaseMs`) with `reconnecting` / `reconnected` events
- **PlayerAuthInput edge cases**: swim, glide, fly, ascend, descend control flags
- **WebRTC helper** (`createWeriftPeerConnectionFactory`, `hasNativeRTC`, `tryNativePeerConnection`)
- **SubChunk request retry** — pending columns are retried once after 4s if no response
- NetherNet reliability options fully wired through `BotOptions`

### Improved
- `setControlState` forwards live controls into `BDSSession`
- Richer BotOptions for retries, ICE timeout, health checks

## [1.4.1-alpha] — 2026-10-07

### Added
- NetherNet exponential backoff retries, ICE gather timeout, health monitor
- Expanded AI planner actions (dig/place/equip/eat/follow_entity/remember)
- Survival module (auto-eat, low-health retreat)
- ROADMAP.md

## [1.4.0-alpha] — 2026-10-06

Initial public extraction of Aether engine for BDS 1.26.52.3 / protocol 2193.
