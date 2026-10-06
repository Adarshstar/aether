/**
 * Crafting recipes – modern prismarine-recipe inspired
 */

export interface RecipeIngredient {
  networkId: number;
  count: number;
}

export interface Recipe {
  id: string;
  type: "shaped" | "shapeless" | "furnace" | "smithing";
  result: RecipeIngredient;
  ingredients: RecipeIngredient[];
  /** shaped only: width */
  width?: number;
  height?: number;
}

const recipes: Recipe[] = [
  {
    id: "crafting_table",
    type: "shaped",
    width: 2, height: 2,
    ingredients: [
      { networkId: 5, count: 1 }, { networkId: 5, count: 1 },
      { networkId: 5, count: 1 }, { networkId: 5, count: 1 },
    ],
    result: { networkId: 58, count: 1 }, // illustrative ids
  },
  {
    id: "stick",
    type: "shaped",
    width: 1, height: 2,
    ingredients: [{ networkId: 5, count: 1 }, { networkId: 5, count: 1 }],
    result: { networkId: 280, count: 4 },
  },
  {
    id: "furnace_iron",
    type: "furnace",
    ingredients: [{ networkId: 15, count: 1 }],
    result: { networkId: 265, count: 1 },
  },
];

export const RecipeRegistry = {
  list(): Recipe[] { return recipes; },
  get(id: string): Recipe | undefined { return recipes.find((r) => r.id === id); },
  findByResult(networkId: number): Recipe[] {
    return recipes.filter((r) => r.result.networkId === networkId);
  },
  register(r: Recipe) { recipes.push(r); },
};
