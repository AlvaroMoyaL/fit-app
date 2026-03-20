import { Suspense, lazy, useMemo, useState } from "react";

import { Box, Tabs, Tab, Typography } from "@mui/material";

import NutritionDashboard from "./NutritionDashboard";
import NutritionSectionNav from "./NutritionSectionNav";
import NutritionAlerts from "./NutritionAlerts";
import NutritionInsights from "./NutritionInsights";
import AdaptiveMealSuggestions from "./AdaptiveMealSuggestions";
import CorrectiveDayPlan from "./CorrectiveDayPlan";
import NextDayRecoveryCard from "./NextDayRecoveryCard";
import { nutritionHeroSx, nutritionSurfaceSx } from "./nutritionUi";
import calculateDailyNutritionScore from "../../utils/dailyNutritionScore";
import analyzeMacroBalance from "../../utils/macroAnalyzer";
import analyzeProteinIntake from "../../utils/proteinAnalyzer";
import trackVegetableIntake from "../../utils/vegetableTracker";
import generateNutritionAlerts from "../../utils/nutritionAlerts";
import { getMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateTDEEDynamic } from "../../utils/metabolism";
import { estimateHungerFromMeals } from "../../utils/hungerEstimate";

const SmartFoodInput = lazy(() => import("./SmartFoodInput"));
const CookWithWhatIHave = lazy(() => import("./CookWithWhatIHave"));
const CasinoMealEvaluator = lazy(() => import("./CasinoMealEvaluator"));
const ShoppingList = lazy(() => import("./ShoppingList"));

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeString(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getFirstFiniteNumber(...values) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return 0;
}

function findFiniteNumber(...values) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return undefined;
}

function formatDateKey(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferMealTiming() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 23) return "dinner";
  return "snack";
}

function inferMealTypeFromTime(entry) {
  const timeValue = safeString(entry?.time || entry?.loggedTime || entry?.consumedTime);
  const consumedAt = safeNumber(entry?.consumedAt || entry?.timestamp || entry?.createdAt, 0);

  let hour = -1;

  if (timeValue) {
    const parsedHour = Number(timeValue.split(":")[0]);
    if (Number.isFinite(parsedHour)) {
      hour = parsedHour;
    }
  } else if (consumedAt > 0) {
    hour = new Date(consumedAt).getHours();
  }

  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 23) return "dinner";
  if (hour >= 0) return "snack";
  return "";
}

function normalizeMealType(value, entry) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const aliases = {
    desayuno: "breakfast",
    breakfast: "breakfast",
    desayuno_pm: "breakfast",
    almuerzo: "lunch",
    lunch: "lunch",
    comida: "lunch",
    lunch_box: "lunch",
    cena: "dinner",
    dinner: "dinner",
    supper: "dinner",
    once: "dinner",
    snack: "snack",
    colacion: "snack",
    merienda: "snack",
    tentempie: "snack",
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  if (
    normalized === "breakfast" ||
    normalized === "lunch" ||
    normalized === "dinner" ||
    normalized === "snack"
  ) {
    return normalized;
  }

  return inferMealTypeFromTime(entry) || "snack";
}

function getVegetableStatus(servings) {
  if (servings >= 4) return "excellent";
  if (servings >= 3) return "good";
  if (servings >= 2) return "acceptable";
  if (servings >= 1) return "low";
  return "very_low";
}

function normalizeDateValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const parsed = formatDateKey(value);
  return parsed || "";
}

function getMealEntryDate(entry, fallbackDate = "") {
  return (
    normalizeDateValue(entry?.date) ||
    normalizeDateValue(entry?.day) ||
    normalizeDateValue(entry?.loggedDate) ||
    normalizeDateValue(entry?.consumedDate) ||
    normalizeDateValue(entry?.timestamp) ||
    normalizeDateValue(entry?.consumedAt) ||
    normalizeDateValue(entry?.createdAt) ||
    safeString(fallbackDate)
  );
}

