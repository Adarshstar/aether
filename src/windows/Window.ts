/**
 * Container / Window system – modern rewrite inspired by prismarine-windows
 * Adapted for Bedrock inventory model
 */

import { Item } from "../item/Item";

export type WindowType =
  | "inventory"
  | "chest"
  | "double_chest"
  | "furnace"
  | "hopper"
  | "crafting"
  | "anvil"
  | "enchant"
  | "generic";

export class Window {
  readonly id: number;
  readonly type: WindowType;
  readonly title: string;
  readonly slots: (Item | null)[];
  private inventoryStart: number;
  private inventoryEnd: number;

  constructor(id: number, type: WindowType, title: string, slotCount: number, inventoryStart?: number) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.slots = new Array(slotCount).fill(null);
    // Player inventory usually occupies the last 36 slots
    this.inventoryStart = inventoryStart ?? Math.max(0, slotCount - 36);
    this.inventoryEnd = slotCount - 1;
  }

  get size() { return this.slots.length; }

  setSlot(slot: number, item: Item | null) {
    if (slot < 0 || slot >= this.slots.length) return;
    this.slots[slot] = item;
  }

  getSlot(slot: number): Item | null {
    return this.slots[slot] ?? null;
  }

  /** Find first empty slot in container region (not player inv) */
  firstEmptyContainerSlot(): number {
    for (let i = 0; i < this.inventoryStart; i++) {
      if (!this.slots[i]) return i;
    }
    return -1;
  }

  firstEmptyInventorySlot(): number {
    for (let i = this.inventoryStart; i <= this.inventoryEnd; i++) {
      if (!this.slots[i]) return i;
    }
    return -1;
  }

  count(networkId: number): number {
    let n = 0;
    for (const it of this.slots) if (it && it.networkId === networkId) n += it.count;
    return n;
  }

  findItems(pred: (item: Item, slot: number) => boolean): { slot: number; item: Item }[] {
    const out: { slot: number; item: Item }[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      const it = this.slots[i];
      if (it && pred(it, i)) out.push({ slot: i, item: it });
    }
    return out;
  }

  clear() {
    this.slots.fill(null);
  }
}

export class WindowManager {
  private windows = new Map<number, Window>();
  private nextId = 1;

  open(type: WindowType, title: string, slots: number): Window {
    const id = this.nextId++;
    const w = new Window(id, type, title, slots);
    this.windows.set(id, w);
    return w;
  }

  get(id: number): Window | undefined {
    return this.windows.get(id);
  }

  close(id: number) {
    this.windows.delete(id);
  }

  get active(): Window | undefined {
    // last opened
    let last: Window | undefined;
    for (const w of this.windows.values()) last = w;
    return last;
  }
}
