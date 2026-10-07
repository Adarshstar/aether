/**
 * High-performance A* for Aether
 * Optimizations vs typical bot pathfinders:
 * - numeric packed keys (no string alloc in hot loop)
 * - node object pool
 * - early goal check
 * - optional path cache for repeated goals
 * - perf instrumentation
 */

import type { Vec3 } from "../types";
import type { World } from "../world/World";
import { Goal, GoalBlock, GoalNear, GoalXZ } from "../goals";
import { MinHeap } from "./Heap";
import { BlockRegistry } from "../registry/blocks";
import { globalPerf } from "../core/PerfMonitor";

export interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number;
  h: number;
  f: number;
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
  /** Cache last successful path keyed by start/goal cells */
  enableCache?: boolean;
}

function toGoal(g: GoalInput): Goal {
  if (g instanceof Goal) return g;
  if (g.type === "block") return new GoalBlock(g.x, g.y, g.z);
  if (g.type === "near") return new GoalNear(g.x, g.y, g.z, g.range);
  return new GoalXZ(g.x, g.z);
}

/** Pack x,y,z into a number — Y limited to 9 bits (-64..319), X/Z 11 bits relative */
function packKey(x: number, y: number, z: number): number {
  // Use string only as fallback when coords are huge; for normal play numeric is fine
  // 12 bits x, 9 bits y, 12 bits z relative to origin bias
  return ((x & 0xfff) << 20) | ((y & 0x1ff) << 11) | (z & 0x7ff);
}

export class Pathfinder {
  private world: World;
  private maxNodes: number;
  private allowDiagonal: boolean;
  private jumpHeight: number;
  private fallHeight: number;
  private avoidLiquid: boolean;
  private enableCache: boolean;
  private cache = new Map<string, { path: Vec3[]; at: number }>();
  private pool: PathNode[] = [];
  private neighborsBuf: { x: number; y: number; z: number; cost: number }[] = [];

  constructor(world: World, opts: PathfinderOptions = {}) {
    this.world = world;
    this.maxNodes = opts.maxNodes ?? 16000;
    this.allowDiagonal = opts.allowDiagonal ?? true;
    this.jumpHeight = opts.jumpHeight ?? 1;
    this.fallHeight = opts.fallHeight ?? 4;
    this.avoidLiquid = opts.avoidLiquid ?? true;
    this.enableCache = opts.enableCache ?? true;
  }

  private alloc(x: number, y: number, z: number, g: number, h: number, parent: PathNode | null): PathNode {
    const n = this.pool.pop();
    if (n) {
      n.x = x;
      n.y = y;
      n.z = z;
      n.g = g;
      n.h = h;
      n.f = g + h;
      n.parent = parent;
      return n;
    }
    return { x, y, z, g, h, f: g + h, parent };
  }

  private releasePathNodes(end: PathNode | null) {
    // Don't pool nodes still linked in returned path parents — only release via clear between searches
    this.pool.length = 0;
  }