function getMealEntryVegetableServings(entry) {
  const nutrition = isObject(entry?.nutrition) ? entry.nutrition : {};
  const servings = getFirstFiniteNumber(
    entry?.vegetableServings,
    entry?.vegetables,
    entry?.vegetableCount,
    entry?.vegetablePortions,
    entry?.veggieServings,
    nutrition?.vegetableServings,
    nutrition?.vegetables
  );

  if (servings > 0) return servings;
  return safeNumber(trackVegetableIntake([entry]).servings, 0);
}

function normalizeMealEntry(entry, fallbackDate = "") {
  if (!isObject(entry)) return null;

  const nutrition = isObject(entry?.nutrition) ? entry.nutrition : {};
  const macros = isObject(entry?.macros) ? entry.macros : {};
  const totals = isObject(entry?.totals) ? entry.totals : {};

  const normalizedMeal = {
    date: getMealEntryDate(entry, fallbackDate),
    type: normalizeMealType(
      entry?.mealType || entry?.type || entry?.slot || entry?.meal || entry?.category,
      entry
    ),
    calories: getFirstFiniteNumber(
      entry?.calories,
      entry?.caloriesConsumed,
      entry?.kcal,
      entry?.energy,
      nutrition?.calories,
      nutrition?.kcal,
      macros?.calories,
      totals?.calories
    ),
    protein: getFirstFiniteNumber(
      entry?.protein,
      entry?.proteins,
      entry?.proteinGrams,
      nutrition?.protein,
      nutrition?.proteins,
      macros?.protein,
      totals?.protein
    ),
    carbs: getFirstFiniteNumber(
      entry?.carbs,
      entry?.carbohydrates,
      entry?.carbGrams,
      nutrition?.carbs,
      nutrition?.carbohydrates,
      macros?.carbs,
      totals?.carbs
    ),
    fat: getFirstFiniteNumber(
      entry?.fat,
      entry?.fats,
      entry?.fatGrams,
      nutrition?.fat,
      nutrition?.fats,
      macros?.fat,
      totals?.fat
    ),
    vegetableServings: getMealEntryVegetableServings(entry),
  };

  const hasMeaningfulData =
    normalizedMeal.date ||
    normalizedMeal.calories > 0 ||
    normalizedMeal.protein > 0 ||
    normalizedMeal.carbs > 0 ||
    normalizedMeal.fat > 0 ||
    normalizedMeal.vegetableServings > 0 ||
    safeString(entry?.name || entry?.foodName || entry?.label);

  return hasMeaningfulData ? normalizedMeal : null;
}

function normalizeAlertEntry(alert) {
  if (typeof alert === "string") return safeString(alert);
  if (isObject(alert)) {
    return safeString(alert.message || alert.text || alert.label || alert.title);
  }
  return "";
}

function buildSafeAlerts(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeAlertEntry).filter(Boolean);
  }

  if (typeof value === "string") {
    return [value.trim()].filter(Boolean);
  }

  if (isObject(value)) {
    if (Array.isArray(value.alerts)) {
      return buildSafeAlerts(value.alerts);
    }
    const singleAlert = normalizeAlertEntry(value);
    return singleAlert ? [singleAlert] : [];
  }

  return [];
}

function buildSafeInsights(value, fallback = {}) {
  const rawInsights = isObject(value?.insights) ? value.insights : isObject(value) ? value : {};
  const fallbackInsights = isObject(fallback?.insights)
    ? fallback.insights
    : isObject(fallback)
      ? fallback
      : {};

  return {
    lowProtein: Boolean(
      rawInsights.lowProtein ??
        rawInsights.proteinLow ??
        rawInsights.low_protein ??
        rawInsights.needsProtein ??
        fallbackInsights.lowProtein
    ),
    lowVegetables: Boolean(
      rawInsights.lowVegetables ??
        rawInsights.vegetablesLow ??
        rawInsights.low_vegetables ??
        rawInsights.needsVegetables ??
        fallbackInsights.lowVegetables
    ),
    excessCalories: Boolean(
      rawInsights.excessCalories ??
        rawInsights.highCalories ??
        rawInsights.overCalories ??
        rawInsights.excess_calories ??
        fallbackInsights.excessCalories
    ),
    poorMacroBalance: Boolean(
      rawInsights.poorMacroBalance ??
        rawInsights.macroImbalance ??
        rawInsights.badMacroBalance ??
        rawInsights.poor_macro_balance ??
        fallbackInsights.poorMacroBalance
    ),
    lowSatiety: Boolean(
      rawInsights.lowSatiety ??
        rawInsights.poorSatiety ??
        rawInsights.low_satiety ??
        fallbackInsights.lowSatiety
    ),
  };
}

