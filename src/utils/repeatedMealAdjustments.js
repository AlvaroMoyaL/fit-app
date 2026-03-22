import { getFoodPortionOption } from "./foodPortions.js";

function scaleNutrient(base, quantity) {
  return Number((Number(base || 0) * quantity).toFixed(2));
}

function toNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(toNumber(value), min), max);
}

function roundToStep(value, step = 5) {
  if (step <= 0) return Math.round(toNumber(value));
  return Math.round(toNumber(value) / step) * step;
}

function normalizeFoodIdentityPart(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getFoodIdentity(food) {
  return `${normalizeFoodIdentityPart(food?.name)}::${normalizeFoodIdentityPart(food?.brand)}`;
}

function resolveEntryConfig(food, mealType, quantity, quantityMode) {
  const numericQuantity = Number(quantity || 0);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return null;

  if (mealType === "bebida") {
    return {
      quantity: numericQuantity,
      unit: "ml",
      grams: numericQuantity,
      ratio: numericQuantity / 100,
    };
  }

  if (quantityMode === "portion") {
    const portion = getFoodPortionOption(food, mealType);
    if (portion) {
      if (portion?.grams > 0) {
        const grams = Number((numericQuantity * portion.grams).toFixed(2));
        return {
          quantity: numericQuantity,
          unit: portion.label || "porción",
          grams,
          ratio: grams / 100,
          quantityMode: "portion",
          portionLabel: portion.label || "porción",
          portionDescription: portion.description || "",
          baseServingGrams: Number(portion.grams || 0),
          servingSize: String(food?.servingSize || portion.description || ""),
        };
      }

      return {
        quantity: numericQuantity,
        unit: portion.label || "porción",
        grams: 0,
        ratio: numericQuantity,
        quantityMode: "portion",
        portionLabel: portion.label || "porción",
        portionDescription: portion.description || "",
        baseServingGrams: 0,
        servingSize: String(food?.servingSize || portion.description || ""),
      };
    }
  }

  return {
    quantity: numericQuantity,
    unit: "x100g",
    grams: Number((numericQuantity * 100).toFixed(2)),
    ratio: numericQuantity,
    quantityMode: "x100g",
    portionLabel: "",
    portionDescription: "",
    baseServingGrams: 0,
    servingSize: String(food?.servingSize || ""),
  };
}

function createMealFromFood({ food, mealType, beverageType, quantity, date, time, id, mealGroupId, consumedAt }) {
  const entry = resolveEntryConfig(food, mealType, quantity?.value ?? quantity, quantity?.quantityMode || "x100g");
  const ratio = entry?.ratio || 0;
  const unit = entry?.unit || (mealType === "bebida" ? "ml" : "x100g");

  return {
    id,
    mealGroupId,
    date,
    time,
    consumedAt,
    mealType,
    beverageType: mealType === "bebida" ? beverageType : "",
    name: food.name,
    brand: food.brand || "",
    quantity: Number(entry?.quantity ?? quantity ?? 0),
    unit,
    quantityMode: entry?.quantityMode || quantity?.quantityMode || "x100g",
    portionLabel: String(entry?.portionLabel || ""),
    portionDescription: String(entry?.portionDescription || ""),
    baseServingGrams: Number(entry?.baseServingGrams || 0),
    servingSize: String(entry?.servingSize || food?.servingSize || ""),
    grams: Number(entry?.grams || 0),
    calories: scaleNutrient(food.calories, ratio),
    protein: scaleNutrient(food.protein, ratio),
    carbs: scaleNutrient(food.carbs, ratio),
    fat: scaleNutrient(food.fat, ratio),
    sodium: scaleNutrient(food.sodium, ratio),
    sugars: scaleNutrient(food.sugars, ratio),
    fiber: scaleNutrient(food.fiber, ratio),
    saturatedFat: scaleNutrient(food.saturatedFat, ratio),
    transFat: scaleNutrient(food.transFat, ratio),
    cholesterol: scaleNutrient(food.cholesterol, ratio),
  };
}

function findFoodOptionByCandidates(foodOptions, candidates) {
  const safeOptions = Array.isArray(foodOptions) ? foodOptions.filter(Boolean) : [];
  const normalizedCandidates = (Array.isArray(candidates) ? candidates : [candidates])
    .map((candidate) => normalizeFoodIdentityPart(candidate))
    .filter(Boolean);

  if (!normalizedCandidates.length) return null;

  return (
    safeOptions.find((food) => {
      const name = normalizeFoodIdentityPart(food?.name);
      const id = normalizeFoodIdentityPart(food?.id);
      return normalizedCandidates.includes(name) || normalizedCandidates.includes(id);
    }) || null
  );
}

function findFoodOptionByIdentity(foodOptions, identity) {
  const safeIdentity = normalizeFoodIdentityPart(identity);
  if (!safeIdentity) return null;

  return (
    (Array.isArray(foodOptions) ? foodOptions : []).find((food) => {
      const composite = normalizeFoodIdentityPart(getFoodIdentity(food));
      const id = normalizeFoodIdentityPart(food?.id || food?.name);
      return composite === safeIdentity || id === safeIdentity;
    }) || null
  );
}

function resolveAdjustmentFoodOption(addition, foodOptions) {
  return (
    findFoodOptionByIdentity(foodOptions, addition?.selectedFoodIdentity) ||
    findFoodOptionByCandidates(foodOptions, addition?.preferredFoodNames) ||
    null
  );
}

function hasActionPlanContent(actionPlan) {
  return Boolean(
    (Array.isArray(actionPlan?.reductions) && actionPlan.reductions.length) ||
      (Array.isArray(actionPlan?.additions) && actionPlan.additions.length)
  );
}

function selectAdjustmentActionPlan(actionPlan, mode = "full") {
  if (!hasActionPlanContent(actionPlan)) return null;
  if (!mode || mode === "full") return actionPlan;

  const reductions = Array.isArray(actionPlan?.reductions) ? actionPlan.reductions : [];
  const additions = Array.isArray(actionPlan?.additions) ? actionPlan.additions : [];

  if (mode === "protein") {
    const nextPlan = {
      reductions: [],
      additions: additions.filter((item) => item?.targetCategory === "protein"),
    };
    return hasActionPlanContent(nextPlan) ? nextPlan : null;
  }

  if (mode === "vegetables") {
    const nextPlan = {
      reductions: [],
      additions: additions.filter((item) => item?.targetCategory === "vegetable"),
    };
    return hasActionPlanContent(nextPlan) ? nextPlan : null;
  }

  if (mode === "lighter") {
    const nextPlan = {
      reductions,
      additions: [],
    };
    return hasActionPlanContent(nextPlan) ? nextPlan : null;
  }

  return actionPlan;
}

function scaleMealByRatio(meal, ratio) {
  const safeRatio = clampNumber(ratio, 0.2, 1.5);
  const numericKeys = [
    "grams",
    "calories",
    "protein",
    "carbs",
    "fat",
    "sodium",
    "sugars",
    "fiber",
    "saturatedFat",
    "transFat",
    "cholesterol",
  ];

  const nextMeal = { ...meal };
  numericKeys.forEach((key) => {
    nextMeal[key] = Number((toNumber(meal?.[key]) * safeRatio).toFixed(2));
  });

  if (toNumber(meal?.quantity) > 0) {
    nextMeal.quantity = Number((toNumber(meal?.quantity) * safeRatio).toFixed(2));
  }

  return nextMeal;
}

export function buildAdjustedRepeatedMeals({
  templateItems,
  adjustment,
  adjustmentMode,
  customActionPlan,
  foodOptions,
  mealType,
  targetDate,
  targetTime,
  consumedAt,
  baseId,
  mealGroupId,
}) {
  const baseMeals = (Array.isArray(templateItems) ? templateItems : []).map((meal) => ({
    ...meal,
    date: targetDate,
    time: targetTime,
    consumedAt,
    mealGroupId,
  }));

  const actionPlan = customActionPlan || selectAdjustmentActionPlan(adjustment?.actionPlan, adjustmentMode);
  if (!actionPlan) {
    return baseMeals.map((meal, index) => ({
      ...meal,
      id: `${baseId}-${index}`,
    }));
  }

  let nextMeals = [...baseMeals];

  (Array.isArray(actionPlan.reductions) ? actionPlan.reductions : []).forEach((reduction) => {
    if (reduction?.type === "reduce_meal") {
      nextMeals = nextMeals.map((meal) => scaleMealByRatio(meal, reduction?.ratio || 1));
      return;
    }

    if (reduction?.type !== "reduce_item") return;
    const sourceName = normalizeFoodIdentityPart(reduction?.sourceName);
    if (!sourceName) return;

    const targetIndex = nextMeals.findIndex(
      (meal) => normalizeFoodIdentityPart(meal?.name) === sourceName
    );
    if (targetIndex < 0) return;

    const currentMeal = nextMeals[targetIndex];
    const currentGrams = Math.max(0, toNumber(currentMeal?.grams));
    if (currentGrams <= 0) {
      nextMeals[targetIndex] = scaleMealByRatio(currentMeal, 0.75);
      return;
    }

    const remainingGrams = Math.max(currentGrams - toNumber(reduction?.trimGrams), currentGrams * 0.35, 10);
    nextMeals[targetIndex] = scaleMealByRatio(currentMeal, remainingGrams / currentGrams);
  });

  (Array.isArray(actionPlan.additions) ? actionPlan.additions : []).forEach((addition) => {
    if (addition?.type !== "add_food") return;

    const matchedFood = resolveAdjustmentFoodOption(addition, foodOptions);
    if (!matchedFood) return;

    const targetGrams = Math.max(10, roundToStep(toNumber(addition?.targetGrams), 10));

    const nextMeal = createMealFromFood({
      food: matchedFood,
      mealType,
      beverageType: "",
      quantity: {
        value: Number((targetGrams / 100).toFixed(2)),
        quantityMode: "x100g",
      },
      date: targetDate,
      time: targetTime,
      id: `${baseId}-tmp-${nextMeals.length}`,
      mealGroupId,
      consumedAt,
    });

    nextMeals.push(nextMeal);
  });

  return nextMeals.map((meal, index) => ({
    ...meal,
    id: `${baseId}-${index}`,
    mealGroupId,
    date: targetDate,
    time: targetTime,
    consumedAt,
  }));
}
