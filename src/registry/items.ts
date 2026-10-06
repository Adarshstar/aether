/**
 * Item registry — vanilla-oriented palette (seed + extensible)
 */

export interface ItemDef {
  networkId: number;
  name: string;
  displayName?: string;
  stackSize: number;
  maxDurability?: number;
  category?: "building" | "nature" | "equipment" | "items" | "none";
}

const byId = new Map<number, ItemDef>();
const byName = new Map<string, ItemDef>();

function add(d: ItemDef) {
  byId.set(d.networkId, d);
  byName.set(d.name, d);
}

function I(id: number, name: string, stack = 64, extra: Partial<ItemDef> = {}) {
  add({
    networkId: id, name, stackSize: stack,
    displayName: name.replace(/_/g, " "),
    category: "items",
    ...extra,
  });
}

function seed() {
  I(0, "air", 0, { category: "none" });
  I(1, "stone", 64, { category: "building" });
  I(2, "grass_block", 64, { category: "nature" });
  I(3, "dirt", 64, { category: "nature" });
  I(4, "cobblestone", 64, { category: "building" });
  I(5, "oak_planks", 64, { category: "building" });
  I(17, "oak_log", 64, { category: "nature" });
  I(263, "coal", 64);
  I(264, "diamond", 64);
  I(265, "iron_ingot", 64);
  I(266, "gold_ingot", 64);
  I(267, "iron_sword", 1, { maxDurability: 250, category: "equipment" });
  I(268, "wooden_sword", 1, { maxDurability: 59, category: "equipment" });
  I(269, "wooden_shovel", 1, { maxDurability: 59, category: "equipment" });
  I(270, "wooden_pickaxe", 1, { maxDurability: 59, category: "equipment" });
  I(271, "wooden_axe", 1, { maxDurability: 59, category: "equipment" });
  I(272, "stone_sword", 1, { maxDurability: 131, category: "equipment" });
  I(273, "stone_shovel", 1, { maxDurability: 131, category: "equipment" });
  I(274, "stone_pickaxe", 1, { maxDurability: 131, category: "equipment" });
  I(275, "stone_axe", 1, { maxDurability: 131, category: "equipment" });
  I(276, "diamond_sword", 1, { maxDurability: 1561, category: "equipment" });
  I(277, "diamond_shovel", 1, { maxDurability: 1561, category: "equipment" });
  I(278, "diamond_pickaxe", 1, { maxDurability: 1561, category: "equipment" });
  I(279, "diamond_axe", 1, { maxDurability: 1561, category: "equipment" });
  I(280, "stick", 64);
  I(297, "bread", 64);
  I(319, "raw_porkchop", 64);
  I(320, "cooked_porkchop", 64);
  I(357, "cookie", 64);
  I(364, "cooked_beef", 64);
  I(366, "cooked_chicken", 64);
  I(391, "carrot", 64);
  I(392, "potato", 64);
  I(393, "baked_potato", 64);
  I(400, "pumpkin_pie", 64);
  I(359, "shears", 1, { maxDurability: 238, category: "equipment" });
  I(345, "compass", 64);
  I(347, "clock", 64);
  I(54, "chest", 64, { category: "building" });
  I(58, "crafting_table", 64, { category: "building" });
  I(61, "furnace", 64, { category: "building" });
  I(49, "obsidian", 64, { category: "building" });
  I(46, "tnt", 64, { category: "building" });
  I(50, "torch", 64);
  I(332, "snowball", 16);
  I(344, "egg", 16);
  I(368, "ender_pearl", 16);
  I(262, "arrow", 64);
  I(261, "bow", 1, { maxDurability: 384, category: "equipment" });
  I(471, "netherite_sword", 1, { maxDurability: 2031, category: "equipment" });
  I(472, "netherite_shovel", 1, { maxDurability: 2031, category: "equipment" });
  I(473, "netherite_pickaxe", 1, { maxDurability: 2031, category: "equipment" });
  I(474, "netherite_axe", 1, { maxDurability: 2031, category: "equipment" });
  I(475, "netherite_hoe", 1, { maxDurability: 2031, category: "equipment" });
  I(476, "netherite_ingot", 64);
  I(477, "copper_ingot", 64);
  I(478, "amethyst_shard", 64);
  I(479, "echo_shard", 64);
  I(480, "trial_key", 64);
  I(481, "ominous_trial_key", 64);
  I(482, "wind_charge", 64);
  I(483, "breeze_rod", 64);
  I(484, "resin_brick", 64);
  I(485, "pale_oak_planks", 64, { category: "building" });
  // bulk generate block-as-item for common ids 1-200 missing
  for (let id = 1; id <= 200; id++) {
    if (!byId.has(id)) I(id, `item_${id}`, 64, { category: "building" });
  }
}

seed();

export const ItemRegistry = {
  get(id: number): ItemDef {
    return byId.get(id) ?? { networkId: id, name: `item_${id}`, stackSize: 64 };
  },
  getByName(name: string) { return byName.get(name); },
  register(d: ItemDef) { add(d); },
  loadJSON(defs: ItemDef[]) { for (const d of defs) add(d); },
  list() { return [...byId.values()]; },
  get size() { return byId.size; },
};
