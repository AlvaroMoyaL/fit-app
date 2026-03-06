import { recipes } from "../data/recipes";
import { interpretFoodText } from "./foodInterpreter";

const FOOD_EQUIVALENCE = {
  egg: ["egg", "huevo", "huevos"],
  bread: ["bread", "pan", "pan_blanco", "pan_integral", "pan_marraqueta", "pan_hallulla", "pan_pita"],
  avocado: ["avocado", "palta"],
  chicken: ["chicken", "pollo", "pechuga_de_pollo", "pollo_a_la_plancha"],
  rice: ["rice", "arroz", "arroz_integral", "arroz_jazmin", "arroz_basmati"],
  salad: ["salad", "ensalada", "ensalada_chilena"],
  tomato: ["tomato", "tomate"],
  lettuce: ["lettuce", "lechuga"],
  tuna: ["tuna", "atun", "atun_en_lata"],
  milk: ["milk", "leche", "leche_descremada", "leche_entera"],
  yogurt: ["yogurt", "yogur", "yogurt_natural", "yogurt_griego"],
  banana: ["banana", "platano"],
  beef: ["beef", "carne", "carne_vacuno", "carne_molida"],
  potato: ["potato", "papa", "papas", "pure_de_papa", "papas_fritas"],
  pasta: ["pasta", "fideos", "pasta_integral"],
  coffee: ["coffee", "cafe"],
};

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function buildAliasMap() {
  const aliasMap = new Map();

  Object.entries(FOOD_EQUIVALENCE).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => {
      aliasMap.set(normalizeId(alias), canonical);
    });
  });

  return aliasMap;
}

const ALIAS_MAP = buildAliasMap();

function canonicalFoodId(foodId) {
  const normalized = normalizeId(foodId);
  return ALIAS_MAP.get(normalized) || normalized;
}

export function parseAvailableIngredients(text) {
  const interpreted = interpretFoodText(text);
  if (!Array.isArray(interpreted)) return [];

  const unique = new Set(interpreted.map((foodId) => canonicalFoodId(foodId)));
  return Array.from(unique);
}

export function analyzeRecipeAvailability(recipe, availableFoods) {
  const availableSet = new Set((Array.isArray(availableFoods) ? availableFoods : []).map(canonicalFoodId));
  const recipeIngredientIds = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients.map((ingredient) => canonicalFoodId(ingredient?.foodId))
    : [];

  const uniqueRecipeIngredients = Array.from(new Set(recipeIngredientIds));
  const availableIngredients = uniqueRecipeIngredients.filter((foodId) => availableSet.has(foodId));
  const missingIngredients = uniqueRecipeIngredients.filter((foodId) => !availableSet.has(foodId));

  const total = uniqueRecipeIngredients.length;
  const matchScore = total > 0 ? Number((availableIngredients.length / total).toFixed(2)) : 0;

  return {
    recipeId: recipe?.id || "",
    name: recipe?.name || "",
    availableIngredients,
    missingIngredients,
    missingCount: missingIngredients.length,
    matchScore,
  };
}

export function findPossibleRecipes(availableFoods) {
  const safeRecipes = Array.isArray(recipes) ? recipes : [];

  const ranked = safeRecipes
    .map((recipe) => analyzeRecipeAvailability(recipe, availableFoods))
    .filter((item) => item.availableIngredients.length > 0)
    .sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return a.missingCount - b.missingCount;
    });

  return ranked;
}

export function generateMealsFromIngredients(text) {
  const availableFoods = parseAvailableIngredients(text);
  const analyzedRecipes = findPossibleRecipes(availableFoods);

  const cookNow = analyzedRecipes.filter((item) => item.missingCount === 0);
  const cookAlmost = analyzedRecipes.filter((item) => item.missingCount <= 2);

  return {
    cookNow,
    cookAlmost,
  };
}