function normalizeNutritionDay(day, fallback = {}) {
  if (!isObject(day) && !isObject(fallback)) return null;

  const rawDay = isObject(day) ? day : {};
  const rawNutrition = isObject(rawDay?.nutrition) ? rawDay.nutrition : {};
  const rawTotals = isObject(rawDay?.totals) ? rawDay.totals : {};

  const normalizedDay = {
    date:
      normalizeDateValue(rawDay?.date) ||
      normalizeDateValue(rawDay?.day) ||
      normalizeDateValue(rawDay?.loggedDate) ||
      normalizeDateValue(rawDay?.timestamp) ||
      normalizeDateValue(rawDay?.createdAt) ||
      normalizeDateValue(fallback?.date),
    calories: getFirstFiniteNumber(
      rawDay?.calories,
      rawDay?.caloriesConsumed,
      rawDay?.kcal,
      rawDay?.energy,
      rawNutrition?.calories,
      rawNutrition?.kcal,
      rawTotals?.calories,
      fallback?.calories
    ),
    protein: getFirstFiniteNumber(
      rawDay?.protein,
      rawDay?.proteins,
      rawDay?.proteinGrams,
      rawNutrition?.protein,
      rawNutrition?.proteins,
      rawTotals?.protein,
      fallback?.protein
    ),
    carbs: getFirstFiniteNumber(
      rawDay?.carbs,
      rawDay?.carbohydrates,
      rawDay?.carbGrams,
      rawNutrition?.carbs,
      rawNutrition?.carbohydrates,
      rawTotals?.carbs,
      fallback?.carbs
    ),
    fat: getFirstFiniteNumber(
      rawDay?.fat,
      rawDay?.fats,
      rawDay?.fatGrams,
      rawNutrition?.fat,
      rawNutrition?.fats,
      rawTotals?.fat,
      fallback?.fat
    ),
    vegetableServings: getFirstFiniteNumber(
      rawDay?.vegetableServings,
      rawDay?.vegetables,
      rawDay?.veggieServings,
      rawNutrition?.vegetableServings,
      rawTotals?.vegetableServings,
      fallback?.vegetableServings
    ),
    nutritionScore: getFirstFiniteNumber(
      rawDay?.nutritionScore?.score,
      rawDay?.nutritionScore,
      rawDay?.score,
      rawNutrition?.score,
      fallback?.nutritionScore
    ),
    alerts: buildSafeAlerts(
      rawDay?.alerts ?? rawDay?.warnings ?? rawDay?.notifications ?? fallback?.alerts
    ),
    insights: buildSafeInsights(rawDay, fallback),
    steps: getFirstFiniteNumber(rawDay?.steps, fallback?.steps),
    activeKcal: getFirstFiniteNumber(rawDay?.activeKcal, rawDay?.activeCalories, fallback?.activeKcal),
    weight: getFirstFiniteNumber(rawDay?.weight, rawDay?.peso, fallback?.weight),
  };

  return normalizedDay;
}

function hasMeaningfulNutritionDay(day) {
  if (!isObject(day)) return false;
  if (!safeString(day.date)) return false;

  return Boolean(
    day.calories > 0 ||
      day.protein > 0 ||
      day.carbs > 0 ||
      day.fat > 0 ||
      day.vegetableServings > 0 ||
      day.nutritionScore > 0 ||
      buildSafeAlerts(day?.alerts).length > 0 ||
      Object.values(buildSafeInsights(day?.insights)).some(Boolean)
  );
}

