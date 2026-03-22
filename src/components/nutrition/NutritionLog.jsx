import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { addMeal, deleteMeal, saveMeals } from "../../utils/nutritionStorage";
import { getMealsForDate } from "../../utils/nutritionUtils";
import { foodCatalog } from "../../data/foodCatalog";
import { recipes } from "../../data/recipes";
import { getCustomFoods, saveCustomFood, updateCustomFood } from "../../utils/customFoodsStorage";
import { getCustomRecipes, saveCustomRecipe } from "../../utils/customRecipesStorage";
import RecipeSelector from "./RecipeSelector";
import QuickFoodInput from "./QuickFoodInput";
import FoodDetailDrawer from "./FoodDetailDrawer";
import { estimateHungerFromMeals } from "../../utils/hungerEstimate";
import { formatMealPortionMeta, getFoodPortionOption } from "../../utils/foodPortions";
import { trackVegetableIntake } from "../../utils/vegetableTracker";
import {
  nutritionCompactTabsSx,
  nutritionSurfaceSx,
  nutritionTabLabelDot,
  nutritionTabsRailSx,
} from "./nutritionUi";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function createDefaultForm() {
  return {
    mealType: "desayuno",
    beverageType: "agua",
    food: null,
    quantity: "1",
    quantityMode: "x100g",
    date: getTodayDateKey(),
    time: getCurrentTimeValue(),
  };
}
const DEFAULT_CUSTOM_FOOD_FORM = {
  name: "",
  brand: "",
  category: "processed",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  servingSize: "",
  servingsPerContainer: "",
  sodium: "",
  sugars: "",
  fiber: "",
  saturatedFat: "",
  transFat: "",
  cholesterol: "",
};
const DEFAULT_RECIPE_FORM = {
  name: "",
  ingredients: [{ food: null, grams: "100" }],
};
const FOOD_CATEGORIES = [
  "carbs",
  "protein",
  "fruit",
  "vegetable",
  "dairy",
  "fat",
  "processed",
  "traditional",
];
const MEAL_TYPE_ORDER = ["desayuno", "almuerzo", "cena", "snack", "bebida"];
const BEVERAGE_TYPES = ["agua", "cafe_te", "sin_calorias", "calorica", "alcohol"];
const DAILY_VEGETABLE_TARGET = 3;
const VEGETABLE_SERVING_GRAMS = 80;

function buildMealTimestamp(dateKey, timeValue) {
  const safeDate = String(dateKey || "").trim();
  const safeTime = String(timeValue || "").trim();
  if (!safeDate) return Date.now();
  const ts = new Date(`${safeDate}T${safeTime || "12:00"}:00`).getTime();
  return Number.isFinite(ts) ? ts : Date.now();
}

