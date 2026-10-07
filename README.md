# Aether 1.7.1-alpha — Fast joinable Bedrock AI engine

**BDS 1.26.52.3** · protocol **2193** · NetherNet

## Join fast

```bash
bun add werift          # once — enables real WebRTC
bun run join:fast       # MC_HOST / MC_PORT env optional
# or
STRICT_WEBRTC=1 bun run validate:join
```

### Join speedups (1.7.1)

- Auto-detect **werift / wrtc / global RTCPeerConnection**
- **Parallel** probe + WebRTC load
- **Early ICE** (send after ≥2 candidates, default timeout **2.2s**)
- Tighter signaling (**8s**) and retries (**350ms** base)
- Default STUN servers

Without werift/wrtc, engine falls back to **development loopback** (AI still works; not a live BDS player).

## Also included

AI agent · human personalities · spatial entity index · fast pathfinder · ItemStackRequest · Farm · craft/windows · TaskQueue

## License

MIT
