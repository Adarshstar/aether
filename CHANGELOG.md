# Changelog

## [1.4.3-alpha] — 2026-10-07

### Added
- **Real UseItem / ReleaseItem packets** for eating and activating held items
  - `buildUseItemPacket`, `buildReleaseItemPacket`, `UseItemAction`
  - `BDSSession.useItem()` / `releaseItem()`
  - `Bot.activateItem()` / `Bot.eat()`
- **AutoEat** now selects food and sends InventoryTransaction UseItem (click air) + delayed ReleaseItem
- **docs/LIVE_JOIN.md** — minimal checklist to verify live BDS 1.26.52.3 join

### Improved
- AI Agent `eat` / `use_item` actions call the real packet path

## [1.4.2-alpha] — 2026-10-07

- Auto-reconnect, PlayerAuthInput swim/glide/fly, WebRTC helper, SubChunk retries

## [1.4.1-alpha] — 2026-10-07

- NetherNet retries, expanded AI planner, Survival module

## [1.4.0-alpha] — 2026-10-06

- Initial public extraction for BDS 1.26.52.3 / protocol 2193
