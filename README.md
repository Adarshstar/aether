# Aether 1.7.0-alpha

Bedrock AI bot engine for **BDS 1.26.52.3** (protocol **2193**, NetherNet).

## Gaps filled (1.7)

- **ItemStackRequest** for live inventory moves / craft hooks  
- **StartGame palette** merges into block/item registries  
- **Entities** from AddEntity/AddPlayer tracked in spatial index  
- **Containers** open/close events  
- **Farm** harvest/plant helpers  
- **equip()** sends MobEquipment  

```bash
bun run validate:join
bun run bench:path
bun test
```

See [ROADMAP.md](ROADMAP.md) · [docs/LIVE_JOIN.md](docs/LIVE_JOIN.md)

## License

MIT
