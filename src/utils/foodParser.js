import { expandRecipe } from "./recipes.js";
import { getFoodPortionOption } from "./foodPortions.js";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toId(value) {
  return normalizeText(value).replace(/\s+/g, "_");
}

function singularize(value) {
  const text = normalizeText(value);
  if (text.endsWith("es")) return text.slice(0, -2);
  if (text.endsWith("s")) return text.slice(0, -1);
  return text;
}

const QUANTITY_WORDS = Object.freeze({
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  medio: 0.5,
  media: 0.5,
});

const PORTION_PREFIX_PATTERN =
  /^(rebanadas?|laminas?|lonjas?|tajadas?|unidades?|envases?|tazas?|porciones?|bowls?)\s+(de\s+)?/;
const COMPOUND_CONNECTOR_PATTERN = /\s+(?:con|y|\+)\s+/;

function parseFractionToken(token) {
  const match = String(token || "").match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return 0;

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function resolveQuantityToken(token) {
  const normalized = normalizeText(token);
  if (!normalized) return 0;

  const fromWord = Number(QUANTITY_WORDS[normalized] || 0);
  if (fromWord > 0) return fromWord;

  const fromFraction = parseFractionToken(normalized);
  if (fromFraction > 0) return fromFraction;

  const numeric = Number(String(normalized).replace(",", "."));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function stripPortionPrefix(text) {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  const withoutPrefix = normalized.replace(PORTION_PREFIX_PATTERN, "").replace(/^de\s+/, "").trim();
  return withoutPrefix || normalized;
}

function parseQuantityPrefix(inputText) {
  const raw = normalizeText(inputText);
  const match = raw.match(/^([^\s]+)\s+(.+)$/);
  if (!match) return { factor: 1, text: stripPortionPrefix(raw) };

  const factor = resolveQuantityToken(match[1]);
  if (factor <= 0) {
    return { factor: 1, text: stripPortionPrefix(raw) };
  }

  return {
    factor,
    text: stripPortionPrefix(match[2]),
  };
}

function scaleItems(items, factor) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    grams: Number((Number(item?.grams || 0) * factor).toFixed(2)),
    quantity: Number(item?.quantity || 0) > 0 ? Number((Number(item.quantity) * factor).toFixed(2)) : item?.quantity,
  }));
}

function splitCompoundSegments(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return normalized
    .split(COMPOUND_CONNECTOR_PATTERN)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function parseFoodText(inputText, recipes, foodCatalog) {
  const parsed = parseQuantityPrefix(inputText);
  const needle = parsed.text;
  const quantityFactor = parsed.factor;
  if (!needle) return null;

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeCatalog = Array.isArray(foodCatalog) ? foodCatalog : [];

  const aliases = {
    pan: "pan_blanco",
    marraqueta: "pan_marraqueta",
    hallulla: "pan_hallulla",
    pita: "pan_pita",
    huevos: "huevo",
    jamon: "jamon_cocido",
    yogur: "yogurt",
    "yogur natural": "yogurt natural",
    "yogur griego": "yogurt griego",
    "smash burger": "smash_burger_queso",
    "smash burger con queso": "smash_burger_queso",
    "smashburger con queso": "smash_burger_queso",
    "hamburger con queso": "smash_burger_queso",
    "hamburguesa con queso": "smash_burger_queso",
    cheeseburger: "smash_burger_queso",
    "smachet haburger con queso": "smash_burger_queso",
  };
  const withAlias = aliases[needle] || needle;
  const needleVariants = new Set([needle, withAlias, singularize(needle), singularize(withAlias)]);

  const matchedRecipe = safeRecipes.find((recipe) => {
    const recipeId = toId(recipe?.id);
    const recipeName = normalizeText(recipe?.name);
    return needleVariants.has(recipeId) || needleVariants.has(recipeName);
  });

  if (matchedRecipe) {
    return scaleItems(expandRecipe(matchedRecipe), quantityFactor);
  }

  const matchedFood = safeCatalog.find((food) => {
    const foodId = toId(food?.id);
    const foodName = normalizeText(food?.name);
    const foodIdSingular = singularize(foodId);
    const foodNameSingular = singularize(foodName);
    return (
      needleVariants.has(foodId) ||
      needleVariants.has(foodName) ||
      needleVariants.has(foodIdSingular) ||
      needleVariants.has(foodNameSingular)
    );
  });

  if (matchedFood) {
    const portion = getFoodPortionOption(matchedFood, "snack");
    if (portion) {
      return [
        {
          foodId: matchedFood.id || toId(matchedFood.name),
          grams: portion.grams > 0 ? Number((portion.grams * quantityFactor).toFixed(2)) : 0,
          quantity: Number(quantityFactor.toFixed(2)),
          quantityMode: "portion",
          unit: portion.label,
          portionDescription: portion.description,
        },
      ];
    }

    return [
      {
        foodId: matchedFood.id || toId(matchedFood.name),
        grams: Number((100 * quantityFactor).toFixed(2)),
      },
    ];
  }

  const rawCompoundSegments = splitCompoundSegments(inputText);
  if (rawCompoundSegments.length > 1) {
    const mergedItems = rawCompoundSegments.flatMap((segment) => {
      const parsedSegment = parseFoodText(segment, safeRecipes, safeCatalog);
      return Array.isArray(parsedSegment) ? parsedSegment : [];
    });

    if (mergedItems.length > 0) {
      return mergedItems;
    }
  }

  return null;
}
