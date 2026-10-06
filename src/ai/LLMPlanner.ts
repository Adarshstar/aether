/**
 * LLM-powered planner for Aether Agent
 * Converts world observation → JSON actions via ChatGPT-compatible API
 */

import type { Bot } from "../core/Bot";
import type { AgentAction, AgentObservation, PlannerFn } from "./Agent";
import { LLMClient, type LLMClientOptions } from "./LLMClient";

const SYSTEM_PROMPT = `You are the brain of a Minecraft Bedrock bot (Aether engine).
You receive a JSON observation of the bot's state and must reply with ONLY a JSON array of actions.
No markdown, no explanation — pure JSON array.

Allowed actions:
{ "type": "chat", "message": "string" }
{ "type": "move_to", "goal": { "type": "near", "x": n, "y": n, "z": n, "range": n } }
{ "type": "move_to", "goal": { "type": "block", "x": n, "y": n, "z": n } }
{ "type": "look_at", "position": { "x": n, "y": n, "z": n } }
{ "type": "control", "control": "forward"|"back"|"left"|"right"|"jump"|"sneak"|"sprint", "state": true|false }
{ "type": "attack" }
{ "type": "wait", "ms": number }
{ "type": "stop" }
{ "type": "custom", "name": "string", "data": any }

Rules:
- Prefer short action lists (1-4 actions).
- If idle and healthy, explore or chat briefly.
- If low health, avoid combat and retreat.
- Coordinates are in the observation.position field.
- Never invent packet types outside the list above.
`;

export interface LLMPlannerOptions extends LLMClientOptions {
  systemPrompt?: string;
  /** Max history messages kept (user+assistant pairs) */
  maxHistory?: number;
}

function parseActions(text: string): AgentAction[] {
  let s = text.trim();
  // strip markdown fences if model ignores instructions
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const parsed = JSON.parse(s);
  if (!Array.isArray(parsed)) throw new Error("LLM did not return a JSON array");
  return parsed as AgentAction[];
}

export function createLLMPlanner(opts: LLMPlannerOptions): PlannerFn {
  const client = new LLMClient(opts);
  const system = opts.systemPrompt ?? SYSTEM_PROMPT;
  const maxHistory = opts.maxHistory ?? 6;
  const history: { role: "user" | "assistant"; content: string }[] = [];

  return async (observation: AgentObservation, _bot: Bot): Promise<AgentAction[]> => {
    const obsJson = JSON.stringify({
      position: observation.position,
      health: observation.health,
      food: observation.food,
      dimension: observation.dimension,
      time: observation.time,
      raining: observation.raining,
      entityCount: observation.entityCount,
      playerCount: observation.playerCount,
      nearestPlayer: observation.nearestPlayer
        ? { type: observation.nearestPlayer.type, position: observation.nearestPlayer.position }
        : null,
      nearestEntity: observation.nearestEntity
        ? { type: observation.nearestEntity.type, position: observation.nearestEntity.position }
        : null,
      heldItem: observation.heldItem,
    });

    const userContent = `Observation:\n${obsJson}\n\nReply with a JSON action array only.`;

    const messages = [
      { role: "system" as const, content: system },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: userContent },
    ];

    try {
      const res = await client.chat(messages);
      const actions = parseActions(res.content);

      history.push({ role: "user", content: userContent });
      history.push({ role: "assistant", content: res.content });
      while (history.length > maxHistory * 2) history.shift();

      return actions;
    } catch (err: any) {
      console.error("[LLMPlanner]", err?.message ?? err);
      return [{ type: "wait", ms: 2000 }];
    }
  };
}