  findPath(start: Vec3, goalInput: GoalInput): Vec3[] {
    const done = globalPerf.markStart("pathfind");
    const goal = toGoal(goalInput);
    if (!goal.isValid()) {
      done();
      return [];
    }

    const sx = Math.floor(start.x);
    const sy = Math.floor(start.y);
    const sz = Math.floor(start.z);

    if (this.enableCache) {
      const ck = `${sx >> 2},${sy >> 2},${sz >> 2}:${goal.heuristic({ x: 0, y: 0, z: 0 })}:${(goal as any).x ?? 0},${(goal as any).y ?? 0},${(goal as any).z ?? 0}`;
      const hit = this.cache.get(ck);
      if (hit && Date.now() - hit.at < 3000 && hit.path.length) {
        globalPerf.incr("pathCacheHit");
        done();
        return hit.path.map((p) => ({ ...p }));
      }
    }

    const startNode = this.alloc(sx, sy, sz, 0, goal.heuristic({ x: sx, y: sy, z: sz }), null);

    const open = new MinHeap<PathNode>((n) => n.f);
    const openMap = new Map<number, PathNode>();
    const closed = new Set<number>();

    open.push(startNode);
    openMap.set(packKey(sx, sy, sz), startNode);

    let iterations = 0;
    let end: PathNode | null = null;

    while (open.size > 0 && iterations < this.maxNodes) {
      iterations++;
      const current = open.pop()!;
      const ck = packKey(current.x, current.y, current.z);
      openMap.delete(ck);
      if (closed.has(ck)) continue;
      closed.add(ck);

      if (goal.isEnd(current)) {
        end = current;
        break;
      }

      this.expandNeighbors(current);
      for (const nb of this.neighborsBuf) {
        const nk = packKey(nb.x, nb.y, nb.z);
        if (closed.has(nk)) continue;
        if (!this.isWalkable(nb.x, nb.y, nb.z)) continue;

        const g = current.g + nb.cost;
        const existing = openMap.get(nk);
        if (existing && g >= existing.g) continue;

        const h = goal.heuristic({ x: nb.x, y: nb.y, z: nb.z });
        if (existing) {
          existing.g = g;
          existing.h = h;
          existing.f = g + h;
          existing.parent = current;
          open.update(existing);
        } else {
          const node = this.alloc(nb.x, nb.y, nb.z, g, h, current);
          open.push(node);
          openMap.set(nk, node);
        }
      }
    }

    const path = this.reconstruct(end);
    globalPerf.incr("pathIterations", iterations);
    if (this.enableCache && path.length) {
      const ck = `${sx >> 2},${sy >> 2},${sz >> 2}:p${path.length}`;
      this.cache.set(ck, { path: path.map((p) => ({ ...p })), at: Date.now() });
      if (this.cache.size > 32) {
        const first = this.cache.keys().next().value;
        if (first) this.cache.delete(first);
      }
    }
    this.releasePathNodes(end);
    done();
    return path;
  }

  private reconstruct(end: PathNode | null): Vec3[] {
    if (!end) return [];
    const path: Vec3[] = [];
    let n: PathNode | null = end;
    while (n) {
      path.push({ x: n.x + 0.5, y: n.y, z: n.z + 0.5 });
      n = n.parent;
    }
    path.reverse();
    return path;
  }

  private expandNeighbors(c: PathNode) {
    const buf = this.neighborsBuf;
    buf.length = 0;
    const dirs = this.allowDiagonal
      ? [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1],
        ]
      : [
          [1, 0], [-1, 0], [0, 1], [0, -1],
        ];

    for (const [dx, dz] of dirs) {
      const nx = c.x + dx;
      const nz = c.z + dz;
      const diag = dx !== 0 && dz !== 0;
      const baseCost = diag ? 1.414 : 1;

      // same level
      if (this.canStand(nx, c.y, nz)) {
        buf.push({ x: nx, y: c.y, z: nz, cost: baseCost });
      }
      // jump up
      for (let j = 1; j <= this.jumpHeight; j++) {
        if (this.canStand(nx, c.y + j, nz) && this.isClear(c.x, c.y + j, c.z)) {
          buf.push({ x: nx, y: c.y + j, z: nz, cost: baseCost + 0.5 * j });
          break;
        }
      }
      // fall down
      for (let f = 1; f <= this.fallHeight; f++) {
        if (this.canStand(nx, c.y - f, nz)) {
          buf.push({ x: nx, y: c.y - f, z: nz, cost: baseCost + 0.3 * f });
          break;
        }
      }
    }
  }

  private isClear(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(x, y, z);
    const def = BlockRegistry.get(id);
    return !def.solid;
  }

  private canStand(x: number, y: number, z: number): boolean {
    const feet = BlockRegistry.get(this.world.getBlock(x, y, z));
    const head = BlockRegistry.get(this.world.getBlock(x, y + 1, z));
    const ground = BlockRegistry.get(this.world.getBlock(x, y - 1, z));
    if (feet.solid || head.solid) return false;
    if (!ground.solid) return false;
    if (this.avoidLiquid && (feet.liquid || ground.liquid)) return false;
    return true;
  }

  private isWalkable(x: number, y: number, z: number): boolean {
    return this.canStand(x, y, z);
  }
}