function scaleNutrient(base, quantity) {
  return Number((Number(base || 0) * quantity).toFixed(2));
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

function createMealFromFood({ food, mealType, beverageType, quantity, date, time, id, mealGroupId }) {
  const entry = resolveEntryConfig(food, mealType, quantity?.value ?? quantity, quantity?.quantityMode || "x100g");
  const ratio = entry?.ratio || 0;
  const unit = entry?.unit || (mealType === "bebida" ? "ml" : "x100g");
  const timestamp = buildMealTimestamp(date, time);

  return {
    id,
    mealGroupId,
    date,
    time,
    consumedAt: timestamp,
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

function getDraftPreview(food, mealType, quantity) {
  if (!food) return null;
  const entry = resolveEntryConfig(food, mealType, quantity?.value ?? quantity, quantity?.quantityMode || "x100g");
  if (!entry) return null;
  const ratio = entry.ratio;
  return {
    unit: entry.unit,
    quantityMode: entry.quantityMode || quantity?.quantityMode || "x100g",
    portionLabel: String(entry.portionLabel || ""),
    portionDescription: String(entry.portionDescription || ""),
    baseServingGrams: Number(entry.baseServingGrams || 0),
    servingSize: String(entry.servingSize || food?.servingSize || ""),
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

function mealTypeLabel(type) {
  if (type === "desayuno") return "Desayuno";
  if (type === "almuerzo") return "Almuerzo";
  if (type === "cena") return "Cena";
  if (type === "snack") return "Snack";
  if (type === "bebida") return "Bebida";
  return type;
}

function beverageTypeLabel(type) {
  if (type === "agua") return "Agua";
  if (type === "cafe_te") return "Café / Té";
  if (type === "sin_calorias") return "Sin calorías";
  if (type === "calorica") return "Calórica";
  if (type === "alcohol") return "Alcohol";
  return type || "";
}

function getMealContributionValues(meal) {
  return {
    calories: Math.round(Number(meal?.calories || 0)),
    protein: Number(Number(meal?.protein || 0).toFixed(1)),
    carbs: Number(Number(meal?.carbs || 0).toFixed(1)),
    fat: Number(Number(meal?.fat || 0).toFixed(1)),
  };
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

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMealItemWithHighest(items, key) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return null;

  return safeItems.reduce((best, item) => {
    if (!best) return item;
    return toNumber(item?.[key]) > toNumber(best?.[key]) ? item : best;
  }, null);
}

function formatMealFocusName(item) {
  const name = String(item?.name || "").trim();
  if (!name) return "";
  const [first, second] = name.split(/\s+/);
  return [first, second].filter(Boolean).join(" ");
}

function formatRoundedGrams(value) {
  const rounded = Math.max(0, roundToStep(value, value >= 100 ? 10 : 5));
  return `${rounded} g`;
}

function formatVegetableServingsLabel(servings) {
  const safeServings = Number(toNumber(servings).toFixed(1));
  if (!safeServings) return "";
  const display = Number.isInteger(safeServings) ? String(safeServings) : String(safeServings).replace(".0", "");
  return `${display} ${safeServings === 1 ? "porción" : "porciones"}`;
}

function buildProjectedAdjustmentState({ totalCalories, totalProtein, vegetableServings, deltas = [] }) {
  const mergedDelta = (Array.isArray(deltas) ? deltas : []).reduce(
    (acc, delta) => {
      acc.calories += toNumber(delta?.calories);
      acc.protein += toNumber(delta?.protein);
      acc.vegetableServings += toNumber(delta?.vegetableServings);
      return acc;
    },
    { calories: 0, protein: 0, vegetableServings: 0 }
  );

  const nextCalories = Math.max(0, roundToStep(totalCalories + mergedDelta.calories, 5));
  const nextProtein = Math.max(0, Number((totalProtein + mergedDelta.protein).toFixed(1)));
  const nextVegetables = Math.max(0, Number((vegetableServings + mergedDelta.vegetableServings).toFixed(1)));

  return {
    calories: nextCalories,
    protein: nextProtein,
    vegetableServings: nextVegetables,
  };
}

function getProteinSupportPlan({ mealType, proteinRemaining, topProteinItem, proteinFocusName }) {
  const minimum = mealType === "snack" ? 10 : mealType === "desayuno" ? 12 : 15;
  const maximum = mealType === "snack" ? 18 : mealType === "desayuno" ? 22 : 28;
  const suggestedProtein = clampNumber(roundToStep(proteinRemaining * 0.55, 5), minimum, maximum);
  const proteinDensity =
    toNumber(topProteinItem?.grams) > 0 ? toNumber(topProteinItem?.protein) / toNumber(topProteinItem?.grams) : 0;

  if (proteinFocusName && proteinDensity >= 0.12) {
    const suggestedFoodGrams = clampNumber(
      roundToStep(suggestedProtein / Math.max(proteinDensity, 0.12), 10),
      40,
      mealType === "snack" ? 120 : 160
    );

    return {
      proteinGrams: suggestedProtein,
      amountLabel: `+${suggestedProtein} g prot.`,
      example: `Ejemplo: suma unos ${formatRoundedGrams(suggestedFoodGrams)} de ${proteinFocusName}.`,
      estimatedDelta: {
        calories: roundToStep(suggestedFoodGrams * (toNumber(topProteinItem?.calories) / Math.max(toNumber(topProteinItem?.grams), 1)), 5),
        protein: suggestedProtein,
        vegetableServings: 0,
      },
    };
  }

  if (mealType === "snack" || mealType === "desayuno") {
    const estimatedCalories = suggestedProtein >= 15 ? 140 : 110;
    return {
      proteinGrams: suggestedProtein,
      amountLabel: `+${suggestedProtein} g prot.`,
      example:
        suggestedProtein >= 15
          ? "Ejemplo: 1 yogurt griego (150 g) + 1 huevo, o 1 lata chica de atún."
          : "Ejemplo: 1 yogurt griego (150 g) o 2 huevos.",
      estimatedDelta: {
        calories: estimatedCalories,
        protein: suggestedProtein,
        vegetableServings: 0,
      },
    };
  }

  const estimatedCalories = suggestedProtein >= 20 ? 130 : 105;
  return {
    proteinGrams: suggestedProtein,
    amountLabel: `+${suggestedProtein} g prot.`,
    example:
      suggestedProtein >= 20
        ? "Ejemplo: suma 100-120 g de pollo, atún o pavo."
        : "Ejemplo: suma 80-100 g de pollo, atún o pavo.",
    estimatedDelta: {
      calories: estimatedCalories,
      protein: suggestedProtein,
      vegetableServings: 0,
    },
  };
}

function getVegetableSupportPlan({ mealType, vegetableServingsToday, lowSatietyMeal }) {
  const vegetableGap = Math.max(0, DAILY_VEGETABLE_TARGET - toNumber(vegetableServingsToday));
  const baseServings =
    mealType === "almuerzo" || mealType === "cena"
      ? vegetableGap >= 2 || lowSatietyMeal
        ? 2
        : vegetableGap >= 1.3
        ? 1.5
        : 1
      : vegetableGap >= 1.3
      ? 1.5
      : 1;

  const servings = clampNumber(Number(baseServings.toFixed(1)), 1, 2);
  const grams = roundToStep(servings * VEGETABLE_SERVING_GRAMS, 10);
  const amountLabel = `+${formatVegetableServingsLabel(servings)} veg.`;

  return {
    servings,
    grams,
    amountLabel,
    example:
      mealType === "almuerzo" || mealType === "cena"
        ? `Ejemplo: agrega ${formatRoundedGrams(grams)} de ensalada o verduras salteadas.`
        : `Ejemplo: agrega ${formatRoundedGrams(grams)} de tomate, pepino o zanahoria.`,
    estimatedDelta: {
      calories: roundToStep(servings * 20, 5),
      protein: Number((servings * 1).toFixed(1)),
      vegetableServings: servings,
    },
  };
}

function getPortionReductionPlan({ totalCalories, caloriesRemaining, focusItem, focusName }) {
  const desiredTrimKcal = clampNumber(
    totalCalories - Math.max(120, caloriesRemaining),
    70,
    Math.max(90, Math.min(220, totalCalories * 0.35))
  );

  if (toNumber(focusItem?.grams) > 0 && toNumber(focusItem?.calories) > 0 && focusName) {
    const kcalPerGram = toNumber(focusItem.calories) / Math.max(toNumber(focusItem.grams), 1);
    const maxTrimGrams = Math.max(20, roundToStep(toNumber(focusItem.grams) * 0.4, 5));
    const trimGrams = clampNumber(roundToStep(desiredTrimKcal / Math.max(kcalPerGram, 0.5), 5), 20, maxTrimGrams);

    return {
      trimGrams,
      amountLabel: `-${formatRoundedGrams(trimGrams)} ${focusName}`,
      example: `Ejemplo: deja unos ${formatRoundedGrams(trimGrams)} menos de ${focusName}.`,
      estimatedDelta: {
        calories: -roundToStep(trimGrams * kcalPerGram, 5),
        protein: -Number((trimGrams * (toNumber(focusItem?.protein) / Math.max(toNumber(focusItem?.grams), 1))).toFixed(1)),
        vegetableServings: 0,
      },
    };
  }

  return {
    trimGrams: 0,
    amountLabel: totalCalories >= 450 ? "-1/3 porción" : "-1/4 porción",
    example: "Ejemplo: repítelo con una porción un poco menor, no igual que la original.",
    estimatedDelta: {
      calories: -(totalCalories >= 450 ? roundToStep(totalCalories * 0.33, 5) : roundToStep(totalCalories * 0.25, 5)),
      protein: 0,
      vegetableServings: 0,
    },
  };
}

function getMealGroupKey(meal, index = 0) {
  const explicitGroupId = String(meal?.mealGroupId || "").trim();
  if (explicitGroupId) return explicitGroupId;

  const explicitId = String(meal?.id || "").trim();
  if (explicitId) {
    const prefix = explicitId.split("-")[0];
    if (prefix) return `meal-${prefix}`;
    return explicitId;
  }

  const date = String(meal?.date || "").trim();
  const time = String(meal?.time || "").trim();
  const mealType = String(meal?.mealType || "snack").trim();
  return `${date || "date"}::${time || "time"}::${mealType}::${index}`;
}

function getMealBaseIdPrefix(meal) {
  const groupKey = getMealGroupKey(meal);
  if (groupKey.startsWith("meal-")) return groupKey.slice(5);
  return groupKey;
}

function createUniqueMealBaseId(dateKey, timeValue, meals) {
  let baseId = buildMealTimestamp(dateKey, timeValue);
  const usedBaseIds = new Set(
    (Array.isArray(meals) ? meals : [])
      .map((meal) => String(getMealBaseIdPrefix(meal) || "").trim())
      .filter(Boolean)
  );

  while (usedBaseIds.has(String(baseId))) {
    baseId += 1;
  }

  return baseId;
}

function formatShortDate(dateKey) {
  const safeDate = String(dateKey || "").trim();
  if (!safeDate) return "";
  const [year, month, day] = safeDate.split("-");
  if (!year || !month || !day) return safeDate;
  return `${day}/${month}`;
}

function groupMealsForRepeatTemplates(meals) {
  const safeMeals = Array.isArray(meals) ? meals.filter(Boolean) : [];
  if (!safeMeals.length) return [];

  const explicitGroups = new Map();
  const inferredCandidates = [];

  safeMeals.forEach((meal, index) => {
    const explicitGroupId = String(meal?.mealGroupId || "").trim();
    if (explicitGroupId) {
      const current = explicitGroups.get(explicitGroupId) || [];
      current.push(meal);
      explicitGroups.set(explicitGroupId, current);
      return;
    }

    inferredCandidates.push({ meal, index, timestamp: buildMealTimestamp(meal?.date, meal?.time) });
  });

  const inferredGroups = [];
  const THIRTY_MINUTES = 30 * 60 * 1000;

  [...inferredCandidates]
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach(({ meal, index, timestamp }) => {
      const mealType = String(meal?.mealType || "snack").trim();
      const mealDate = String(meal?.date || "").trim();
      const mealTime = String(meal?.time || "").trim();
      const previousGroup = inferredGroups[inferredGroups.length - 1];

      if (!previousGroup) {
        inferredGroups.push({
          key: `inferred-${mealDate || "date"}-${mealType || "type"}-${index}`,
          items: [meal],
          lastTimestamp: timestamp,
          lastDate: mealDate,
          lastTime: mealTime,
          mealType,
        });
        return;
      }

      const sameType = previousGroup.mealType === mealType;
      const sameDate = previousGroup.lastDate === mealDate;
      const closeInTime =
        timestamp > 0 &&
        previousGroup.lastTimestamp > 0 &&
        timestamp - previousGroup.lastTimestamp <= THIRTY_MINUTES;
      const sameClockTime =
        mealTime &&
        previousGroup.lastTime &&
        mealTime === previousGroup.lastTime &&
        sameDate &&
        sameType;

      if (sameType && sameDate && (closeInTime || sameClockTime)) {
        previousGroup.items.push(meal);
        previousGroup.lastTimestamp = timestamp;
        previousGroup.lastTime = mealTime || previousGroup.lastTime;
        return;
      }

      inferredGroups.push({
        key: `inferred-${mealDate || "date"}-${mealType || "type"}-${index}`,
        items: [meal],
        lastTimestamp: timestamp,
        lastDate: mealDate,
        lastTime: mealTime,
        mealType,
      });
    });

  return [
    ...[...explicitGroups.entries()].map(([key, items]) => ({ key, items })),
    ...inferredGroups.map((group) => ({ key: group.key, items: group.items })),
  ];
}

function buildMealTemplateCandidate(items, groupKey) {
  const safeItems = [...(Array.isArray(items) ? items : [])].filter(Boolean);
  if (!safeItems.length) return null;

  const orderedItems = [...safeItems].sort((left, right) => {
    const leftName = `${normalizeFoodIdentityPart(left?.name)}::${normalizeFoodIdentityPart(left?.brand)}`;
    const rightName = `${normalizeFoodIdentityPart(right?.name)}::${normalizeFoodIdentityPart(right?.brand)}`;
    return leftName.localeCompare(rightName);
  });

  const mealType = String(safeItems[0]?.mealType || "snack");
  const signature = [
    mealType,
    ...orderedItems.map((item) =>
      [
        normalizeFoodIdentityPart(item?.name),
        normalizeFoodIdentityPart(item?.brand),
        Number(item?.grams || item?.quantity || 0).toFixed(1),
        String(item?.unit || "").trim().toLowerCase(),
      ].join("::")
    ),
  ].join("|");

  const consumedAt = safeItems.reduce(
    (max, item) => Math.max(max, buildMealTimestamp(item?.date, item?.time)),
    0
  );
  const totals = safeItems.reduce(
    (acc, item) => {
      acc.calories += Number(item?.calories || 0);
      acc.protein += Number(item?.protein || 0);
      acc.carbs += Number(item?.carbs || 0);
      acc.fat += Number(item?.fat || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    signature,
    mealType,
    items: safeItems,
    totals,
    lastDate: String(safeItems[0]?.date || "").trim(),
    lastTime: String(safeItems[0]?.time || "").trim(),
    lastConsumedAt: consumedAt,
    sourceGroupId: groupKey,
    occurrences: 1,
  };
}

function buildFrequentMealAdjustment(template, dailyStatus) {
  const safeItems = Array.isArray(template?.items) ? template.items.filter(Boolean) : [];
  if (!safeItems.length) return null;

  const totalCalories = toNumber(template?.totals?.calories);
  const totalProtein = toNumber(template?.totals?.protein);
  const totalFat = toNumber(template?.totals?.fat);
  const vegetableServings = toNumber(trackVegetableIntake(safeItems)?.servings);
  const calorieDelta = toNumber(
    dailyStatus?.calorieDelta ??
      dailyStatus?.caloriesRemaining
  );
  const caloriesRemaining = Math.max(0, toNumber(dailyStatus?.caloriesRemaining));
  const proteinRemaining = Math.max(0, toNumber(dailyStatus?.proteinRemaining));
  const needsProtein = Boolean(dailyStatus?.needsProtein) || proteinRemaining >= 20;
  const needsVegetables = Boolean(dailyStatus?.needsVegetables) || toNumber(dailyStatus?.vegetableServings) < 3;
  const macroCarbs = normalizeStatus(dailyStatus?.macroBalance?.carbs);
  const macroFats = normalizeStatus(dailyStatus?.macroBalance?.fats);
  const topProteinItem = getMealItemWithHighest(safeItems, "protein");
  const topCarbItem = getMealItemWithHighest(safeItems, "carbs");
  const topFatItem = getMealItemWithHighest(safeItems, "fat");
  const carbFocusName = formatMealFocusName(topCarbItem);
  const fatFocusName = formatMealFocusName(topFatItem);
  const proteinFocusName = formatMealFocusName(topProteinItem);

  const chips = [];
  let tone = "info";
  let title = "Buen encaje";
  let detail = "Este plato ya está bastante alineado. Repítelo tal cual si hoy te acomoda.";
  let example = "";
  let projectedState = null;

  const shouldReducePortion =
    (calorieDelta <= 120 || macroCarbs === "high" || macroFats === "high") &&
    totalCalories >= Math.max(320, caloriesRemaining + 120);
  const needsMealProtein =
    needsProtein && totalProtein < Math.max(26, Math.min(36, proteinRemaining * 0.55));
  const needsMealVegetables =
    needsVegetables && vegetableServings < 1;
  const lowSatietyMeal =
    totalCalories >= 260 && totalProtein < 18 && vegetableServings < 0.5;
  const proteinPlan = needsMealProtein
    ? getProteinSupportPlan({
        mealType: template?.mealType,
        proteinRemaining,
        topProteinItem,
        proteinFocusName,
      })
    : null;
  const vegetablePlan = needsMealVegetables
    ? getVegetableSupportPlan({
        mealType: template?.mealType,
        vegetableServingsToday: dailyStatus?.vegetableServings,
        lowSatietyMeal,
      })
    : null;
  const reductionPlan = shouldReducePortion
    ? getPortionReductionPlan({
        totalCalories,
        caloriesRemaining,
        focusItem: topCarbItem || topFatItem,
        focusName: carbFocusName || fatFocusName,
      })
    : null;

  if (shouldReducePortion) {
    tone = "warning";
    title = "Reducir un poco la porción";
    detail = reductionPlan?.amountLabel
      ? `Hoy vas más justo de calorías. Si lo repites, recorta aprox. ${reductionPlan.amountLabel.replace(/^-/, "")}.`
      : carbFocusName
      ? `Hoy vas más justo de calorías. Si repites este plato, baja un poco ${carbFocusName}.`
      : fatFocusName
      ? `Hoy vas más justo de calorías. Si repites este plato, modera un poco ${fatFocusName}.`
      : "Hoy vas más justo de calorías. Te conviene repetirlo con una porción un poco menor.";
    example = reductionPlan?.example || "";
    chips.push(
      reductionPlan?.amountLabel || (carbFocusName ? `Menos ${carbFocusName}` : "Menos porción"),
      proteinPlan?.amountLabel || null
    );
    projectedState = buildProjectedAdjustmentState({
      totalCalories,
      totalProtein,
      vegetableServings,
      deltas: [reductionPlan?.estimatedDelta],
    });
  } else if (needsMealProtein && needsMealVegetables) {
    tone = "success";
    title = "Subir proteína y vegetales";
    detail = `La base está bien, pero hoy te conviene sumar ${
      proteinPlan?.amountLabel?.replace(/^\+/, "") || "algo de proteína"
    } y ${
      vegetablePlan?.amountLabel?.replace(/^\+/, "") || "vegetales visibles"
    }.`;
    example = [proteinPlan?.example, vegetablePlan?.example].filter(Boolean).join(" ");
    chips.push(proteinPlan?.amountLabel || "+ proteína", vegetablePlan?.amountLabel || "+ vegetales");
    projectedState = buildProjectedAdjustmentState({
      totalCalories,
      totalProtein,
      vegetableServings,
      deltas: [proteinPlan?.estimatedDelta, vegetablePlan?.estimatedDelta],
    });
  } else if (needsMealProtein) {
    tone = "success";
    title = "Agregar proteína";
    detail = proteinFocusName
      ? `Si lo repites, apunta a sumar ${proteinPlan?.amountLabel?.replace(/^\+/, "") || "algo más de proteína"}, idealmente reforzando ${proteinFocusName}.`
      : `Si lo repites, súmale ${proteinPlan?.amountLabel?.replace(/^\+/, "") || "algo más de proteína"} para cerrar mejor tu día.`;
    example = proteinPlan?.example || "";
    chips.push(proteinPlan?.amountLabel || "+ proteína", lowSatietyMeal ? "Más saciedad" : null);
    projectedState = buildProjectedAdjustmentState({
      totalCalories,
      totalProtein,
      vegetableServings,
      deltas: [proteinPlan?.estimatedDelta],
    });
  } else if (needsMealVegetables) {
    tone = "success";
    title = "Agregar vegetales";
    detail = `Este plato entraría mejor hoy con ${vegetablePlan?.amountLabel?.replace(/^\+/, "") || "una porción de vegetales"} al lado.`;
    example = vegetablePlan?.example || "";
    chips.push(vegetablePlan?.amountLabel || "+ vegetales", lowSatietyMeal ? "Más volumen" : null);
    projectedState = buildProjectedAdjustmentState({
      totalCalories,
      totalProtein,
      vegetableServings,
      deltas: [vegetablePlan?.estimatedDelta],
    });
  } else if (lowSatietyMeal) {
    tone = "info";
    title = "Hazlo más saciante";
    detail = "Para que te deje mejor, combina este plato con una fuente proteica o una porción vegetal visible.";
    example = proteinPlan?.example || "Ejemplo: agrega 1 yogurt griego o 1 porción de fruta con algo de proteína.";
    chips.push("Más saciedad", proteinPlan?.amountLabel || "+ proteína");
    projectedState = buildProjectedAdjustmentState({
      totalCalories,
      totalProtein,
      vegetableServings,
      deltas: [proteinPlan?.estimatedDelta].filter(Boolean),
    });
  } else if (macroFats === "high" && totalFat >= 18) {
    tone = "warning";
    title = "Versión un poco más liviana";
    detail = reductionPlan?.amountLabel
      ? `Hoy te conviene una versión más liviana, recortando aprox. ${reductionPlan.amountLabel.replace(/^-/, "")}.`
      : fatFocusName
      ? `Hoy te conviene una versión más liviana, reduciendo un poco ${fatFocusName}.`
      : "Hoy te conviene una versión más liviana para no seguir cargando grasas.";
    example = reductionPlan?.example || "";
    chips.push("Más liviano", reductionPlan?.amountLabel || "- extras");
    projectedState = buildProjectedAdjustmentState({
      totalCalories,
      totalProtein,
      vegetableServings,
      deltas: [reductionPlan?.estimatedDelta],
    });
  }

  return {
    tone,
    title,
    detail,
    example,
    projectedState,
    chips: chips.filter(Boolean).slice(0, 2),
  };
}

function buildRepeatableMealTemplates(meals) {
  const safeMeals = Array.isArray(meals) ? meals.filter(Boolean) : [];
  if (!safeMeals.length) return [];

  const templates = new Map();

  groupMealsForRepeatTemplates(safeMeals).forEach(({ items, key: groupKey }) => {
    const nextTemplate = buildMealTemplateCandidate(items, groupKey);
    if (!nextTemplate) return;

    const previousTemplate = templates.get(nextTemplate.signature);
    if (!previousTemplate) {
      templates.set(nextTemplate.signature, nextTemplate);
      return;
    }

    previousTemplate.occurrences += 1;
    if (nextTemplate.lastConsumedAt > previousTemplate.lastConsumedAt) {
      templates.set(nextTemplate.signature, {
        ...previousTemplate,
        ...nextTemplate,
        occurrences: previousTemplate.occurrences,
      });
    } else {
      templates.set(nextTemplate.signature, previousTemplate);
    }
  });

  return [...templates.values()].sort((left, right) => {
    if (right.occurrences !== left.occurrences) return right.occurrences - left.occurrences;
    return right.lastConsumedAt - left.lastConsumedAt;
  });
}

export default function NutritionLog({
  profileId,
  meals,
  onMealsChange,
  onDataChange,
  dailyStatus = null,
}) {
  const panelSx = (theme) => ({
    ...nutritionSurfaceSx(theme),
    p: { xs: 1.2, sm: 1.5 },
  });
  const tabsPanelSx = nutritionTabsRailSx;
  const compactTabsSx = (theme) => nutritionCompactTabsSx(theme);
  const contentFrameSx = {
    width: "100%",
    maxWidth: "100%",
    mx: 0,
  };
  const [formData, setFormData] = useState(() => createDefaultForm());
  const [draftMealItems, setDraftMealItems] = useState([]);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState(DEFAULT_CUSTOM_FOOD_FORM);
  const [registerTab, setRegisterTab] = useState(0);
  const [editingCustomFoodIdentity, setEditingCustomFoodIdentity] = useState("");
  const [selectedCustomFoodToEdit, setSelectedCustomFoodToEdit] = useState(null);
  const [showCustomRecipeForm, setShowCustomRecipeForm] = useState(false);
  const [customRecipeForm, setCustomRecipeForm] = useState(DEFAULT_RECIPE_FORM);
  const [editingMealId, setEditingMealId] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const [detailMeal, setDetailMeal] = useState(null);
  const [repeatFeedback, setRepeatFeedback] = useState("");
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const hungerToday = useMemo(() => estimateHungerFromMeals(mealsToday), [mealsToday]);
  const catalogScopeKey = `${profileId || "no-profile"}::${catalogRevision}`;
  const customFoods = useMemo(
    () => {
      void catalogScopeKey;
      return profileId ? getCustomFoods(profileId) : [];
    },
    [catalogScopeKey, profileId]
  );
  const customRecipes = useMemo(
    () => {
      void catalogScopeKey;
      return profileId ? getCustomRecipes(profileId) : [];
    },
    [catalogScopeKey, profileId]
  );
  const mealsTodayByType = useMemo(() => {
    const grouped = new Map();
    mealsToday.forEach((meal) => {
      const key = meal?.mealType || "snack";
      const current = grouped.get(key) || [];
      grouped.set(key, [...current, meal]);
    });
    return MEAL_TYPE_ORDER.map((type) => ({
      type,
      label: mealTypeLabel(type),
      items: grouped.get(type) || [],
    })).filter((block) => block.items.length > 0);
  }, [mealsToday]);
  const repeatableMealTemplates = useMemo(() => buildRepeatableMealTemplates(meals), [meals]);
  const repeatableMealsForSelectedType = useMemo(
    () =>
      repeatableMealTemplates
        .filter((template) => template.mealType === formData.mealType)
        .slice(0, 4)
        .map((template) => ({
          ...template,
          adjustment: buildFrequentMealAdjustment(template, dailyStatus),
        })),
    [repeatableMealTemplates, formData.mealType, dailyStatus]
  );
  const repeatableTodayEntriesByMealId = useMemo(() => {
    const entries = new Map();

    groupMealsForRepeatTemplates(mealsToday).forEach(({ items, key }) => {
      const template = buildMealTemplateCandidate(items, key);
      if (!template) return;

      template.items.forEach((meal, index) => {
        const mealId = String(meal?.id || `${key}-${index}`);
        entries.set(mealId, {
          template,
          isPrimary: index === 0,
        });
      });
    });

    return entries;
  }, [mealsToday]);
  const repeatTargetDate = formData.date || todayKey;
  const repeatTargetTime = formData.time || getCurrentTimeValue();
  const repeatTargetLabel =
    repeatTargetDate === todayKey
      ? `hoy ${repeatTargetTime ? `· ${repeatTargetTime}` : ""}`
      : `${formatShortDate(repeatTargetDate)}${repeatTargetTime ? ` · ${repeatTargetTime}` : ""}`;
  const foodOptions = useMemo(() => [...foodCatalog, ...customFoods], [customFoods]);
  const recipeOptions = useMemo(() => [...recipes, ...customRecipes], [customRecipes]);
  const portionOption = useMemo(
    () => getFoodPortionOption(formData.food, formData.mealType),
    [formData.food, formData.mealType]
  );

  const onChangeMealType = (event) => {
    const nextMealType = event.target.value;
    setFormData((prev) => ({
      ...prev,
      mealType: nextMealType,
      quantity: nextMealType === "bebida" ? "200" : "1",
      quantityMode:
        nextMealType === "bebida"
          ? "ml"
          : getFoodPortionOption(prev.food, nextMealType)
          ? "portion"
          : "x100g",
    }));
  };

  const onChangeBeverageType = (event) => {
    setFormData((prev) => ({ ...prev, beverageType: event.target.value }));
  };

  const onChangeQuantity = (event) => {
    setFormData((prev) => ({ ...prev, quantity: event.target.value }));
  };

  const onChangeQuantityMode = (event) => {
    setFormData((prev) => ({ ...prev, quantityMode: event.target.value }));
  };

  const onChangeDate = (event) => {
    setFormData((prev) => ({ ...prev, date: event.target.value }));
  };

  const onChangeTime = (event) => {
    setFormData((prev) => ({ ...prev, time: event.target.value }));
  };

  const onChangeFood = (_, value) => {
    setFormData((prev) => ({
      ...prev,
      food: value,
      quantityMode:
        prev.mealType === "bebida"
          ? "ml"
          : getFoodPortionOption(value, prev.mealType)
          ? "portion"
          : "x100g",
    }));
  };
  const onChangeCustomFoodField = (field) => (event) => {
    setCustomFoodForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const quantityNumber = Number(formData.quantity || 0);
  const preview = useMemo(
    () =>
      getDraftPreview(formData.food, formData.mealType, {
        value: quantityNumber,
        quantityMode: formData.quantityMode,
      }),
    [formData.food, formData.mealType, quantityNumber, formData.quantityMode]
  );
  const draftMealSummary = useMemo(() => {
    const items = draftMealItems.map((item, index) => ({
      id: `draft-${index}`,
      food: item.food,
      quantity: item.quantity,
      quantityMode: item.quantityMode || "x100g",
      preview: getDraftPreview(item.food, formData.mealType, {
        value: item.quantity,
        quantityMode: item.quantityMode || "x100g",
      }),
    }));
    const totals = items.reduce(
      (acc, item) => {
        const next = item.preview || {};
        acc.calories += Number(next.calories || 0);
        acc.protein += Number(next.protein || 0);
        acc.carbs += Number(next.carbs || 0);
        acc.fat += Number(next.fat || 0);
        acc.fiber += Number(next.fiber || 0);
        acc.sodium += Number(next.sodium || 0);
        acc.sugars += Number(next.sugars || 0);
        acc.saturatedFat += Number(next.saturatedFat || 0);
        acc.transFat += Number(next.transFat || 0);
        acc.cholesterol += Number(next.cholesterol || 0);
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodium: 0,
        sugars: 0,
        saturatedFat: 0,
        transFat: 0,
        cholesterol: 0,
      }
    );
    return { items, totals };
  }, [draftMealItems, formData.mealType]);

  const clearEntrySelection = () => {
    setFormData((prev) => ({
      ...prev,
      food: null,
      quantity: prev.mealType === "bebida" ? "200" : "1",
      quantityMode: prev.mealType === "bebida" ? "ml" : "x100g",
    }));
  };

  const addCurrentFoodToDraft = () => {
    if (!formData.food) return;
    const quantity = Number(formData.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    setDraftMealItems((prev) => [
      ...prev,
      {
        food: formData.food,
        quantity,
        quantityMode: formData.quantityMode,
      },
    ]);
    clearEntrySelection();
  };

  const saveDraftMeal = (event) => {
    if (event) event.preventDefault();
    if (!profileId) return;

    const stagedItems = [...draftMealItems];
    const quantity = Number(formData.quantity || 0);
    if (formData.food && Number.isFinite(quantity) && quantity > 0) {
      stagedItems.push({ food: formData.food, quantity, quantityMode: formData.quantityMode });
    }
    if (!stagedItems.length) return;

    const baseId = createUniqueMealBaseId(formData.date, formData.time, meals);
    const mealGroupId = `meal-${baseId}`;
    const createdMeals = stagedItems.map((item, index) =>
      createMealFromFood({
        food: item.food,
        mealType: formData.mealType,
        beverageType: formData.beverageType,
        quantity: {
          value: item.quantity,
          quantityMode: item.quantityMode || "x100g",
        },
        date: formData.date || todayKey,
        time: formData.time || getCurrentTimeValue(),
        id: `${baseId}-${index}`,
        mealGroupId,
      })
    );

    createdMeals.forEach((meal) => addMeal(profileId, meal));
    if (typeof onMealsChange === "function") {
      onMealsChange([...(Array.isArray(meals) ? meals : []), ...createdMeals]);
    }
    if (typeof onDataChange === "function") onDataChange();
    setDraftMealItems([]);
    setFormData(createDefaultForm());
  };

  const onSaveCustomFood = () => {
    if (!profileId) return;
    const name = customFoodForm.name.trim();
    if (!name) return;

    const customFood = {
      name,
      brand: customFoodForm.brand.trim(),
      category: customFoodForm.category,
      calories: Number(customFoodForm.calories || 0),
      protein: Number(customFoodForm.protein || 0),
      carbs: Number(customFoodForm.carbs || 0),
      fat: Number(customFoodForm.fat || 0),
      servingSize: customFoodForm.servingSize,
      servingsPerContainer: Number(customFoodForm.servingsPerContainer || 0),
      sodium: Number(customFoodForm.sodium || 0),
      sugars: Number(customFoodForm.sugars || 0),
      fiber: Number(customFoodForm.fiber || 0),
      saturatedFat: Number(customFoodForm.saturatedFat || 0),
      transFat: Number(customFoodForm.transFat || 0),
      cholesterol: Number(customFoodForm.cholesterol || 0),
    };

    editingCustomFoodIdentity
      ? updateCustomFood(profileId, editingCustomFoodIdentity, customFood)
      : saveCustomFood(profileId, customFood);
    setCatalogRevision((prev) => prev + 1);
    setFormData((prev) => ({ ...prev, food: customFood }));
    setCustomFoodForm(DEFAULT_CUSTOM_FOOD_FORM);
    setEditingCustomFoodIdentity("");
    setSelectedCustomFoodToEdit(null);
    setShowCustomFoodForm(false);
    if (typeof onDataChange === "function") onDataChange();
  };

  const onStartEditingCustomFood = () => {
    const selected = selectedCustomFoodToEdit;
    if (!selected) return;
    setCustomFoodForm({
      name: String(selected?.name || ""),
      brand: String(selected?.brand || ""),
      category: String(selected?.category || "processed"),
      calories: String(selected?.calories ?? ""),
      protein: String(selected?.protein ?? ""),
      carbs: String(selected?.carbs ?? ""),
      fat: String(selected?.fat ?? ""),
      servingSize: String(selected?.servingSize || ""),
      servingsPerContainer: String(selected?.servingsPerContainer ?? ""),
      sodium: String(selected?.sodium ?? ""),
      sugars: String(selected?.sugars ?? ""),
      fiber: String(selected?.fiber ?? ""),
      saturatedFat: String(selected?.saturatedFat ?? ""),
      transFat: String(selected?.transFat ?? ""),
      cholesterol: String(selected?.cholesterol ?? ""),
    });
    setEditingCustomFoodIdentity(getFoodIdentity(selected));
    setShowCustomFoodForm(true);
  };

  const onCancelEditingCustomFood = () => {
    setEditingCustomFoodIdentity("");
    setSelectedCustomFoodToEdit(null);
    setCustomFoodForm(DEFAULT_CUSTOM_FOOD_FORM);
  };

  const onChangeCustomRecipeName = (event) => {
    const value = event.target.value;
    setCustomRecipeForm((prev) => ({ ...prev, name: value }));
  };

  const onAddRecipeIngredient = () => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { food: null, grams: "100" }],
    }));
  };

  const onRemoveRecipeIngredient = (index) => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index),
    }));
  };

  const onChangeRecipeIngredientFood = (index, food) => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, idx) =>
        idx === index ? { ...item, food } : item
      ),
    }));
  };

  const onChangeRecipeIngredientGrams = (index, grams) => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, idx) =>
        idx === index ? { ...item, grams } : item
      ),
    }));
  };

  const normalizeId = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  const getFoodId = (food) => normalizeId(food?.id || food?.name);

  const foodIndex = useMemo(() => {
    const index = new Map();
    foodOptions.forEach((food) => {
      if (!food) return;
      const idKey = normalizeId(food.id);
      const nameKey = normalizeId(food.name);
      if (idKey) index.set(idKey, food);
      if (nameKey) index.set(nameKey, food);
    });
    return index;
  }, [foodOptions]);

  const addFoodsToLog = (items) => {
    if (!profileId) return;
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return;

    const createdMeals = [];
    const baseId = createUniqueMealBaseId(formData.date, formData.time, meals);
    const mealGroupId = `meal-${baseId}`;

    safeItems.forEach((item, index) => {
      const food = foodIndex.get(normalizeId(item?.foodId));
      const grams = Number(item?.grams || 0);
      const quantityMode = String(item?.quantityMode || (formData.mealType === "bebida" ? "ml" : "x100g"));
      const portionQuantity = Number(item?.quantity || 0);
      if (!food) return;

      let quantityPayload = null;

      if (quantityMode === "portion" && Number.isFinite(portionQuantity) && portionQuantity > 0) {
        quantityPayload = {
          value: Number(portionQuantity.toFixed(2)),
          quantityMode: "portion",
        };
      } else if (grams > 0) {
        const ratio = grams / 100;
        quantityPayload = {
          value: Number((formData.mealType === "bebida" ? grams : ratio).toFixed(2)),
          quantityMode: formData.mealType === "bebida" ? "ml" : "x100g",
        };
      }

      if (!quantityPayload) return;

      const meal = createMealFromFood({
        food,
        mealType: formData.mealType,
        beverageType: formData.beverageType,
        quantity: quantityPayload,
        date: formData.date || todayKey,
        time: formData.time || getCurrentTimeValue(),
        id: `${baseId}-${index}`,
        mealGroupId,
      });
      addMeal(profileId, meal);
      createdMeals.push(meal);
    });

    if (!createdMeals.length) return;
    if (typeof onMealsChange === "function") {
      onMealsChange([...(Array.isArray(meals) ? meals : []), ...createdMeals]);
    }
    if (typeof onDataChange === "function") onDataChange();
  };

  const onRepeatMealTemplate = (template, options = {}) => {
    if (!profileId) return;

    const templateItems = Array.isArray(template?.items) ? template.items : [];
    if (!templateItems.length) return;

    const targetDate = String(options?.date || repeatTargetDate || todayKey);
    const targetTime = String(options?.time || repeatTargetTime || getCurrentTimeValue());
    const consumedAt = buildMealTimestamp(targetDate, targetTime);
    const baseId = createUniqueMealBaseId(targetDate, targetTime, meals);
    const mealGroupId = `meal-${baseId}`;
    const createdMeals = templateItems.map((meal, index) => ({
      ...meal,
      id: `${baseId}-${index}`,
      mealGroupId,
      date: targetDate,
      time: targetTime,
      consumedAt,
    }));

    const nextMeals = [...(Array.isArray(meals) ? meals : []), ...createdMeals];
    saveMeals(profileId, nextMeals);

    if (typeof onMealsChange === "function") onMealsChange(nextMeals);
    if (typeof onDataChange === "function") onDataChange();

    const targetLabel = targetDate === todayKey ? "hoy" : formatShortDate(targetDate);
    const timeLabel = targetTime ? ` · ${targetTime}` : "";
    const feedbackPrefix =
      options?.feedbackPrefix || `${mealTypeLabel(template?.mealType)} repetida para `;
    setRepeatFeedback(`${feedbackPrefix}${targetLabel}${timeLabel}`);
  };

  const onQuickAddFoods = (items) => {
    if (!Array.isArray(items) || !items.length) return;
    addFoodsToLog(items);
  };

  const startEditMeal = (meal) => {
    setEditingMealId(String(meal?.id || ""));
    setEditingQuantity(String(meal?.quantity ?? 1));
  };

  const cancelEditMeal = () => {
    setEditingMealId("");
    setEditingQuantity("");
  };

  const onSaveMealEdit = (meal) => {
    if (!profileId || !meal?.id) return;
    const nextQuantity = Number(editingQuantity || 0);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return;

    const prevQuantity = Number(meal.quantity || 1);
    const factor = prevQuantity > 0 ? nextQuantity / prevQuantity : 1;
    const round2 = (value) => Number((Number(value || 0) * factor).toFixed(2));

    const nextMeals = (Array.isArray(meals) ? meals : []).map((item) => {
      if (String(item?.id) !== String(meal.id)) return item;
      const nextGrams = item?.grams ? Number((Number(item.grams) * factor).toFixed(2)) : item?.grams;
      return {
        ...item,
        quantity: Number(nextQuantity.toFixed(2)),
        grams: nextGrams,
        calories: round2(item.calories),
        protein: round2(item.protein),
        carbs: round2(item.carbs),
        fat: round2(item.fat),
        sodium: round2(item.sodium),
        sugars: round2(item.sugars),
        fiber: round2(item.fiber),
        saturatedFat: round2(item.saturatedFat),
        transFat: round2(item.transFat),
        cholesterol: round2(item.cholesterol),
      };
    });

    saveMeals(profileId, nextMeals);
    if (typeof onMealsChange === "function") onMealsChange(nextMeals);
    if (typeof onDataChange === "function") onDataChange();
    cancelEditMeal();
  };

  const onDeleteMeal = (mealId) => {
    if (!profileId || !mealId) return;
    const nextMeals = deleteMeal(profileId, mealId);
    if (typeof onMealsChange === "function") onMealsChange(nextMeals);
    if (typeof onDataChange === "function") onDataChange();
    if (String(editingMealId) === String(mealId)) cancelEditMeal();
    if (String(detailMeal?.id) === String(mealId)) setDetailMeal(null);
  };

  const onSaveCustomRecipe = () => {
    if (!profileId) return;
    const name = customRecipeForm.name.trim();
    if (!name) return;

    const ingredients = customRecipeForm.ingredients
      .map((item) => {
        const grams = Number(item?.grams || 0);
        if (!item?.food || grams <= 0) return null;
        return { foodId: getFoodId(item.food), grams };
      })
      .filter(Boolean);

    if (!ingredients.length) return;

    const recipe = {
      id: `custom_${normalizeId(name)}`,
      name,
      ingredients,
    };

    saveCustomRecipe(profileId, recipe);
    setCatalogRevision((prev) => prev + 1);
    setCustomRecipeForm(DEFAULT_RECIPE_FORM);
    setShowCustomRecipeForm(false);
    if (typeof onDataChange === "function") onDataChange();
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={panelSx}>
        <Typography variant="h6">Registro de comidas</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ingresa rápido alimentos, usa recetas y administra tu catálogo personalizado.
        </Typography>
      </Box>

      <Box sx={tabsPanelSx}>
        <Tabs
          value={registerTab}
          onChange={(_, value) => setRegisterTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={compactTabsSx}
        >
          <Tab label={nutritionTabLabelDot("primary.main", "Ingreso")} />
          <Tab label={nutritionTabLabelDot("warning.main", "Rápidas")} />
          <Tab label={nutritionTabLabelDot("success.main", "Alimentos")} />
          <Tab label={nutritionTabLabelDot("secondary.main", "Recetas")} />
          <Tab label={nutritionTabLabelDot("info.main", "Hoy")} />
        </Tabs>
      </Box>

      {registerTab === 1 && (
        <Box sx={(theme) => ({ ...panelSx(theme), ...contentFrameSx, display: "grid", gap: 2 })}>
          <RecipeSelector onAddFoods={addFoodsToLog} recipes={recipeOptions} catalog={foodOptions} />
          <QuickFoodInput
            onAddFoods={onQuickAddFoods}
            recipes={recipeOptions}
            foodCatalog={foodOptions}
          />
        </Box>
      )}

      {registerTab === 3 && (
        <Box sx={(theme) => ({ ...panelSx(theme), ...contentFrameSx })}>
        <Button
          type="button"
          variant="text"
          onClick={() => setShowCustomRecipeForm((prev) => !prev)}
          disabled={!profileId}
        >
          + Crear receta
        </Button>
        </Box>
      )}

      {registerTab === 3 && showCustomRecipeForm && (
        <Box sx={(theme) => ({ ...panelSx(theme), ...contentFrameSx, display: "grid", gap: 1.5 })}>
          <Typography variant="subtitle1">Nueva receta personalizada</Typography>
          <TextField
            label="Nombre de la receta"
            value={customRecipeForm.name}
            onChange={onChangeCustomRecipeName}
            fullWidth
          />
          {customRecipeForm.ingredients.map((item, index) => (
            <Stack key={`recipe-ingredient-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Autocomplete
                options={foodOptions}
                value={item.food}
                onChange={(_, value) => onChangeRecipeIngredientFood(index, value)}
                getOptionLabel={(option) => option?.name || ""}
                isOptionEqualToValue={(option, value) =>
                  option?.name === value?.name && option?.category === value?.category
                }
                renderInput={(params) => <TextField {...params} label="Ingrediente" fullWidth />}
                sx={{ flex: 1 }}
              />
              <TextField
                type="number"
                label="Gramos"
                value={item.grams}
                onChange={(event) => onChangeRecipeIngredientGrams(index, event.target.value)}
                inputProps={{ min: 1, step: 1 }}
                sx={{ width: { xs: "100%", sm: 140 } }}
              />
              <Button
                type="button"
                variant="outlined"
                color="error"
                onClick={() => onRemoveRecipeIngredient(index)}
                disabled={customRecipeForm.ingredients.length <= 1}
              >
                Quitar
              </Button>
            </Stack>
          ))}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button type="button" variant="outlined" onClick={onAddRecipeIngredient}>
              Agregar ingrediente
            </Button>
            <Button type="button" variant="contained" onClick={onSaveCustomRecipe}>
              Guardar receta
            </Button>
          </Stack>
        </Box>
      )}
      {(registerTab === 0 || registerTab === 2) && (
      <Box
        component="form"
        onSubmit={saveDraftMeal}
        sx={(theme) => ({ ...panelSx(theme), ...contentFrameSx, display: "grid", gap: 2 })}
      >
        {registerTab === 0 && (
        <>
        <FormControl fullWidth>
          <InputLabel id="meal-type-label">Tipo de comida</InputLabel>
          <Select
            labelId="meal-type-label"
            label="Tipo de comida"
            value={formData.mealType}
            onChange={onChangeMealType}
          >
            <MenuItem value="desayuno">Desayuno</MenuItem>
            <MenuItem value="almuerzo">Almuerzo</MenuItem>
            <MenuItem value="cena">Cena</MenuItem>
            <MenuItem value="snack">Snack</MenuItem>
            <MenuItem value="bebida">Bebida</MenuItem>
          </Select>
        </FormControl>

        {formData.mealType === "bebida" && (
          <FormControl fullWidth>
            <InputLabel id="beverage-type-label">Tipo de bebida</InputLabel>
            <Select
              labelId="beverage-type-label"
              label="Tipo de bebida"
              value={formData.beverageType}
              onChange={onChangeBeverageType}
            >
              {BEVERAGE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {beverageTypeLabel(type)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Autocomplete
          options={foodOptions}
          value={formData.food}
          onChange={onChangeFood}
          getOptionLabel={(option) =>
            option?.brand ? `${option?.name || ""} · ${option.brand}` : option?.name || ""
          }
          isOptionEqualToValue={(option, value) =>
            option?.name === value?.name &&
            option?.brand === value?.brand &&
            option?.category === value?.category
          }
          renderOption={(props, option) => (
            <li {...props} key={`${option.name}-${option.brand || "no-brand"}-${option.category}`}>
              {option.name}
              {option?.brand ? ` · ${option.brand}` : ""}
              {` (${option.category})`}
            </li>
          )}
          renderInput={(params) => <TextField {...params} label="Alimento" fullWidth />}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            type="date"
            label="Fecha de ingesta"
            value={formData.date}
            onChange={onChangeDate}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            type="time"
            label="Hora de ingesta"
            value={formData.time}
            onChange={onChangeTime}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            p: 1.15,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "grid", gap: 0.35 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Repetir {mealTypeLabel(formData.mealType).toLowerCase()} frecuente
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Usa la fecha y hora elegidas arriba y guarda el plato completo sin volver a ingresarlo.
              </Typography>
            </Box>
            <Chip
              size="small"
              variant="outlined"
              label={`Destino: ${repeatTargetLabel}`}
              sx={{ maxWidth: "100%" }}
            />
          </Box>
          {repeatFeedback ? (
            <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600 }}>
              {repeatFeedback}
            </Typography>
          ) : null}
          {repeatableMealsForSelectedType.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
                gap: 1,
              }}
            >
              {repeatableMealsForSelectedType.map((template) => {
                const itemNames = template.items
                  .slice(0, 3)
                  .map((item) => item?.name)
                  .filter(Boolean);
                const extraItems = Math.max(0, template.items.length - itemNames.length);
                const adjustment = template.adjustment;
                const adjustmentTone = adjustment?.tone || "info";
                const adjustmentPalette =
                  adjustmentTone === "warning"
                    ? {
                        background: "rgba(245,158,11,0.12)",
                        border: "rgba(245,158,11,0.22)",
                        chip: "warning",
                      }
                    : adjustmentTone === "success"
                    ? {
                        background: "rgba(34,197,94,0.10)",
                        border: "rgba(34,197,94,0.18)",
                        chip: "success",
                      }
                    : {
                        background: "rgba(59,130,246,0.08)",
                        border: "rgba(59,130,246,0.16)",
                        chip: "info",
                      };

                return (
                  <Box
                    key={`${template.sourceGroupId}-${template.lastConsumedAt}`}
                    sx={{
                      display: "grid",
                      gap: 0.8,
                      p: 1,
                      borderRadius: 1.8,
                      border: "1px solid rgba(148,163,184,0.18)",
                      bgcolor: "rgba(15,23,42,0.03)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 0.8,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "grid", gap: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {itemNames.join(" · ")}
                          {extraItems > 0 ? ` +${extraItems}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Última vez {formatShortDate(template.lastDate)}
                          {template.lastTime ? ` · ${template.lastTime}` : ""}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={
                          template.occurrences > 1
                            ? `${template.occurrences} veces`
                            : "Reciente"
                        }
                        color={template.occurrences > 1 ? "success" : "default"}
                        variant={template.occurrences > 1 ? "filled" : "outlined"}
                      />
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                      <Chip size="small" variant="outlined" label={`${Math.round(template.totals.calories)} kcal`} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${Number(template.totals.protein || 0).toFixed(1)} g prot.`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${template.items.length} ${template.items.length === 1 ? "ítem" : "ítems"}`}
                      />
                    </Box>
                    {adjustment ? (
                      <Box
                        sx={{
                          display: "grid",
                          gap: 0.5,
                          p: 0.9,
                          borderRadius: 1.6,
                          bgcolor: adjustmentPalette.background,
                          border: `1px solid ${adjustmentPalette.border}`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}
                        >
                          Ajuste sugerido
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {adjustment.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {adjustment.detail}
                        </Typography>
                        {adjustment.example ? (
                          <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 600 }}>
                            {adjustment.example}
                          </Typography>
                        ) : null}
                        {adjustment.projectedState ? (
                          <Box sx={{ display: "grid", gap: 0.4 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                              Quedaría aprox.
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}>
                              <Chip
                                size="small"
                                label={`${Math.round(adjustment.projectedState.calories)} kcal`}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={`${Number(adjustment.projectedState.protein || 0).toFixed(1)} g prot.`}
                                variant="outlined"
                              />
                              {adjustment.projectedState.vegetableServings >= 0.5 ? (
                                <Chip
                                  size="small"
                                  label={`${formatVegetableServingsLabel(adjustment.projectedState.vegetableServings)} veg.`}
                                  variant="outlined"
                                />
                              ) : null}
                            </Box>
                          </Box>
                        ) : null}
                        {adjustment.chips?.length ? (
                          <Box sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}>
                            {adjustment.chips.map((chip) => (
                              <Chip
                                key={`${template.sourceGroupId}-${chip}`}
                                size="small"
                                label={chip}
                                color={adjustmentPalette.chip}
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        ) : null}
                      </Box>
                    ) : null}
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        onClick={() => onRepeatMealTemplate(template)}
                        disabled={!profileId}
                      >
                        Repetir comida
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Aún no hay {mealTypeLabel(formData.mealType).toLowerCase()}s recientes para repetir. Cuando repitas uno un par de veces aparecerá aquí.
            </Typography>
          )}
        </Box>
        </>
        )}

        {registerTab === 2 && (
        <>
        <Typography variant="subtitle1">Crear o editar alimentos personalizados</Typography>
        <Box>
          <Button
            type="button"
            variant="text"
            onClick={() => {
              setShowCustomFoodForm((prev) => !prev);
              if (showCustomFoodForm) onCancelEditingCustomFood();
            }}
            disabled={!profileId}
          >
            + Crear alimento
          </Button>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <Autocomplete
            options={customFoods}
            value={selectedCustomFoodToEdit}
            onChange={(_, value) => setSelectedCustomFoodToEdit(value)}
            getOptionLabel={(option) =>
              option?.brand ? `${option?.name || ""} · ${option.brand}` : option?.name || ""
            }
            isOptionEqualToValue={(option, value) =>
              option?.name === value?.name &&
              option?.brand === value?.brand &&
              option?.category === value?.category
            }
            renderInput={(params) => <TextField {...params} label="Editar alimento creado" fullWidth />}
            sx={{ flex: 1 }}
          />
          <Button
            type="button"
            variant="outlined"
            onClick={onStartEditingCustomFood}
            disabled={!profileId || !selectedCustomFoodToEdit}
          >
            Editar alimento
          </Button>
        </Stack>
        </>
        )}

        {showCustomFoodForm && (
          <Box sx={(theme) => ({ ...panelSx(theme), display: "grid", gap: 1.5, bgcolor: "transparent" })}>
            <Typography variant="subtitle2">
              {editingCustomFoodIdentity ? "Editando alimento personalizado" : "Nuevo alimento personalizado"}
            </Typography>
            <TextField
              label="Nombre"
              value={customFoodForm.name}
              onChange={onChangeCustomFoodField("name")}
              fullWidth
            />
            <TextField
              label="Marca (opcional)"
              value={customFoodForm.brand}
              onChange={onChangeCustomFoodField("brand")}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="custom-food-category-label">Categoria</InputLabel>
              <Select
                labelId="custom-food-category-label"
                label="Categoria"
                value={customFoodForm.category}
                onChange={onChangeCustomFoodField("category")}
              >
                {FOOD_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Calorias"
                value={customFoodForm.calories}
                onChange={onChangeCustomFoodField("calories")}
                fullWidth
              />
              <TextField
                type="number"
                label="Proteina"
                value={customFoodForm.protein}
                onChange={onChangeCustomFoodField("protein")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Carbohidratos"
                value={customFoodForm.carbs}
                onChange={onChangeCustomFoodField("carbs")}
                fullWidth
              />
              <TextField
                type="number"
                label="Grasas"
                value={customFoodForm.fat}
                onChange={onChangeCustomFoodField("fat")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Porción (ej: 45 g)"
                value={customFoodForm.servingSize}
                onChange={onChangeCustomFoodField("servingSize")}
                fullWidth
              />
              <TextField
                type="number"
                label="Porciones por envase"
                value={customFoodForm.servingsPerContainer}
                onChange={onChangeCustomFoodField("servingsPerContainer")}
                fullWidth
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Admite formatos como `45 g`, `1 unidad` o `1 rebanada`. Si no agregas gramos, los macros se interpretan por porción.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Sodio (mg)"
                value={customFoodForm.sodium}
                onChange={onChangeCustomFoodField("sodium")}
                fullWidth
              />
              <TextField
                type="number"
                label="Azúcares (g)"
                value={customFoodForm.sugars}
                onChange={onChangeCustomFoodField("sugars")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Fibra (g)"
                value={customFoodForm.fiber}
                onChange={onChangeCustomFoodField("fiber")}
                fullWidth
              />
              <TextField
                type="number"
                label="Grasa saturada (g)"
                value={customFoodForm.saturatedFat}
                onChange={onChangeCustomFoodField("saturatedFat")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Grasa trans (g)"
                value={customFoodForm.transFat}
                onChange={onChangeCustomFoodField("transFat")}
                fullWidth
              />
              <TextField
                type="number"
                label="Colesterol (mg)"
                value={customFoodForm.cholesterol}
                onChange={onChangeCustomFoodField("cholesterol")}
                fullWidth
              />
            </Stack>
            <Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button type="button" variant="outlined" onClick={onSaveCustomFood}>
                  {editingCustomFoodIdentity ? "Actualizar alimento" : "Guardar alimento personalizado"}
                </Button>
                {editingCustomFoodIdentity && (
                  <Button type="button" variant="text" onClick={onCancelEditingCustomFood}>
                    Cancelar edición
                  </Button>
                )}
              </Stack>
            </Box>
          </Box>
        )}

        {registerTab === 0 && (
        <>
        <TextField
          type="number"
          label={
            formData.mealType === "bebida"
              ? "Cantidad"
              : formData.quantityMode === "portion"
              ? `Cantidad (${portionOption?.label || "porción"})`
              : "Cantidad (x100 g)"
          }
          value={formData.quantity}
          onChange={onChangeQuantity}
          inputProps={{
            min: formData.mealType === "bebida" ? 10 : 0.1,
            step: formData.mealType === "bebida" ? 10 : 0.1,
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {formData.mealType === "bebida"
                  ? "ml"
                  : formData.quantityMode === "portion"
                  ? portionOption?.label || "porción"
                  : "x100 g"}
              </InputAdornment>
            ),
          }}
          fullWidth
        />
        {formData.mealType !== "bebida" && portionOption && (
          <FormControl fullWidth>
            <InputLabel id="quantity-mode-label">Modo de cantidad</InputLabel>
            <Select
              labelId="quantity-mode-label"
              label="Modo de cantidad"
              value={formData.quantityMode}
              onChange={onChangeQuantityMode}
            >
              <MenuItem value="portion">{portionOption.description || portionOption.label}</MenuItem>
              <MenuItem value="x100g">x100 g</MenuItem>
            </Select>
          </FormControl>
        )}

        {draftMealItems.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gap: 1,
              p: 1.2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Plato en preparación
            </Typography>
            <Box sx={{ display: "grid", gap: 0.8 }}>
              {draftMealSummary.items.map((item, index) => (
                <Box
                  key={`draft-item-${index}`}
                  sx={{
                    display: "grid",
                    gap: 0.7,
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "rgba(15,23,42,0.04)",
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                    <Box sx={{ display: "grid", gap: 0.18 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.food?.name}
                        {item.food?.brand ? ` · ${item.food.brand}` : ""} ({item.quantity} {item.preview?.unit || (formData.mealType === "bebida" ? "ml" : "x100 g")})
                      </Typography>
                      {item.preview?.quantityMode === "portion" && item.preview?.portionDescription ? (
                        <Typography variant="caption" color="text.secondary">
                          Base: {item.preview.portionDescription}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(event) =>
                          setDraftMealItems((prev) =>
                            prev.map((draftItem, itemIndex) =>
                              itemIndex === index
                                ? { ...draftItem, quantity: event.target.value }
                                : draftItem
                            )
                          )
                        }
                        inputProps={{ min: 0.1, step: 0.1 }}
                        sx={{ width: 88 }}
                      />
                      <Button
                        type="button"
                        size="small"
                        color="error"
                        onClick={() =>
                          setDraftMealItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        Quitar
                      </Button>
                    </Stack>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                        xl: "repeat(5, minmax(0, 1fr))",
                      },
                      gap: 0.8,
                    }}
                  >
                    <Box sx={{ p: 0.8, borderRadius: 1.2, bgcolor: "rgba(15,118,110,0.08)" }}>
                      <Typography variant="caption" color="text.secondary">Calorías</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Math.round(item.preview?.calories || 0)} kcal</Typography>
                    </Box>
                    <Box sx={{ p: 0.8, borderRadius: 1.2, bgcolor: "rgba(15,23,42,0.04)" }}>
                      <Typography variant="caption" color="text.secondary">Proteína</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(item.preview?.protein || 0).toFixed(1)} g</Typography>
                    </Box>
                    <Box sx={{ p: 0.8, borderRadius: 1.2, bgcolor: "rgba(15,23,42,0.04)" }}>
                      <Typography variant="caption" color="text.secondary">Carbs</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(item.preview?.carbs || 0).toFixed(1)} g</Typography>
                    </Box>
                    <Box sx={{ p: 0.8, borderRadius: 1.2, bgcolor: "rgba(15,23,42,0.04)" }}>
                      <Typography variant="caption" color="text.secondary">Grasas</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(item.preview?.fat || 0).toFixed(1)} g</Typography>
                    </Box>
                    <Box sx={{ p: 0.8, borderRadius: 1.2, bgcolor: "rgba(15,23,42,0.04)" }}>
                      <Typography variant="caption" color="text.secondary">Fibra</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(item.preview?.fiber || 0).toFixed(1)} g</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 0.9,
                p: 1.1,
                borderRadius: 1.7,
                bgcolor: "rgba(15,118,110,0.08)",
                border: "1px solid rgba(45,212,191,0.2)",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Total del plato
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(3, minmax(0, 1fr))",
                    xl: "repeat(5, minmax(0, 1fr))",
                  },
                  gap: 0.8,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">Calorías</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{Math.round(draftMealSummary.totals.calories)} kcal</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Proteína</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{draftMealSummary.totals.protein.toFixed(1)} g</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Carbohidratos</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{draftMealSummary.totals.carbs.toFixed(1)} g</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Grasas</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{draftMealSummary.totals.fat.toFixed(1)} g</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fibra</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{draftMealSummary.totals.fiber.toFixed(1)} g</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap" }}>
                <Typography variant="caption" color="text.secondary">Sodio {Math.round(draftMealSummary.totals.sodium)} mg</Typography>
                <Typography variant="caption" color="text.secondary">Azúcares {draftMealSummary.totals.sugars.toFixed(1)} g</Typography>
                <Typography variant="caption" color="text.secondary">Sat. {draftMealSummary.totals.saturatedFat.toFixed(1)} g</Typography>
                <Typography variant="caption" color="text.secondary">Col. {Math.round(draftMealSummary.totals.cholesterol)} mg</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {preview && (
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              p: 1.3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Vista previa nutricional
            </Typography>
            {preview.quantityMode === "portion" && preview.portionDescription ? (
              <Typography variant="caption" color="text.secondary">
                Porción base: {preview.portionDescription}
              </Typography>
            ) : null}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  xl: "repeat(5, minmax(0, 1fr))",
                },
                gap: 1,
              }}
            >
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,118,110,0.08)" }}>
                <Typography variant="caption" color="text.secondary">Calorías</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.calories} kcal</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Proteína</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.protein} g</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Carbohidratos</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.carbs} g</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Grasas</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.fat} g</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Fibra</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.fiber} g</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  xl: "repeat(5, minmax(0, 1fr))",
                },
                gap: 1,
              }}
            >
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Sodio</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.sodium} mg</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Azúcares</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.sugars} g</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Grasa saturada</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.saturatedFat} g</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Grasa trans</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.transFat} g</Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(15,23,42,0.04)" }}>
                <Typography variant="caption" color="text.secondary">Colesterol</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{preview.cholesterol} mg</Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Esta vista previa usa la cantidad seleccionada y es exactamente lo que se guardará para sumar en los KPIs diarios.
            </Typography>
          </Box>
        )}

        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Button
              type="button"
              variant="outlined"
              disabled={!profileId || !formData.food}
              onClick={addCurrentFoodToDraft}
            >
              Agregar alimento al plato
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!profileId || (!formData.food && !draftMealItems.length)}
            >
              Guardar comida
            </Button>
          </Stack>
        </Box>
        </>
        )}
      </Box>
      )}

      <Box sx={{ display: "grid", gap: 1 }}>
        <Box
          sx={{
            p: 1.2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "background.paper",
            display: "grid",
            gap: 0.8,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Índice de saciedad del día
          </Typography>
          {hungerToday.hasData ? (
            <>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={`Saciedad: ${hungerToday.satietyLevel}`}
                  color={
                    hungerToday.satietyLevel === "high"
                      ? "success"
                      : hungerToday.satietyLevel === "medium"
                      ? "warning"
                      : "error"
                  }
                />
                <Chip size="small" variant="outlined" label={`Hambre: ${hungerToday.hungerLevel}`} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Score {hungerToday.satietyScore} · Ventana de hambre {hungerToday.windowText} · Próxima:{" "}
                {hungerToday.nextHungerText}
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Aún no hay comidas registradas hoy para estimar saciedad.
            </Typography>
          )}
        </Box>
        <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Comidas de hoy
        </Typography>
        {repeatFeedback ? (
          <Typography
            variant="caption"
            sx={{ display: "block", mb: 0.8, color: "success.dark", fontWeight: 600 }}
          >
            {repeatFeedback}
          </Typography>
        ) : null}
        {mealsToday.length === 0 ? (
          <Box
            sx={{
              p: 1.4,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Sin comidas registradas hoy. Agrega tu primera comida desde "Ingreso de alimentos".
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {mealsTodayByType.map((block) => (
              <Box
                key={block.type}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: 1,
                  backgroundColor: "background.paper",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.6 }}>
                  {block.label}
                </Typography>
                <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1 }}>
                  {block.items.map((meal) => {
                    const contribution = getMealContributionValues(meal);
                    const isEditing = String(editingMealId) === String(meal.id);
                    const repeatEntry = repeatableTodayEntriesByMealId.get(String(meal?.id || ""));
                    return (
                      <Box
                        key={`${meal.id}-mobile`}
                        sx={{
                          p: 1.2,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.72)",
                          display: "grid",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: "grid", gap: 0.35 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                            {meal.name}
                            {meal?.brand ? ` · ${meal.brand}` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {meal?.mealType === "bebida" && meal?.beverageType
                              ? beverageTypeLabel(meal.beverageType)
                              : mealTypeLabel(meal?.mealType)}
                            {meal?.quantity && meal?.unit ? ` · ${meal.quantity} ${meal.unit}` : ""}
                          </Typography>
                          {meal?.quantityMode === "portion" && formatMealPortionMeta(meal) ? (
                            <Typography variant="caption" color="text.secondary">
                              Base: {formatMealPortionMeta(meal)}
                            </Typography>
                          ) : null}
                        </Box>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 0.8,
                          }}
                        >
                          <Chip size="small" label={`${contribution.calories} kcal`} />
                          <Chip size="small" label={`${contribution.protein} g prot.`} />
                          <Chip size="small" label={`${contribution.carbs} g carb.`} />
                          <Chip size="small" label={`${contribution.fat} g grasa`} />
                        </Box>
                        {isEditing ? (
                          <Stack spacing={0.8}>
                            <TextField
                              type="number"
                              label={meal?.unit === "ml" ? "ml" : "Cantidad"}
                              size="small"
                              value={editingQuantity}
                              onChange={(event) => setEditingQuantity(event.target.value)}
                              inputProps={{
                                min: meal?.unit === "ml" ? 10 : 0.1,
                                step: meal?.unit === "ml" ? 10 : 0.1,
                              }}
                            />
                            <Stack direction="row" spacing={0.7} flexWrap="wrap">
                              <Button type="button" size="small" variant="contained" onClick={() => onSaveMealEdit(meal)}>
                                Guardar
                              </Button>
                              <Button type="button" size="small" variant="text" onClick={cancelEditMeal}>
                                Cancelar
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.6} flexWrap="wrap">
                            {repeatEntry?.isPrimary ? (
                              <Button
                                type="button"
                                size="small"
                                variant="text"
                                onClick={() =>
                                  onRepeatMealTemplate(repeatEntry.template, {
                                    date: todayKey,
                                    time: getCurrentTimeValue(),
                                    feedbackPrefix: "Comida repetida para ",
                                  })
                                }
                              >
                                Repetir comida
                              </Button>
                            ) : null}
                            <Button type="button" size="small" variant="text" onClick={() => setDetailMeal(meal)}>
                              Detalle
                            </Button>
                            <Button type="button" size="small" variant="text" onClick={() => startEditMeal(meal)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => onDeleteMeal(meal.id)}
                            >
                              Eliminar
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Box>
                <Box sx={{ overflowX: "auto", display: { xs: "none", sm: "block" } }}>
                  <Table size="small" sx={{ minWidth: 760, tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "34%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "22%" }} />
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: "34%" }}>Alimento</TableCell>
                        <TableCell align="right" sx={{ width: "11%", whiteSpace: "nowrap" }}>
                          Calorías
                        </TableCell>
                        <TableCell align="right" sx={{ width: "11%", whiteSpace: "nowrap" }}>
                          Proteínas
                        </TableCell>
                        <TableCell align="right" sx={{ width: "11%", whiteSpace: "nowrap" }}>
                          Carbohidratos
                        </TableCell>
                        <TableCell align="right" sx={{ width: "11%", whiteSpace: "nowrap" }}>
                          Grasas
                        </TableCell>
                        <TableCell align="right" sx={{ width: "22%", whiteSpace: "nowrap" }}>
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                  {block.items.map((meal) => (
                    <TableRow key={meal.id}>
                      {(() => {
                        const contribution = getMealContributionValues(meal);
                        const repeatEntry = repeatableTodayEntriesByMealId.get(String(meal?.id || ""));
                        return (
                          <>
                            <TableCell sx={{ width: "34%" }}>
                              <Box sx={{ display: "grid", gap: 0.18 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {meal.name}
                                  {meal?.brand ? ` · ${meal.brand}` : ""}
                                  {meal?.mealType === "bebida" && meal?.beverageType
                                    ? ` · ${beverageTypeLabel(meal.beverageType)}`
                                    : ""}
                                  {meal?.quantity && meal?.unit ? ` (${meal.quantity} ${meal.unit})` : ""}
                                </Typography>
                                {meal?.quantityMode === "portion" && formatMealPortionMeta(meal) ? (
                                  <Typography variant="caption" color="text.secondary">
                                    Base: {formatMealPortionMeta(meal)}
                                  </Typography>
                                ) : null}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ width: "11%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.calories} kcal
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ width: "11%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.protein} g
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ width: "11%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.carbs} g
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ width: "11%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.fat} g
                            </TableCell>
                            <TableCell align="right" sx={{ width: "22%" }}>
                              {String(editingMealId) === String(meal.id) ? (
                                <Stack direction="row" spacing={0.7} sx={{ justifyContent: "flex-end" }}>
                                  <TextField
                                    type="number"
                                    label={meal?.unit === "ml" ? "ml" : "Cant."}
                                    size="small"
                                    value={editingQuantity}
                                    onChange={(event) => setEditingQuantity(event.target.value)}
                                    inputProps={{
                                      min: meal?.unit === "ml" ? 10 : 0.1,
                                      step: meal?.unit === "ml" ? 10 : 0.1,
                                    }}
                                    sx={{ width: 95 }}
                                  />
                                  <Button type="button" size="small" variant="contained" onClick={() => onSaveMealEdit(meal)}>
                                    Guardar
                                  </Button>
                                  <Button type="button" size="small" variant="text" onClick={cancelEditMeal}>
                                    Cancelar
                                  </Button>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={0.7} sx={{ justifyContent: "flex-end" }}>
                                  {repeatEntry?.isPrimary ? (
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="text"
                                      onClick={() =>
                                        onRepeatMealTemplate(repeatEntry.template, {
                                          date: todayKey,
                                          time: getCurrentTimeValue(),
                                          feedbackPrefix: "Comida repetida para ",
                                        })
                                      }
                                    >
                                      Repetir comida
                                    </Button>
                                  ) : null}
                                  <Button
                                    type="button"
                                    size="small"
                                    variant="text"
                                    onClick={() => setDetailMeal(meal)}
                                  >
                                    Detalle
                                  </Button>
                                  <Button type="button" size="small" variant="text" onClick={() => startEditMeal(meal)}>
                                    Editar
                                  </Button>
                                  <Button
                                    type="button"
                                    size="small"
                                    color="error"
                                    variant="text"
                                    onClick={() => onDeleteMeal(meal.id)}
                                  >
                                    Eliminar
                                  </Button>
                                </Stack>
                              )}
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      </Box>
      <FoodDetailDrawer
        open={Boolean(detailMeal)}
        onClose={() => setDetailMeal(null)}
        meal={detailMeal}
      />
    </Box>
  );
}
