export const proteinRecoveryFoods = [
  {
    id: "eggs",
    name: "Huevos",
    category: "whole-food",
    protein: 12,
    calories: 140,
    serving: "2 unidades",
    quick: true,
    portable: false,
    vegetarian: true,
    mealType: ["breakfast", "snack", "dinner"],
    tags: ["high-protein", "simple", "real-food"],
    lowCarb: true,
  },
  {
    id: "egg-whites",
    name: "Claras de huevo",
    category: "whole-food",
    protein: 20,
    calories: 100,
    serving: "200 g",
    quick: true,
    portable: false,
    vegetarian: true,
    mealType: ["breakfast", "dinner"],
    tags: ["high-protein", "lean", "simple"],
    lowFat: true,
    lowCarb: true,
  },
  {
    id: "chicken-breast",
    name: "Pechuga de pollo",
    category: "whole-food",
    protein: 31,
    calories: 165,
    serving: "120 g cocida",
    quick: false,
    portable: false,
    vegetarian: false,
    mealType: ["lunch", "dinner"],
    tags: ["high-protein", "lean", "real-food"],
    lowFat: true,
    lowCarb: true,
  },
  {
    id: "tuna-can",
    name: "Atún en lata",
    category: "canned",
    protein: 26,
    calories: 140,
    serving: "1 lata al agua",
    quick: true,
    portable: true,
    vegetarian: false,
    mealType: ["lunch", "snack", "dinner"],
    tags: ["high-protein", "portable", "simple"],
    lowFat: true,
    lowCarb: true,
  },
  {
    id: "sardines",
    name: "Sardinas",
    category: "canned",
    protein: 23,
    calories: 180,
    serving: "1 lata",
    quick: true,
    portable: true,
    vegetarian: false,
    mealType: ["lunch", "snack", "dinner"],
    tags: ["high-protein", "portable", "omega-3"],
    lowCarb: true,
  },
  {
    id: "greek-yogurt",
    name: "Yogur griego natural",
    category: "dairy",
    protein: 18,
    calories: 130,
    serving: "170 g",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["breakfast", "snack"],
    tags: ["high-protein", "simple", "creamy"],
    lowFat: true,
  },
  {
    id: "cottage-cheese",
    name: "Queso cottage",
    category: "dairy",
    protein: 20,
    calories: 160,
    serving: "200 g",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["breakfast", "snack", "dinner"],
    tags: ["high-protein", "simple", "real-food"],
    lowFat: true,
    lowCarb: true,
  },
  {
    id: "high-protein-milk",
    name: "Leche alta en proteína",
    category: "dairy",
    protein: 20,
    calories: 160,
    serving: "500 ml",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["breakfast", "snack"],
    tags: ["high-protein", "quick", "drink"],
  },
  {
    id: "tofu",
    name: "Tofu firme",
    category: "whole-food",
    protein: 18,
    calories: 160,
    serving: "180 g",
    quick: false,
    portable: false,
    vegetarian: true,
    mealType: ["lunch", "dinner"],
    tags: ["vegetarian", "high-protein", "real-food"],
    lowCarb: true,
  },
  {
    id: "lentils",
    name: "Lentejas cocidas",
    category: "whole-food",
    protein: 18,
    calories: 230,
    serving: "1.5 tazas",
    quick: false,
    portable: false,
    vegetarian: true,
    mealType: ["lunch", "dinner"],
    tags: ["vegetarian", "fiber", "real-food"],
    recommendedFor: ["satiety", "plant-protein"],
  },
  {
    id: "protein-yogurt",
    name: "Yogur proteico",
    category: "snack",
    protein: 20,
    calories: 150,
    serving: "1 envase",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["snack", "breakfast"],
    tags: ["quick", "portable", "high-protein"],
    lowFat: true,
  },
  {
    id: "protein-bar",
    name: "Barra proteica",
    category: "portable",
    protein: 20,
    calories: 210,
    serving: "1 barra",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["snack"],
    tags: ["portable", "quick", "convenient"],
    notes: "Util cuando no hay tiempo para una comida completa.",
  },
  {
    id: "protein-shake",
    name: "Batido de proteína",
    category: "supplement",
    protein: 25,
    calories: 140,
    serving: "1 scoop con agua",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["snack", "post-workout", "breakfast"],
    tags: ["high-protein", "quick", "supplement"],
    lowFat: true,
    lowCarb: true,
  },
  {
    id: "turkey-rollups",
    name: "Rollitos de pavo",
    category: "portable",
    protein: 18,
    calories: 120,
    serving: "100 g",
    quick: true,
    portable: true,
    vegetarian: false,
    mealType: ["snack", "lunch"],
    tags: ["portable", "lean", "quick"],
    lowFat: true,
    lowCarb: true,
  },
  {
    id: "fresh-high-protein-cheese",
    name: "Queso fresco alto en proteína",
    category: "dairy",
    protein: 17,
    calories: 150,
    serving: "120 g",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["snack", "breakfast", "dinner"],
    tags: ["high-protein", "simple", "portable"],
    lowCarb: true,
  },
  {
    id: "ham-cheese-snack-box",
    name: "Snack box de jamón y queso",
    category: "snack",
    protein: 22,
    calories: 220,
    serving: "1 porción",
    quick: true,
    portable: true,
    vegetarian: false,
    mealType: ["snack"],
    tags: ["portable", "quick", "savory"],
    lowCarb: true,
  },
  {
    id: "vegan-protein-shake",
    name: "Batido vegetal de proteína",
    category: "supplement",
    protein: 24,
    calories: 160,
    serving: "1 scoop",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["snack", "post-workout"],
    tags: ["vegetarian", "portable", "quick"],
    lowFat: true,
  },
  {
    id: "omelette-veggies",
    name: "Omelette con verduras",
    category: "meal",
    protein: 24,
    calories: 260,
    serving: "1 omelette grande",
    quick: true,
    portable: false,
    vegetarian: true,
    mealType: ["breakfast", "dinner"],
    tags: ["high-protein", "vegetables", "meal"],
    recommendedFor: ["protein-low", "vegetable-low"],
  },
  {
    id: "tuna-salad",
    name: "Ensalada con atún",
    category: "meal",
    protein: 28,
    calories: 280,
    serving: "1 bowl",
    quick: true,
    portable: true,
    vegetarian: false,
    mealType: ["lunch", "dinner"],
    tags: ["high-protein", "vegetables", "meal"],
    recommendedFor: ["protein-low", "vegetable-low"],
    lowCarb: true,
  },
  {
    id: "chicken-bowl",
    name: "Bowl de pollo",
    category: "meal",
    protein: 35,
    calories: 390,
    serving: "1 bowl",
    quick: false,
    portable: true,
    vegetarian: false,
    mealType: ["lunch", "dinner"],
    tags: ["high-protein", "meal", "balanced"],
    recommendedFor: ["protein-low"],
  },
  {
    id: "protein-wrap",
    name: "Wrap proteico",
    category: "meal",
    protein: 27,
    calories: 340,
    serving: "1 wrap",
    quick: true,
    portable: true,
    vegetarian: false,
    mealType: ["lunch", "dinner"],
    tags: ["portable", "high-protein", "meal"],
    recommendedFor: ["protein-low"],
  },
  {
    id: "legume-dinner",
    name: "Cena con legumbres",
    category: "meal",
    protein: 22,
    calories: 360,
    serving: "1 plato",
    quick: false,
    portable: false,
    vegetarian: true,
    mealType: ["dinner"],
    tags: ["vegetarian", "fiber", "meal"],
    recommendedFor: ["satiety", "vegetable-low"],
  },
  {
    id: "egg-cheese-tortilla",
    name: "Tortilla con huevo y queso",
    category: "meal",
    protein: 24,
    calories: 320,
    serving: "1 tortilla",
    quick: true,
    portable: true,
    vegetarian: true,
    mealType: ["breakfast", "dinner"],
    tags: ["high-protein", "meal", "simple"],
    recommendedFor: ["protein-low"],
  },
  {
    id: "greek-yogurt-bowl",
    name: "Bowl de yogur griego, fruta y semillas",
    category: "meal",
    protein: 21,
    calories: 290,
    serving: "1 bowl",
    quick: true,
    portable: false,
    vegetarian: true,
    mealType: ["breakfast", "snack"],
    tags: ["high-protein", "fresh", "meal"],
    recommendedFor: ["protein-low", "breakfast"],
  },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMealType(value) {
  return String(value || "").trim().toLowerCase();
}

function passesFilters(item, options) {
  if (options?.portableOnly && !item.portable) return false;
  if (options?.vegetarianOnly && !item.vegetarian) return false;
  if (options?.quickOnly && !item.quick) return false;

  const maxCalories = toNumber(options?.maxCalories);
  if (maxCalories > 0 && item.calories > maxCalories) return false;

  const wantedMealType = normalizeMealType(options?.mealType);
  if (wantedMealType) {
    const allowedTypes = Array.isArray(item.mealType) ? item.mealType.map(normalizeMealType) : [];
    if (!allowedTypes.includes(wantedMealType)) return false;
  }

  return true;
}

function scoreSuggestion(item, proteinRemaining, options) {
  const remaining = Math.max(0, toNumber(proteinRemaining));
  const proteinGap = Math.abs(item.protein - remaining);
  const proteinDensity = item.calories > 0 ? item.protein / item.calories : 0;
  let score = 0;

  // Best score when the portion gets close to the missing protein without overshooting too much.
  score += Math.max(0, 40 - proteinGap);
  score += proteinDensity * 400;

  if (item.protein >= remaining * 0.7 && item.protein <= remaining * 1.35) {
    score += 8;
  }

  if (item.protein > remaining * 1.7) {
    score -= 6;
  }

  if (options?.quickOnly && item.quick) score += 4;
  if (options?.portableOnly && item.portable) score += 4;
  if (options?.vegetarianOnly && item.vegetarian) score += 3;

  if (item.lowFat) score += 1.5;
  if (item.lowCarb) score += 0.5;

  return Number(score.toFixed(2));
}

export function getProteinRecoverySuggestions(proteinRemaining, options = {}) {
  const remaining = toNumber(proteinRemaining);
  if (remaining <= 0) return [];

  return proteinRecoveryFoods
    .filter((item) => passesFilters(item, options))
    .map((item) => ({
      ...item,
      _score: scoreSuggestion(item, remaining, options),
    }))
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      if (b.protein !== a.protein) return b.protein - a.protein;
      return a.calories - b.calories;
    })
    .slice(0, 8)
    .map(({ _score, ...item }) => item);
}
