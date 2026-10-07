# Aether 1.8.0-alpha — Custom & undefined work

Bedrock AI bot engine (**BDS 1.26.52.3** / protocol **2193**).

## Custom work & scripts

```ts
// Define any custom capability
bot.scripts.define("cheer", async (bot, data) => {
  bot.chat(data.msg ?? "yay");
});

// Mini-language pipeline
await bot.scripts.evalLines([
  "chat hello",
  "wait 500",
  "goto 10 65 10",
  "custom cheer {\"msg\":\"done\"}",
]);

// Undefined work board
const job = bot.scripts.postWork("something not coded yet");
await bot.scripts.resolveWork(job.id, { script: "chat handled later" });

// Macros
bot.scripts.saveMacro("intro", [
  { op: "chat", args: "hi" },
  { op: "jump" },
]);
await bot.scripts.playMacro("intro");
```

### Chat commands

| Command | Meaning |
|---------|---------|
| `!script name` | Run named script |
| `!script do chat hi \| wait 300 \| jump` | Inline pipeline |
| `!custom mine_area {"r":3}` | Run custom handler |
| `!eval goto 0 65 0 \| eat` | Eval mini-language |
| `!work dig a tunnel` | Post open/undefined work |
| `!resolve work_1 chat ok` | Resolve open work |
| `!macro intro` | Play saved macro |

Agent LLM can emit `{ "type": "custom", "name": "pipeline", "data": { "steps": [...] } }`.

## Join

```bash
bun add werift
bun run join:fast
```

## License

MIT
