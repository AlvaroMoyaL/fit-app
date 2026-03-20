import defaultFoodCatalog from "../data/foodCatalog.js";
import { recipes as defaultRecipes } from "../data/recipes.js";
import { getMealSuggestions } from "./mealSuggestions.js";
import { portableMeals as defaultPortableMeals } from "./portableMeals.js";
import { proteinRecoveryFoods } from "./proteinRecoveryFoods.js";
import { calculateRecipeMacros } from "./recipes.js";
import { evaluateMealSatiety } from "./satietyFoods.js";
import { vegetableRecoveryFoods } from "./vegetableRecoveryFoods.js";

const SLOT_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const DEFAULT_MAX_RESULTS = 3;

const SLOT_LABELS = {
  breakfast: "desayuno",
  lunch: "almuerzo",
  dinner: "cena",
  snack: "snack",
};

const VEGETABLE_TOKENS = [
  "lechuga",
  "tomate",
  "espinaca",
  "brocoli",
  "zanahoria",
  "pepino",
  "repollo",
  "coliflor",
  "pimenton",
  "champinon",
  "zapallo",
  "berenjena",
  "cebolla",
  "ajo",
  "ensalada",
  "vegetable",
  "vegetales",
  "verduras",
];

const DEFAULT_PORTION_GRAMS_BY_FOOD = {
  almendra: 30,
  atun_en_lata: 120,
  avena: 50,
  barrita_de_cereal: 35,
  frutilla: 100,
  galleta_de_soda: 35,
  garbanzos_cocidos: 150,
  huevo: 100,
  jamon_de_pavo: 90,
  lechuga: 80,
  lentejas_cocidas: 160,
  leche: 220,
  mani: 30,
  manzana: 150,
  nuez: 30,
  palta: 60,
  pan_integral: 70,
  pan_pita_integral: 75,
  pepino: 100,
  platano: 120,
  pollo_a_la_plancha: 120,
  quesillo: 120,
  queso: 40,
  queso_cottage: 150,
  tomate: 100,
  tortilla_de_trigo: 80,
  yogurt: 170,
  yogurt_griego: 170,
};

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundNumber(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeId(value) {
  return normalizeText(value).replace(/\s+/g, "_");
}

function normalizeMealType(value) {
  const normalized = normalizeText(value);
  const aliases = {
    desayuno: "breakfast",
    breakfast: "breakfast",
    almuerzo: "lunch",
    lunch: "lunch",
    comida: "lunch",
    cena: "dinner",
    dinner: "dinner",
    supper: "dinner",
    once: "dinner",
    snack: "snack",
    colacion: "snack",
    merienda: "snack",
  };

  return aliases[normalized] || normalized || "snack";
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set(getSafeArray(values).map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function buildFoodLookup(foods = []) {
  const lookup = new Map();

  getSafeArray(foods).forEach((food) => {
    const idKey = normalizeId(food?.id);
    const nameKey = normalizeId(food?.name);
    if (idKey) lookup.set(idKey, food);
    if (nameKey) lookup.set(nameKey, food);
  });

  return lookup;
}

function getCombinedFoodCatalog(context = {}) {
  return [
    ...getSafeArray(defaultFoodCatalog),
    ...getSafeArray(context.foodCatalog),
    ...getSafeArray(context.customFoods),
  ];
}

function getFoodPortionGrams(foodId) {
  const normalizedId = normalizeId(foodId);
  return DEFAULT_PORTION_GRAMS_BY_FOOD[normalizedId] || 100;
}

function isVegetableReference(value) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return VEGETABLE_TOKENS.some((token) => normalized.includes(token));
}

function sumFoodSelectionMacros(foodIds = [], foodLookup = new Map()) {
  return getSafeArray(foodIds).reduce(
    (acc, foodId) => {
      const normalizedFoodId = normalizeId(foodId);
      const food =
        foodLookup.get(normalizedFoodId) ||
        foodLookup.get(normalizeId(String(foodId || "").replace(/_/g, " ")));

      if (!food) return acc;

      const grams = getFoodPortionGrams(normalizedFoodId);
      const ratio = grams / 100;

      acc.calories += safeNumber(food?.calories) * ratio;
      acc.protein += safeNumber(food?.protein) * ratio;
      acc.carbs += safeNumber(food?.carbs) * ratio;
      acc.fat += safeNumber(food?.fat) * ratio;

      if (isVegetableReference(food?.id || food?.name || normalizedFoodId)) {
        acc.vegetableGrams += grams;
      }

      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      vegetableGrams: 0,
    }
  );
}

function estimateRecipeVegetableServings(recipe) {
  const vegetableGrams = getSafeArray(recipe?.ingredients).reduce((sum, ingredient) => {
    if (!isVegetableReference(ingredient?.foodId || ingredient?.name)) return sum;
    return sum + safeNumber(ingredient?.grams);
  }, 0);

  return roundNumber(vegetableGrams / 80, 1);
}

function estimateCandidateSatiety(candidate) {
  const explicitScore = safeNumber(candidate?.satietyScore, -1);
  if (explicitScore >= 0) return explicitScore;

  const satietyLevel = normalizeText(candidate?.satietyLevel);
  if (satietyLevel === "high") return 8;
  if (satietyLevel === "medium") return 6;
  if (satietyLevel === "low") return 4;

  return safeNumber(
    evaluateMealSatiety(getSafeArray(candidate?.foods).map((food) => normalizeId(food))).score
  );
}

function matchesSlot(candidate, slotName) {
  const safeSlot = normalizeMealType(slotName);
  const mealTypes = uniqueStrings(
    getSafeArray(candidate?.mealTypes).length
      ? candidate.mealTypes
      : [candidate?.mealType || candidate?.slot]
  ).map(normalizeMealType);

  if (!mealTypes.length) return true;
  return mealTypes.includes(safeSlot);
}

function normalizeCandidateType(value) {
  const normalized = normalizeText(value);
  if (normalized === "recipe") return "recipe";
  if (normalized === "portable_meal" || normalized === "portable meal") return "portable_meal";
  if (normalized === "fallback") return "fallback";
  return "meal_suggestion";
}

function normalizeRecipeCandidate(recipe, foodCatalog) {
  const macros = calculateRecipeMacros(recipe, foodCatalog);

  return {
    id: recipe?.id || normalizeId(recipe?.name),
    name: recipe?.name || "Receta sugerida",
    type: "recipe",
    calories: roundNumber(macros?.calories, 0),
    protein: roundNumber(macros?.protein, 0),
    carbs: roundNumber(macros?.carbs, 0),
    fat: roundNumber(macros?.fat, 0),
    vegetableServings: estimateRecipeVegetableServings(recipe),
    portable: false,
    satietyScore: estimateCandidateSatiety({ foods: getSafeArray(recipe?.ingredients).map((item) => item?.foodId) }),
    mealTypes: [normalizeMealType(recipe?.mealType)],
    foods: getSafeArray(recipe?.ingredients).map((item) => item?.foodId),
    sourceLabel: "recetas existentes",
  };
}

function normalizePortableMealCandidate(portableMeal, foodLookup) {
  const macros = sumFoodSelectionMacros(portableMeal?.foods, foodLookup);

  return {
    id: portableMeal?.id || normalizeId(portableMeal?.name),
    name: portableMeal?.name || "Comida portable",
    type: "portable_meal",
    calories: roundNumber(macros.calories, 0),
    protein: roundNumber(macros.protein, 0),
    carbs: roundNumber(macros.carbs, 0),
    fat: roundNumber(macros.fat, 0),
    vegetableServings: roundNumber(macros.vegetableGrams / 80, 1),
    portable: true,
    satietyScore: estimateCandidateSatiety(portableMeal),
    mealTypes: getSafeArray(portableMeal?.mealType || portableMeal?.mealTypes),
    foods: getSafeArray(portableMeal?.foods),
    sourceLabel: "biblioteca portable",
  };
}

function normalizeSuggestionCandidate(candidate) {
  return {
    id: candidate?.id || normalizeId(candidate?.name),
    name: candidate?.name || "Sugerencia",
    type: normalizeCandidateType(candidate?.type),
    calories: roundNumber(candidate?.calories, 0),
    protein: roundNumber(candidate?.protein, 0),
    carbs: roundNumber(candidate?.carbs, 0),
    fat: roundNumber(candidate?.fat, 0),
    vegetableServings: roundNumber(candidate?.vegetableServings, 1),
    portable: Boolean(candidate?.portable),
    satietyScore: estimateCandidateSatiety(candidate),
    mealTypes: getSafeArray(candidate?.mealType || candidate?.mealTypes || candidate?.slot),
    foods: getSafeArray(candidate?.foods),
    sourceLabel: candidate?.sourceLabel || "sugerencias previas",
  };
}

function buildRecoveryLibraryCandidates() {
  return [
    ...getSafeArray(proteinRecoveryFoods),
    ...getSafeArray(vegetableRecoveryFoods),
  ].map((item) =>
    normalizeSuggestionCandidate({
      ...item,
      type: "meal_suggestion",
      carbs: safeNumber(item?.carbs),
      fat: safeNumber(item?.fat),
      sourceLabel: "recovery foods",
    })
  );
}

function buildDerivedMealSuggestions(slotName, targetCalories, recipes, foodCatalog) {
  return getMealSuggestions(targetCalories || 320, recipes, foodCatalog, slotName).map(
    (item) =>
      normalizeSuggestionCandidate({
        ...item,
        type: "meal_suggestion",
        sourceLabel: "meal suggestions",
      })
  );
}

function dedupeCandidates(candidates = []) {
  const byId = new Map();

  getSafeArray(candidates).forEach((candidate) => {
    const key = `${candidate?.type || "candidate"}:${candidate?.id || normalizeId(candidate?.name)}`;
    if (!key) return;

    const current = byId.get(key);
    if (!current) {
      byId.set(key, candidate);
      return;
    }

    const currentQuality =
      safeNumber(current?.calories > 0) +
      safeNumber(current?.protein > 0) +
      safeNumber(current?.vegetableServings > 0);
    const nextQuality =
      safeNumber(candidate?.calories > 0) +
      safeNumber(candidate?.protein > 0) +
      safeNumber(candidate?.vegetableServings > 0);

    if (nextQuality >= currentQuality) {
      byId.set(key, candidate);
    }
  });

  return [...byId.values()];
}

function buildMatchTarget(slotPlan = {}, templateKey, options = {}) {
  const strategy = normalizeText(slotPlan?.strategy);
  const normalizedTemplateKey = normalizeText(templateKey);

  return {
    slot: normalizeMealType(slotPlan?.slot),
    targetCalories: Math.max(0, safeNumber(slotPlan?.targetCalories)),
    targetProtein: Math.max(0, safeNumber(slotPlan?.targetProtein)),
    targetVegetables: Math.max(0, safeNumber(slotPlan?.targetVegetables)),
    priority: String(slotPlan?.priority || "medium"),
    preferPortable:
      Boolean(options?.preferPortable) ||
      normalizedTemplateKey === "portable_workday" ||
      strategy.includes("portable") ||
      strategy.includes("trabajo"),
    preferHighProtein:
      Boolean(options?.preferHighProtein) ||
      normalizedTemplateKey === "high_protein" ||
      safeNumber(slotPlan?.targetProtein) >= 20 ||
      strategy.includes("proteina"),
    preferVegetables:
      Boolean(options?.preferVegetables) ||
      normalizedTemplateKey === "vegetable_recovery" ||
      normalizedTemplateKey === "balanced" ||
      normalizedTemplateKey === "post_excess" ||
      safeNumber(slotPlan?.targetVegetables) > 0 ||
      strategy.includes("vegetal"),
    moderateCalories:
      Boolean(options?.moderateCalories) ||
      normalizedTemplateKey === "post_excess" ||
      strategy.includes("livian"),
    preferSatiety:
      String(slotPlan?.priority || "").toLowerCase() === "high" ||
      strategy.includes("saciedad") ||
      strategy.includes("adherencia"),
  };
}

function getSourceBoost(candidate, target = {}) {
  if (candidate?.type === "recipe") return 4;
  if (candidate?.type === "portable_meal" && target.preferPortable) return 8;
  if (candidate?.type === "meal_suggestion") return 2;
  return 0;
}

function getScoreDetails(candidate, target = {}) {
  const reasons = [];
  let score = getSourceBoost(candidate, target);

  const targetCalories = Math.max(0, safeNumber(target?.targetCalories));
  const targetProtein = Math.max(0, safeNumber(target?.targetProtein));
  const targetVegetables = Math.max(0, safeNumber(target?.targetVegetables));

  if (targetCalories > 0 && safeNumber(candidate?.calories) > 0) {
    const diffRatio =
      Math.abs(safeNumber(candidate.calories) - targetCalories) / Math.max(targetCalories, 1);
    score += clamp(28 - diffRatio * 34, -10, 28);

    if (diffRatio <= 0.2) {
      reasons.push("calorias cercanas al objetivo");
    } else if (safeNumber(candidate.calories) > targetCalories * 1.25) {
      reasons.push("algo mas calorica que el objetivo");
    }
  }

  if (targetProtein > 0) {
    const proteinRatio = safeNumber(candidate?.protein) / Math.max(targetProtein, 1);

    if (proteinRatio >= 1) {
      score += 32;
      reasons.push("cubre bien la meta de proteina");
    } else if (proteinRatio >= 0.75) {
      score += 24;
      reasons.push("aporta buena cantidad de proteina");
    } else if (proteinRatio >= 0.5) {
      score += 14;
    } else {
      score -= 8;
    }
  } else if (target.preferHighProtein && safeNumber(candidate?.protein) >= 18) {
    score += 18;
    reasons.push("perfil proteico util");
  }

  if (targetVegetables > 0) {
    if (safeNumber(candidate?.vegetableServings) >= Math.max(1, targetVegetables * 0.75)) {
      score += 22;
      reasons.push("incluye vegetales visibles");
    } else if (safeNumber(candidate?.vegetableServings) > 0) {
      score += 10;
      reasons.push("suma algo de vegetales");
    } else {
      score -= 10;
    }
  }

  if (target.preferPortable) {
    if (candidate?.portable) {
      score += 14;
      reasons.push("portable y practica");
    } else {
      score -= 8;
    }
  }

  if (target.preferSatiety) {
    if (safeNumber(candidate?.satietyScore) >= 7) {
      score += 10;
      reasons.push("buena saciedad");
    } else if (safeNumber(candidate?.satietyScore) >= 5) {
      score += 4;
    }
  }

  if (target.moderateCalories && targetCalories > 0 && safeNumber(candidate?.calories) > targetCalories * 1.25) {
    score -= 12;
  }

  if (target.preferHighProtein && safeNumber(candidate?.protein) >= 25) {
    score += 6;
  }

  if (target.preferVegetables && safeNumber(candidate?.vegetableServings) >= 1.5) {
    score += 4;
  }

  return {
    score: roundNumber(score, 1),
    reasons: uniqueStrings(reasons),
  };
}

export function scoreMealCandidate(candidate, target = {}) {
  return getScoreDetails(candidate, target).score;
}

export function buildFallbackRecoveryMeal(slotPlan = {}, context = {}) {
  const target = buildMatchTarget(slotPlan, context?.templateKey, context?.options);
  const slotLabel = SLOT_LABELS[target.slot] || "comida";

  let name = `Opcion base para ${slotLabel}`;
  if (target.slot === "breakfast") {
    name = target.preferHighProtein
      ? "Desayuno con proteina principal + fruta + base moderada"
      : "Desayuno ordenado con proteina util y energia estable";
  } else if (target.slot === "lunch") {
    name = target.preferVegetables
      ? "Almuerzo con proteina magra + verduras + acompanamiento controlado"
      : "Almuerzo con proteina principal y acompanamiento simple";
  } else if (target.slot === "dinner") {
    name = target.preferVegetables
      ? "Cena alta en proteina con verduras"
      : "Cena con proteina util y cierre liviano";
  } else if (target.slot === "snack") {
    name = target.preferHighProtein
      ? "Snack proteico liviano"
      : "Snack complementario simple";
  }

  if (target.preferPortable) {
    name = `${name} en formato portable`;
  }

  return {
    type: "fallback",
    id: `fallback_${target.slot || "slot"}`,
    name,
    calories: Math.round(target.targetCalories),
    protein: Math.round(target.targetProtein),
    carbs: 0,
    fat: 0,
    vegetableServings: roundNumber(target.targetVegetables, 1),
    score: 12,
    reasons: ["No hubo un match suficientemente claro y se devolvio una estructura simple y usable."],
  };
}

export function matchRecoveryMealsForSlot(input = {}) {
  const safeInput = isObject(input) ? input : {};
  const slotPlan = isObject(safeInput.slot) ? safeInput.slot : {};
  const context = isObject(safeInput.context) ? safeInput.context : {};
  const options = isObject(safeInput.options) ? safeInput.options : {};
  const templateKey = String(safeInput.templateKey || context?.templateKey || "").trim().toLowerCase();

  const slotName = normalizeMealType(slotPlan?.slot);
  const maxResults = clamp(Math.round(safeNumber(options?.maxResults, DEFAULT_MAX_RESULTS)), 1, 6);
  const foodCatalog = getCombinedFoodCatalog(context);
  const foodLookup = buildFoodLookup(foodCatalog);
  const recipes = [...getSafeArray(defaultRecipes), ...getSafeArray(context.recipes)];
  const portableMeals = [...getSafeArray(defaultPortableMeals), ...getSafeArray(context.portableMeals)];
  const recoveryLibrary = [
    ...buildRecoveryLibraryCandidates(),
    ...getSafeArray(context.satietyMeals).map((item) => normalizeSuggestionCandidate({
      ...item,
      type: "meal_suggestion",
      sourceLabel: item?.sourceLabel || "satiety library",
    })),
    ...getSafeArray(context.mealSuggestions).map((item) => normalizeSuggestionCandidate(item)),
    ...buildDerivedMealSuggestions(slotName, safeNumber(slotPlan?.targetCalories), recipes, foodCatalog),
  ];

  const unifiedCandidates = dedupeCandidates([
    ...recipes.map((recipe) => normalizeRecipeCandidate(recipe, foodCatalog)),
    ...portableMeals.map((portableMeal) => normalizePortableMealCandidate(portableMeal, foodLookup)),
    ...recoveryLibrary,
  ]).filter((candidate) => matchesSlot(candidate, slotName));

  const target = buildMatchTarget(slotPlan, templateKey, options);

  const rankedSuggestions = unifiedCandidates
    .map((candidate) => {
      const scoreDetails = getScoreDetails(candidate, target);
      return {
        ...candidate,
        score: scoreDetails.score,
        reasons: scoreDetails.reasons.slice(0, 4),
      };
    })
    .filter((candidate) => candidate.score > -20)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxResults)
    .map((candidate) => ({
      type: normalizeCandidateType(candidate.type),
      id: candidate.id || normalizeId(candidate.name),
      name: candidate.name || "Opcion sugerida",
      calories: Math.round(safeNumber(candidate.calories)),
      protein: Math.round(safeNumber(candidate.protein)),
      carbs: Math.round(safeNumber(candidate.carbs)),
      fat: Math.round(safeNumber(candidate.fat)),
      vegetableServings: roundNumber(candidate.vegetableServings, 1),
      score: roundNumber(candidate.score, 1),
      reasons: uniqueStrings([
        ...candidate.reasons,
        candidate.sourceLabel ? `fuente: ${candidate.sourceLabel}` : "",
      ]).slice(0, 4),
    }));

  const suggestions =
    rankedSuggestions.length > 0
      ? rankedSuggestions
      : [buildFallbackRecoveryMeal(slotPlan, { templateKey, options })];

  const reasoning = uniqueStrings([
    target.preferPortable ? "Se priorizaron opciones portables para este slot." : "",
    target.preferHighProtein ? "Se priorizaron opciones con mejor aporte proteico." : "",
    target.preferVegetables ? "Se priorizaron opciones con vegetales visibles." : "",
    target.moderateCalories ? "Se moderaron opciones muy densas en calorias." : "",
    suggestions[0]?.type === "fallback"
      ? "No hubo match claro en las bibliotecas existentes y se devolvio un fallback legible."
      : `Se encontraron ${suggestions.length} opciones concretas para ${SLOT_LABELS[slotName] || slotName}.`,
  ]);

  return {
    slot: slotName,
    strategy: slotPlan?.strategy || "",
    suggestions,
    reasoning,
  };
}

export function matchRecoveryMealsForPlan(input = {}) {
  const safeInput = isObject(input) ? input : {};
  const plan = isObject(safeInput.plan) ? safeInput.plan : {};
  const context = isObject(safeInput.context) ? safeInput.context : {};
  const options = isObject(safeInput.options) ? safeInput.options : {};
  const slotMatches = {};

  SLOT_ORDER.forEach((slotName) => {
    const slotPlan = isObject(plan?.slots?.[slotName]) ? plan.slots[slotName] : null;
    if (!slotPlan?.enabled) return;

    slotMatches[slotName] = matchRecoveryMealsForSlot({
      slot: slotPlan,
      templateKey: plan?.templateKey,
      context,
      options,
    });
  });

  const enabledSlots = SLOT_ORDER.filter((slotName) => slotMatches[slotName]);

  return {
    templateKey: String(plan?.templateKey || "").trim().toLowerCase(),
    slotMatches,
    reasoning: uniqueStrings([
      enabledSlots.length
        ? `Se aterrizaron ${enabledSlots.length} slots del plan en propuestas concretas.`
        : "No habia slots habilitados para convertir en comidas reales.",
      enabledSlots.includes("lunch") || enabledSlots.includes("dinner")
        ? "Se priorizaron slots principales antes que complementos."
        : "",
    ]),
  };
}