function buildRecoveryInsights({
  totals,
  proteinAnalysis,
  vegetableAnalysis,
  macroAnalysis,
  satiety,
  calorieTarget,
}) {
  const calories = Number(totals?.calories || 0);
  const targetCalories = Number(calorieTarget || 0);
  const satietyScore = Number(satiety?.satietyScore || 0);

  return {
    lowProtein: proteinAnalysis?.status !== "optimal",
    lowVegetables: ["low", "very_low"].includes(vegetableAnalysis?.status),
    excessCalories: targetCalories > 0 ? calories > targetCalories * 1.08 : false,
    poorMacroBalance:
      macroAnalysis?.protein?.status === "low" ||
      macroAnalysis?.carbs?.status === "high" ||
      macroAnalysis?.fats?.status === "high",
    lowSatiety: Boolean(satiety?.hasData) && satietyScore < 50,
  };
}

export default function NutritionHomePage({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "home",
  onChangeActiveSection,
}) {
  const [tab, setTab] = useState(0);
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const meals = useMemo(() => (profileId ? getMeals(profileId) : []), [profileId]);

  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const totalsToday = useMemo(() => calculateDailyTotals(mealsToday), [mealsToday]);
  const latestMetric = useMemo(() => {
    const safeLog = Array.isArray(metricsLog) ? metricsLog : [];
    return [...safeLog].reverse().find((entry) => entry?.date === todayKey) || safeLog[safeLog.length - 1] || {};
  }, [metricsLog, todayKey]);
  const bodyWeightKg = Number((profile?.weight ?? profile?.peso ?? latestMetric?.weight) || 0);
  const tdee = useMemo(
    () =>
      calculateTDEEDynamic(profile, {
        steps: Number(latestMetric?.steps || 0),
        activeKcal: Number(latestMetric?.activeKcal || 0),
      }),
    [latestMetric?.activeKcal, latestMetric?.steps, profile]
  );
  const satietyToday = useMemo(() => estimateHungerFromMeals(mealsToday), [mealsToday]);
  const macroAnalysis = useMemo(
    () =>
      analyzeMacroBalance({
        proteinCalories: totalsToday.protein * 4,
        carbCalories: totalsToday.carbs * 4,
        fatCalories: totalsToday.fat * 9,
        totalCalories: totalsToday.calories,
      }),
    [totalsToday.calories, totalsToday.carbs, totalsToday.fat, totalsToday.protein]
  );
  const proteinAnalysis = useMemo(
    () =>
      analyzeProteinIntake({
        proteinConsumedGrams: totalsToday.protein,
        bodyWeightKg,
      }),
    [bodyWeightKg, totalsToday.protein]
  );
  const vegetableAnalysis = useMemo(() => trackVegetableIntake(mealsToday), [mealsToday]);
  const nutritionScore = useMemo(
    () =>
      calculateDailyNutritionScore({
        caloriesConsumed: totalsToday.calories,
        calorieTarget: tdee,
        proteinGrams: totalsToday.protein,
        proteinTarget: proteinAnalysis.proteinTarget,
        macroDistribution: {
          protein: macroAnalysis.protein?.percent,
          carbs: macroAnalysis.carbs?.percent,
          fat: macroAnalysis.fats?.percent,
        },
        vegetableServings: vegetableAnalysis.servings,
        satietyScore: satietyToday.satietyScore,
      }),
    [
      macroAnalysis.carbs?.percent,
      macroAnalysis.fats?.percent,
      macroAnalysis.protein?.percent,
      proteinAnalysis.proteinTarget,
      satietyToday.satietyScore,
      tdee,
      totalsToday.calories,
      totalsToday.protein,
      vegetableAnalysis.servings,
    ]
  );
  const alerts = useMemo(
    () =>
      generateNutritionAlerts({
        proteinConsumedGrams: totalsToday.protein,
        bodyWeightKg,
        proteinCalories: totalsToday.protein * 4,
        carbCalories: totalsToday.carbs * 4,
        fatCalories: totalsToday.fat * 9,
        totalCalories: totalsToday.calories,
        meals: mealsToday,
      }),
    [bodyWeightKg, mealsToday, totalsToday.calories, totalsToday.carbs, totalsToday.fat, totalsToday.protein]
  );
  const caloriesRemaining = useMemo(
    () => {
      const target = Number(tdee);
      const consumed = Number(totalsToday.calories);
      if (!Number.isFinite(target) || target <= 0) return 0;
      if (!Number.isFinite(consumed) || consumed < 0) return Math.round(target);
      return Math.max(0, Math.round(target - consumed));
    },
    [tdee, totalsToday.calories]
  );
  const mealTiming = useMemo(() => inferMealTiming(), []);
  const dailyStatus = useMemo(
    () => {
      if (!Array.isArray(mealsToday) || mealsToday.length === 0) return null;

      const proteinTarget = Number(proteinAnalysis?.proteinTarget || 0);
      const proteinConsumed = Number(proteinAnalysis?.proteinConsumed || 0);

      return {
        caloriesRemaining,
        proteinRemaining:
          proteinTarget > 0 ? Math.max(0, proteinTarget - proteinConsumed) : 0,
        vegetableServings: Number(vegetableAnalysis?.servings || 0),
        macroBalance: {
          protein: macroAnalysis?.protein?.status === "good" ? "ok" : macroAnalysis?.protein?.status,
          carbs: macroAnalysis?.carbs?.status === "good" ? "ok" : macroAnalysis?.carbs?.status,
          fats: macroAnalysis?.fats?.status === "good" ? "ok" : macroAnalysis?.fats?.status,
        },
        mealTiming,
      };
    },
    [
      mealsToday,
      caloriesRemaining,
      macroAnalysis.carbs?.status,
      macroAnalysis.fats?.status,
      macroAnalysis.protein?.status,
      mealTiming,
      proteinAnalysis.proteinConsumed,
      proteinAnalysis.proteinTarget,
      vegetableAnalysis.servings,
    ]
  );
  const canShowAdaptiveSuggestions = useMemo(() => {
    if (!dailyStatus) return false;

    const hasMeaningfulDailyData =
      totalsToday.calories > 0 ||
      totalsToday.protein > 0 ||
      vegetableAnalysis.servings > 0 ||
      proteinAnalysis.proteinTarget > 0;

    return mealsToday.length > 0 && hasMeaningfulDailyData;
  }, [
    dailyStatus,
    mealsToday.length,
    proteinAnalysis.proteinTarget,
    totalsToday.calories,
    totalsToday.protein,
    vegetableAnalysis.servings,
  ]);
  const adaptiveOptions = useMemo(() => {
    if (mealTiming === "dinner") {
      return { mealType: "dinner" };
    }
    return {};
  }, [mealTiming]);
  // Compatibility layer for Sprint 10: normalize meal entries before sending them to the corrective card.
  const safeMealHistory = useMemo(
    () => getSafeArray(meals).filter(isObject),
    [meals]
  );
  const normalizedMealHistory = useMemo(
    () =>
      safeMealHistory
        .map((entry) => normalizeMealEntry(entry))
        .filter(Boolean),
    [safeMealHistory]
  );
  const normalizedTodayMealHistory = useMemo(
    () => normalizedMealHistory.filter((meal) => meal?.date === todayKey),
    [normalizedMealHistory, todayKey]
  );
  const correctiveDeficits = useMemo(
    () =>
      buildRecoveryInsights({
        totals: totalsToday,
        proteinAnalysis,
        vegetableAnalysis,
        macroAnalysis,
        satiety: satietyToday,
        calorieTarget: tdee,
      }),
    [macroAnalysis, proteinAnalysis, satietyToday, tdee, totalsToday, vegetableAnalysis]
  );
  const correctivePlanInput = {
    dailyTargetCalories: safeNumber(tdee),
    dailyTargetProtein: safeNumber(proteinAnalysis?.proteinTarget),
    dailyTargetCarbs: safeNumber(profile?.macroTargets?.carbs),
    dailyTargetFat: safeNumber(profile?.macroTargets?.fat),
    consumedCalories: safeNumber(totalsToday?.calories),
    consumedProtein: safeNumber(totalsToday?.protein),
    consumedCarbs: safeNumber(totalsToday?.carbs),
    consumedFat: safeNumber(totalsToday?.fat),
    vegetableServings: safeNumber(vegetableAnalysis?.servings),
    deficits: buildSafeInsights(correctiveDeficits),
    mealHistory: normalizedTodayMealHistory,
  };
  const safeMetricsHistory = useMemo(
    () => getSafeArray(metricsLog).filter(isObject),
    [metricsLog]
  );
  const normalizedMetricsHistory = useMemo(
    () =>
      safeMetricsHistory
        .map((entry) => ({
          ...entry,
          date:
            normalizeDateValue(entry?.date) ||
            normalizeDateValue(entry?.day) ||
            normalizeDateValue(entry?.loggedDate) ||
            normalizeDateValue(entry?.timestamp) ||
            normalizeDateValue(entry?.createdAt),
        }))
        .filter((entry) => entry?.date),
    [safeMetricsHistory]
  );
  const nextDayRecoveryOptions = {};

  if (safeNumber(tdee) > 0) {
    nextDayRecoveryOptions.dailyTargetCalories = safeNumber(tdee);
  }

  if (safeNumber(proteinAnalysis?.proteinTarget) > 0) {
    nextDayRecoveryOptions.dailyTargetProtein = safeNumber(proteinAnalysis?.proteinTarget);
  }
  // Merge recent nutrition history from meals and metric rows, tolerating partial data on either side.
  const normalizedRecentDays = useMemo(() => {
    const metricDaysByDate = new Map(
      normalizedMetricsHistory.map((entry) => [entry?.date, entry])
    );
    const uniqueDates = Array.from(
      new Set([
        ...normalizedMealHistory.map((meal) => meal?.date).filter(Boolean),
        ...normalizedMetricsHistory.map((entry) => entry?.date).filter(Boolean),
      ])
    )
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
      .slice(0, 7);

    if (uniqueDates.length === 0) return [];

    return uniqueDates
      .map((date) => {
        const mealsForDate = normalizedMealHistory.filter((meal) => meal?.date === date);
        const totalsForDate = calculateDailyTotals(mealsForDate);
        const metric = metricDaysByDate.get(date) || {};
        const metricNutrition = isObject(metric?.nutrition) ? metric.nutrition : {};
        const metricTotals = isObject(metric?.totals) ? metric.totals : {};
        const weightForDate = getFirstFiniteNumber(
          metric?.weight,
          profile?.weight,
          profile?.peso,
          bodyWeightKg
        );
        const tdeeForDate = calculateTDEEDynamic(profile, {
          steps: safeNumber(metric?.steps),
          activeKcal: safeNumber(metric?.activeKcal),
        });
        const caloriesFromMetric = findFiniteNumber(
          metric?.calories,
          metric?.caloriesConsumed,
          metric?.kcal,
          metric?.energy,
          metricNutrition?.calories,
          metricNutrition?.kcal,
          metricTotals?.calories
        );
        const proteinFromMetric = findFiniteNumber(
          metric?.protein,
          metric?.proteins,
          metric?.proteinGrams,
          metricNutrition?.protein,
          metricNutrition?.proteins,
          metricTotals?.protein
        );
        const carbsFromMetric = findFiniteNumber(
          metric?.carbs,
          metric?.carbohydrates,
          metric?.carbGrams,
          metricNutrition?.carbs,
          metricNutrition?.carbohydrates,
          metricTotals?.carbs
        );
        const fatFromMetric = findFiniteNumber(
          metric?.fat,
          metric?.fats,
          metric?.fatGrams,
          metricNutrition?.fat,
          metricNutrition?.fats,
          metricTotals?.fat
        );
        const caloriesForDate = Number.isFinite(caloriesFromMetric)
          ? caloriesFromMetric
          : safeNumber(totalsForDate.calories);
        const proteinForDate = Number.isFinite(proteinFromMetric)
          ? proteinFromMetric
          : safeNumber(totalsForDate.protein);
        const carbsForDate = Number.isFinite(carbsFromMetric)
          ? carbsFromMetric
          : safeNumber(totalsForDate.carbs);
        const fatForDate = Number.isFinite(fatFromMetric)
          ? fatFromMetric
          : safeNumber(totalsForDate.fat);
        const vegetablesFromMeals = trackVegetableIntake(mealsForDate);
        const vegetableServingsFromMetric = findFiniteNumber(
          metric?.vegetableServings,
          metric?.vegetables,
          metric?.veggieServings,
          metricNutrition?.vegetableServings,
          metricTotals?.vegetableServings
        );
        const vegetableServingsForDate = Number.isFinite(vegetableServingsFromMetric)
          ? vegetableServingsFromMetric
          : safeNumber(vegetablesFromMeals.servings);
        const vegetableForDate = {
          ...vegetablesFromMeals,
          servings: vegetableServingsForDate,
          status: getVegetableStatus(vegetableServingsForDate),
        };
        const macroForDate = analyzeMacroBalance({
          proteinCalories: proteinForDate * 4,
          carbCalories: carbsForDate * 4,
          fatCalories: fatForDate * 9,
          totalCalories: caloriesForDate,
        });
        const proteinAnalysisForDate = analyzeProteinIntake({
          proteinConsumedGrams: proteinForDate,
          bodyWeightKg: weightForDate,
        });
        const satietyForDate = estimateHungerFromMeals(mealsForDate);
        const computedAlerts = generateNutritionAlerts({
          proteinConsumedGrams: proteinForDate,
          bodyWeightKg: weightForDate,
          proteinCalories: proteinForDate * 4,
          carbCalories: carbsForDate * 4,
          fatCalories: fatForDate * 9,
          totalCalories: caloriesForDate,
          meals: mealsForDate,
        });
        const rawMetricAlerts = buildSafeAlerts(
          metric?.alerts ?? metric?.warnings ?? metric?.notifications
        );
        const alertsForDate = rawMetricAlerts.length
          ? rawMetricAlerts
          : buildSafeAlerts(computedAlerts);
        const computedInsights = buildRecoveryInsights({
          totals: {
            calories: caloriesForDate,
            protein: proteinForDate,
            carbs: carbsForDate,
            fat: fatForDate,
          },
          proteinAnalysis: proteinAnalysisForDate,
          vegetableAnalysis: vegetableForDate,
          macroAnalysis: macroForDate,
          satiety: satietyForDate,
          calorieTarget: tdeeForDate,
        });
        const metricInsights = buildSafeInsights(metric);
        const insightsForDate = {
          lowProtein: metricInsights.lowProtein || computedInsights.lowProtein,
          lowVegetables: metricInsights.lowVegetables || computedInsights.lowVegetables,
          excessCalories: metricInsights.excessCalories || computedInsights.excessCalories,
          poorMacroBalance: metricInsights.poorMacroBalance || computedInsights.poorMacroBalance,
          lowSatiety: metricInsights.lowSatiety || computedInsights.lowSatiety,
        };
        const nutritionScoreForDate = calculateDailyNutritionScore({
          caloriesConsumed: caloriesForDate,
          calorieTarget: tdeeForDate,
          proteinGrams: proteinForDate,
          proteinTarget: proteinAnalysisForDate.proteinTarget,
          macroDistribution: {
            protein: macroForDate.protein?.percent,
            carbs: macroForDate.carbs?.percent,
            fat: macroForDate.fats?.percent,
          },
          vegetableServings: vegetableServingsForDate,
          satietyScore: satietyForDate.satietyScore,
        });
        const nutritionScoreFromMetric = findFiniteNumber(
          metric?.nutritionScore?.score,
          metric?.nutritionScore,
          metric?.score,
          metricNutrition?.score
        );

        return normalizeNutritionDay(
          {
            ...metric,
            date,
            calories: caloriesForDate,
            protein: proteinForDate,
            carbs: carbsForDate,
            fat: fatForDate,
            vegetableServings: vegetableServingsForDate,
            nutritionScore: Number.isFinite(nutritionScoreFromMetric)
              ? nutritionScoreFromMetric
              : safeNumber(nutritionScoreForDate?.score),
            alerts: alertsForDate,
            insights: insightsForDate,
          }
        );
      })
      .filter(hasMeaningfulNutritionDay);
  }, [bodyWeightKg, normalizedMealHistory, normalizedMetricsHistory, profile]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={(theme) => ({
          ...nutritionHeroSx(theme),
          gap: 1.4,
          p: { xs: 2.2, md: 2.8 },
        })}
      >
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.14em" }}
        >
          Hub nutricional
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1 }}>
          Inicio de nutrición
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 720, lineHeight: 1.5 }}
        >
          Dashboard, captura rápida y herramientas para decidir qué comer durante el día.
        </Typography>
      </Box>

      <NutritionSectionNav
        activeSection={activeSection}
        onChangeSection={onChangeActiveSection}
        note="Usa Inicio para el dashboard y luego salta a registro, estado diario o planificación."
      />

      <NutritionDashboard
        dailyCalories={totalsToday.calories}
        targetCalories={tdee}
        protein={totalsToday.protein}
        carbs={totalsToday.carbs}
        fat={totalsToday.fat}
        nutritionScore={nutritionScore.score}
      />

      <Box sx={{ display: "grid", gap: 3 }}>
        <NutritionInsights
          nutritionScore={nutritionScore}
          macroAnalysis={macroAnalysis}
          proteinAnalysis={proteinAnalysis}
          vegetableAnalysis={vegetableAnalysis}
        />
        {canShowAdaptiveSuggestions ? (
          <AdaptiveMealSuggestions
            title="Que comer para mejorar tu dia"
            dailyStatus={dailyStatus}
            options={adaptiveOptions}
          />
        ) : mealsToday.length > 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aun no hay suficientes datos para sugerir mejoras.
          </Typography>
        ) : null}
        <Box
          sx={(theme) => ({
            ...nutritionSurfaceSx(theme),
            p: { xs: 1.45, sm: 1.8 },
            display: "grid",
            gap: { xs: 1.35, sm: 1.6 },
          })}
        >
          <Box sx={{ display: "grid", gap: 0.55 }}>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.12em" }}
            >
              Nutrition Recovery Planning
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
              Planning correctivo para hoy y manana
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
              La app propone como cerrar mejor el dia actual y como organizar el siguiente segun deficits y patrones recientes. Esta es una seccion nueva y no reemplaza ni el dashboard, ni insights, ni AdaptiveMealSuggestions.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 1.2,
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              alignItems: "start",
            }}
          >
            <CorrectiveDayPlan
              title="Plan correctivo del dia actual"
              dailyTargetCalories={correctivePlanInput.dailyTargetCalories}
              dailyTargetProtein={correctivePlanInput.dailyTargetProtein}
              dailyTargetCarbs={correctivePlanInput.dailyTargetCarbs}
              dailyTargetFat={correctivePlanInput.dailyTargetFat}
              consumedCalories={correctivePlanInput.consumedCalories}
              consumedProtein={correctivePlanInput.consumedProtein}
              consumedCarbs={correctivePlanInput.consumedCarbs}
              consumedFat={correctivePlanInput.consumedFat}
              vegetableServings={correctivePlanInput.vegetableServings}
              deficits={correctivePlanInput.deficits}
              mealHistory={correctivePlanInput.mealHistory}
            />

            <NextDayRecoveryCard
              title="Plan sugerido para manana"
              recentDays={normalizedRecentDays}
              options={nextDayRecoveryOptions}
            />
          </Box>
        </Box>
        <NutritionAlerts alerts={alerts} />
      </Box>

      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        <Tab label="Registrar comida" />
        <Tab label="Qué puedo cocinar" />
        <Tab label="Casino / Restaurante" />
        <Tab label="Lista de compras" />
      </Tabs>

      <Box>
        <Suspense fallback={<Typography variant="body2" color="text.secondary">Cargando herramienta...</Typography>}>
          {tab === 0 && <SmartFoodInput />}
          {tab === 1 && <CookWithWhatIHave />}
          {tab === 2 && <CasinoMealEvaluator />}
          {tab === 3 && <ShoppingList profileId={profileId || "default"} />}
        </Suspense>
      </Box>
    </Box>
  );
}
