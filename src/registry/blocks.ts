/**
 * @aether/registry — Block definitions (Bedrock-oriented)
 */

export interface BlockDef {
  id: number;
  name: string;
  displayName?: string;
  solid: boolean;
  passable: boolean;
  liquid?: boolean;
  hardness: number;
  resistance?: number;
  tool?: "none" | "pickaxe" | "shovel" | "axe" | "hoe" | "shears" | "sword";
  light?: number;
  transparent?: boolean;
  replaceable?: boolean;
  harvestable?: boolean;
}

const byId = new Map<number, BlockDef>();
const byName = new Map<string, BlockDef>();

function add(def: BlockDef) {
  byId.set(def.id, def);
  byName.set(def.name, def);
}

function S(
  id: number, name: string, solid: boolean, hardness: number,
  extra: Partial<BlockDef> = {}
) {
  add({
    id, name, solid, passable: !solid, hardness,
    displayName: name.replace(/_/g, " "),
    tool: "none", harvestable: solid && isFinite(hardness),
    ...extra,
  });
}

function seed() {
  S(0, "air", false, 0, { passable: true, transparent: true, replaceable: true, harvestable: false });
  S(1, "stone", true, 1.5, { tool: "pickaxe", resistance: 6 });
  S(2, "grass_block", true, 0.6, { tool: "shovel" });
  S(3, "dirt", true, 0.5, { tool: "shovel" });
  S(4, "cobblestone", true, 2, { tool: "pickaxe", resistance: 6 });
  S(5, "planks", true, 2, { tool: "axe" });
  S(6, "sapling", false, 0, { passable: true, replaceable: true, transparent: true });
  S(7, "bedrock", true, Infinity, { resistance: 3600000, harvestable: false });
  S(8, "flowing_water", false, 100, { passable: true, liquid: true, transparent: true });
  S(9, "water", false, 100, { passable: true, liquid: true, transparent: true });
  S(10, "flowing_lava", false, 100, { passable: false, liquid: true });
  S(11, "lava", false, 100, { passable: false, liquid: true });
  S(12, "sand", true, 0.5, { tool: "shovel" });
  S(13, "gravel", true, 0.6, { tool: "shovel" });
  S(14, "gold_ore", true, 3, { tool: "pickaxe" });
  S(15, "iron_ore", true, 3, { tool: "pickaxe" });
  S(16, "coal_ore", true, 3, { tool: "pickaxe" });
  S(17, "log", true, 2, { tool: "axe" });
  S(18, "leaves", true, 0.2, { tool: "shears", transparent: true });
  S(19, "sponge", true, 0.6, { tool: "hoe" });
  S(20, "glass", true, 0.3, { transparent: true });
  S(21, "lapis_ore", true, 3, { tool: "pickaxe" });
  S(22, "lapis_block", true, 3, { tool: "pickaxe" });
  S(24, "sandstone", true, 0.8, { tool: "pickaxe" });
  S(35, "wool", true, 0.8, { tool: "shears" });
  S(41, "gold_block", true, 3, { tool: "pickaxe" });
  S(42, "iron_block", true, 5, { tool: "pickaxe" });
  S(45, "bricks", true, 2, { tool: "pickaxe" });
  S(47, "bookshelf", true, 1.5, { tool: "axe" });
  S(49, "obsidian", true, 50, { tool: "pickaxe", resistance: 1200 });
  S(50, "torch", false, 0, { passable: true, transparent: true, light: 14, replaceable: true });
  S(53, "oak_stairs", true, 2, { tool: "axe" });
  S(54, "chest", true, 2.5, { tool: "axe" });
  S(56, "diamond_ore", true, 3, { tool: "pickaxe" });
  S(57, "diamond_block", true, 5, { tool: "pickaxe" });
  S(58, "crafting_table", true, 2.5, { tool: "axe" });
  S(61, "furnace", true, 3.5, { tool: "pickaxe" });
  S(64, "oak_door", true, 3, { tool: "axe" });
  S(65, "ladder", false, 0.4, { passable: true, transparent: true });
  S(85, "oak_fence", true, 2, { tool: "axe" });
  S(87, "netherrack", true, 0.4, { tool: "pickaxe" });
  S(88, "soul_sand", true, 0.5, { tool: "shovel" });
  S(89, "glowstone", true, 0.3, { light: 15 });
  S(98, "stone_bricks", true, 1.5, { tool: "pickaxe" });
  S(173, "coal_block", true, 5, { tool: "pickaxe" });
  S(174, "packed_ice", true, 0.5, { tool: "pickaxe" });
  S(1000, "deepslate", true, 3, { tool: "pickaxe" });
  S(1001, "deepslate_iron_ore", true, 4.5, { tool: "pickaxe" });
  S(1002, "amethyst_block", true, 1.5, { tool: "pickaxe" });
  S(1003, "copper_ore", true, 3, { tool: "pickaxe" });
  S(1004, "moss_block", true, 0.1, { tool: "hoe" });
  S(1005, "calcite", true, 0.75, { tool: "pickaxe" });
  S(1006, "tuff", true, 1.5, { tool: "pickaxe" });
  S(1007, "sculk", true, 0.2, { tool: "hoe" });
  S(1008, "cherry_log", true, 2, { tool: "axe" });
  S(1009, "cherry_planks", true, 2, { tool: "axe" });
  S(1010, "bamboo_block", true, 2, { tool: "axe" });
  S(1011, "copper_block", true, 3, { tool: "pickaxe" });
  S(1012, "raw_iron_block", true, 5, { tool: "pickaxe" });
  S(1013, "deepslate_diamond_ore", true, 4.5, { tool: "pickaxe" });
  S(1014, "ancient_debris", true, 30, { tool: "pickaxe", resistance: 1200 });
  S(1015, "netherite_block", true, 50, { tool: "pickaxe", resistance: 1200 });
  S(1016, "basalt", true, 1.25, { tool: "pickaxe" });
  S(1017, "blackstone", true, 1.5, { tool: "pickaxe" });
  S(1018, "crying_obsidian", true, 50, { tool: "pickaxe", resistance: 1200 });
  S(1019, "amethyst_cluster", true, 1.5, { tool: "pickaxe", transparent: true });
  S(1020, "mossy_cobblestone", true, 2, { tool: "pickaxe" });
  S(1021, "mud", true, 0.5, { tool: "shovel" });
  S(1022, "mangrove_log", true, 2, { tool: "axe" });
  S(1023, "pale_oak_log", true, 2, { tool: "axe" });
  S(1024, "resin_block", true, 1.5, { tool: "pickaxe" });
  S(1025, "trial_spawner", true, 50, { tool: "pickaxe" });
  S(1026, "vault", true, 50, { tool: "pickaxe" });
  S(1027, "copper_grate", true, 3, { tool: "pickaxe", transparent: true });
  S(1028, "chiseled_copper", true, 3, { tool: "pickaxe" });
  S(1029, "tuff_bricks", true, 1.5, { tool: "pickaxe" });
  S(1030, "crafter", true, 1.5, { tool: "pickaxe" });
  S(1031, "heavy_core", true, 10, { tool: "pickaxe" });
  S(1032, "pale_moss_block", true, 0.1, { tool: "hoe" });
  S(1033, "creaking_heart", true, 10, { tool: "axe" });
  S(1034, "open_eyeblossom", false, 0, { passable: true, transparent: true });
}

seed();

export const BlockRegistry = {
  get(id: number): BlockDef {
    return byId.get(id) ?? {
      id, name: `unknown_${id}`, solid: id !== 0, passable: id === 0,
      hardness: 1, tool: "none" as const, harvestable: id !== 0,
    };
  },
  getByName(name: string): BlockDef | undefined {
    return byName.get(name) ?? byName.get(name.replace(/\s+/g, "_").toLowerCase());
  },
  register(def: BlockDef) { add(def); },
  loadJSON(defs: BlockDef[]) { for (const d of defs) add(d); },
  isSolid(id: number) { return this.get(id).solid; },
  isPassable(id: number) { return this.get(id).passable; },
  isLiquid(id: number) { return !!this.get(id).liquid; },
  digTimeMs(id: number, toolMultiplier = 1): number {
    const h = this.get(id).hardness;
    if (!isFinite(h)) return Infinity;
    if (h <= 0) return 50;
    return Math.max(50, (h * 1500) / Math.max(0.1, toolMultiplier));
  },
  list(): BlockDef[] { return [...byId.values()]; },
  get size() { return byId.size; },
};
