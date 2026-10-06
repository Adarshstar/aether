/**
 * High-performance A* – uses BlockRegistry for walkability
 */

import type { Vec3 } from "../types";
import type { World } from "../world/World";
import { Goal, GoalBlock, GoalNear, GoalXZ } from "../goals";
import { MinHeap } from "./Heap";
import { BlockRegistry } from "../registry/blocks";

export interface PathNode {
  x: number; y: number; z: number;
  g: number; h: number; f: number;
  parent: PathNode | null;
}

export type GoalInput =
  | Goal
  | { type: "block"; x: number; y: number; z: number }
  | { type: "near"; x: number; y: number; z: number; range: number }
  | { type: "xz"; x: number; z: number };

export interface PathfinderOptions {
  maxNodes?: number;
  allowDiagonal?: boolean;
  jumpHeight?: number;
  fallHeight?: number;
  avoidLiquid?: boolean;
}

function toGoal(g: GoalInput): Goal {
  if (g instanceof Goal) return g;
  if (g.type === "block") return new GoalBlock(g.x, g.y, g.z);
  if (g.type === "near") return new GoalNear(g.x, g.y, g.z, g.range);
  return new GoalXZ(g.x, g.z);
}

export class Pathfinder {
  private world: World;
  private maxNodes: number;
  private allowDiagonal: boolean;
  private jumpHeight: number;
  private fallHeight: number;
  private avoidLiquid: boolean;

  constructor(world: World, opts: PathfinderOptions = {}) {
    this.world = world;
    this.maxNodes = opts.maxNodes ?? 10000;
    this.allowDiagonal = opts.allowDiagonal ?? true;
    this.jumpHeight = opts.jumpHeight ?? 1;
    this.fallHeight = opts.fallHeight ?? 4;
    this.avoidLiquid = opts.avoidLiquid ?? true;
  }

  findPath(start: Vec3, goalInput: GoalInput): Vec3[] {
    const goal = toGoal(goalInput);
    if (!goal.isValid()) return [];

    const sx = Math.floor(start.x), sy = Math.floor(start.y), sz = Math.floor(start.z);
    const startNode: PathNode = {
      x: sx, y: sy, z: sz,
      g: 0, h: goal.heuristic({ x: sx, y: sy, z: sz }), f: 0, parent: null,
    };
    startNode.f = startNode.h;

    const open = new MinHeap<PathNode>((n) => n.f);
    const openMap = new Map<string, PathNode>();
    const closed = new Set<string>();
    const key = (x: number, y: number, z: number) => `${x}:${y}:${z}`;

    open.push(startNode);
    openMap.set(key(sx, sy, sz), startNode);

    let iterations = 0;
    while (open.size > 0 && iterations < this.maxNodes) {
      iterations++;
      const current = open.pop()!;
      const ck = key(current.x, current.y, current.z);
      openMap.delete(ck);
      if (closed.has(ck)) continue;
      closed.add(ck);

      if (goal.isEnd(current)) return this.reconstruct(current);

      for (const nb of this.neighbors(current)) {
        const nk = key(nb.x, nb.y, nb.z);
        if (closed.has(nk)) continue;
        const tentG = current.g + this.cost(current, nb);
        const existing = openMap.get(nk);
        if (!existing || tentG < existing.g) {
          nb.g = tentG;
          nb.h = goal.heuristic(nb);
          nb.f = nb.g + nb.h;
          nb.parent = current;
          if (!existing) {
            open.push(nb);
            openMap.set(nk, nb);
          } else {
            existing.g = tentG;
            existing.h = nb.h;
            existing.f = nb.f;
            existing.parent = current;
            open.update(existing);
          }
        }
      }
    }
    return [];
  }

  private cost(a: PathNode, b: PathNode): number {
    const dx = Math.abs(a.x - b.x), dz = Math.abs(a.z - b.z), dy = b.y - a.y;
    let c = dx && dz ? 1.4142 : 1;
    if (dy > 0) c += 0.6 * dy;
    if (dy < 0) c += 0.15 * -dy;
    // penalty for liquid feet
    const feet = this.world.getBlock(b.x, b.y, b.z);
    if (BlockRegistry.isLiquid(feet)) c += 2;
    return c;
  }

  private neighbors(node: PathNode): PathNode[] {
    const out: PathNode[] = [];
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (this.allowDiagonal) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);

    for (const [dx, dz] of dirs) {
      this.tryMove(out, node.x + dx, node.y, node.z + dz);
      for (let j = 1; j <= this.jumpHeight; j++) this.tryMove(out, node.x + dx, node.y + j, node.z + dz);
      for (let f = 1; f <= this.fallHeight; f++) this.tryMove(out, node.x + dx, node.y - f, node.z + dz);
    }
    return out;
  }

  /** Standable: feet+head passable, below solid (or liquid if allowed) */
  private tryMove(out: PathNode[], x: number, y: number, z: number) {
    const feetId = this.world.getBlock(x, y, z);
    const headId = this.world.getBlock(x, y + 1, z);
    const belowId = this.world.getBlock(x, y - 1, z);

    const feet = BlockRegistry.get(feetId);
    const head = BlockRegistry.get(headId);
    const below = BlockRegistry.get(belowId);

    if (!feet.passable || !head.passable) return;
    if (this.avoidLiquid && feet.liquid) return;

    const support = below.solid || (!this.avoidLiquid && below.liquid);
    if (!support) return;

    out.push({ x, y, z, g: 0, h: 0, f: 0, parent: null });
  }

  private reconstruct(node: PathNode): Vec3[] {
    const path: Vec3[] = [];
    let cur: PathNode | null = node;
    while (cur) {
      path.push({ x: cur.x + 0.5, y: cur.y, z: cur.z + 0.5 });
      cur = cur.parent;
    }
    return path.reverse();
  }
}

export type { GoalInput as Goal };
