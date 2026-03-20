import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Skeleton, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import NutritionSummary from "./NutritionSummary";
import EnergyBalanceCard from "./EnergyBalanceCard";
import MealSuggestions from "./MealSuggestions";
import WeightProjection from "./WeightProjection";
import NutritionEvaluation from "./NutritionEvaluation";
import NutritionAlerts from "./NutritionAlerts";
import NutritionInsights from "./NutritionInsights";
import AdaptiveCalorieAdjustment from "./AdaptiveCalorieAdjustment";
import NutritionSectionNav from "./NutritionSectionNav";
import calculateDailyNutritionScore from "../../utils/dailyNutritionScore";
import analyzeMacroBalance from "../../utils/macroAnalyzer";
import analyzeProteinIntake from "../../utils/proteinAnalyzer";
import trackVegetableIntake from "../../utils/vegetableTracker";
import generateNutritionAlerts from "../../utils/nutritionAlerts";
import { getMealNutritionScore } from "../../utils/nutritionScore";
import { getMeals, saveMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateCalorieBalance, calculateTDEEDynamic } from "../../utils/metabolism";
import { estimateHungerFromMeals } from "../../utils/hungerEstimate";
import { recipes } from "../../data/recipes";
import { foodCatalog } from "../../data/foodCatalog";
import { getCustomFoods } from "../../utils/customFoodsStorage";
import {
  getNutritionMetricState,
  nutritionCompactTabsSx,
  nutritionHeroSx,
  nutritionSurfaceSx,
  nutritionTabLabelDot,
  nutritionTabsRailSx,
} from "./nutritionUi";

const DailyMealPlan = lazy(() => import("./DailyMealPlan"));
const WeeklyMealPlanner = lazy(() => import("./WeeklyMealPlanner"));
const ShoppingListCard = lazy(() => import("./ShoppingListCard"));
const NutritionLog = lazy(() => import("./NutritionLog"));
const AdaptiveInsightDrawer = lazy(() => import("./AdaptiveInsightDrawer"));
const NutritionTools = lazy(() => import("./NutritionTools"));

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey, days) {
  const base = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateKey;
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildLastNDates(endDateKey, count) {
  const n = Math.max(1, Number(count || 1));
  const dates = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    dates.push(addDaysToDateKey(endDateKey, -i));
  }
  return dates;
}

function inferMealTypeByHour() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

function mealTypeLabel(type) {
  if (type === "desayuno") return "Desayuno";
  if (type === "almuerzo") return "Almuerzo";
  if (type === "cena") return "Cena";
  if (type === "snack") return "Snack";
  if (type === "bebida") return "Bebida";
  return type || "Comida";
}

function NutritionSectionFallback({ rows = 3 }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.2 }}>
        <Skeleton variant="text" width={220} height={30} />
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={index === 0 ? 56 : 110} />
        ))}
      </CardContent>
    </Card>
  );
}

function calculateMacroTargets(profile, tdee) {
  const weight = Number(profile?.weight ?? profile?.peso ?? 0);
  const dailyCalories = Math.max(0, Number(tdee || 0));
  const proteinTarget = weight > 0 ? weight * 1.6 : 0;
  const fatTarget = weight > 0 ? weight * 0.8 : 0;
  const remainingCalories = Math.max(0, dailyCalories - proteinTarget * 4 - fatTarget * 9);
  const carbsTarget = remainingCalories / 4;

  return {
    calories: dailyCalories,
    protein: proteinTarget,
    carbs: carbsTarget,
    fat: fatTarget,
  };
}

function HeroMetricCard({ label, valueText, helperText, state }) {
  return (
    <Box
      sx={{
        p: { xs: 1.2, sm: 1.5 },
        borderRadius: { xs: 2.4, sm: 3 },
        bgcolor: state.background,
        border: `1px solid ${state.border}`,
        display: "grid",
        gap: { xs: 0.55, sm: 0.7 },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, fontSize: { xs: "0.64rem", sm: "0.72rem" } }}
        >
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: state.accent, fontWeight: 800, fontSize: { xs: "0.64rem", sm: "0.72rem" } }}>
          {state.label}
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ lineHeight: 1, fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
        {valueText}
      </Typography>
      <Box
        sx={{
          height: { xs: 6, sm: 7 },
          borderRadius: 999,
          bgcolor: state.track,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${Math.max(6, Math.round((state.progress || 0) * 100))}%`,
            height: "100%",
            borderRadius: 999,
            bgcolor: state.fill,
            transition: "width 180ms ease-out",
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.66rem", sm: "0.72rem" } }}>
        {helperText}
      </Typography>
    </Box>
  );
}

function normalizeFoodKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildFoodLookup(items) {
  const lookup = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const nameKey = normalizeFoodKey(item?.name);
    const brandKey = normalizeFoodKey(item?.brand);
    if (!nameKey) return;
    lookup.set(`${nameKey}::${brandKey}`, item);
    if (brandKey) return;
    if (!lookup.has(`${nameKey}::`)) lookup.set(`${nameKey}::`, item);
  });
  return lookup;
}

function getMealRatio(meal) {
  if (Number(meal?.grams) > 0) return Number(meal.grams) / 100;
  const quantity = Number(meal?.quantity || 0);
  if (quantity <= 0) return 0;
  return meal?.unit === "ml" ? quantity / 100 : quantity;
}

function enrichMealsWithStoredNutrients(meals, foodLookup) {
  let changed = false;
  const nextMeals = (Array.isArray(meals) ? meals : []).map((meal) => {
    const nameKey = normalizeFoodKey(meal?.name);
    const brandKey = normalizeFoodKey(meal?.brand);
    const source =
      foodLookup.get(`${nameKey}::${brandKey}`) ||
      foodLookup.get(`${nameKey}::`) ||
      null;
    if (!source) return meal;

    const ratio = getMealRatio(meal);
    if (!ratio) return meal;

    const nextMeal = {
      ...meal,
      sodium:
        meal?.sodium ?? Number((Number(source?.sodium || 0) * ratio).toFixed(2)),
      sugars:
        meal?.sugars ?? Number((Number(source?.sugars || 0) * ratio).toFixed(2)),
      fiber:
        meal?.fiber ?? Number((Number(source?.fiber || 0) * ratio).toFixed(2)),
      saturatedFat:
        meal?.saturatedFat ?? Number((Number(source?.saturatedFat || 0) * ratio).toFixed(2)),
      transFat:
        meal?.transFat ?? Number((Number(source?.transFat || 0) * ratio).toFixed(2)),
      cholesterol:
        meal?.cholesterol ?? Number((Number(source?.cholesterol || 0) * ratio).toFixed(2)),
    };
    if (
      nextMeal.sodium !== meal?.sodium ||
      nextMeal.sugars !== meal?.sugars ||
      nextMeal.fiber !== meal?.fiber ||
      nextMeal.saturatedFat !== meal?.saturatedFat ||
      nextMeal.transFat !== meal?.transFat ||
      nextMeal.cholesterol !== meal?.cholesterol
    ) {
      changed = true;
    }
    return nextMeal;
  });

  return { changed, meals: nextMeals };
}

export default function NutritionPage({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "estado",
  onChangeActiveSection,
  onNutritionDataChange,
}) {
  const theme = useTheme();
  const sectionStackSx = {
    display: "grid",
    gap: { xs: 1.5, sm: 2.25 },
  };
  const sectionHeaderSx = nutritionHeroSx;
  const tabsContainerSx = nutritionTabsRailSx;
  const heroMetricsRailSx = {
    display: { xs: "flex", sm: "grid" },
    gridTemplateColumns: {
      sm: "repeat(2, minmax(0, 1fr))",
      md: "repeat(3, minmax(0, 1fr))",
      xl: "repeat(5, minmax(0, 1fr))",
    },
    gap: 1.5,
    overflowX: { xs: "auto", sm: "visible" },
    pb: { xs: 0.3, sm: 0 },
    scrollSnapType: { xs: "x proximity", sm: "none" },
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    "& > *": {
      minWidth: { xs: 212, sm: 0 },
      flex: { xs: "0 0 76%", sm: "1 1 auto" },
      scrollSnapAlign: { xs: "start", sm: "none" },
    },
  };
  const compactStatusTabsSx = (muiTheme) =>
    nutritionCompactTabsSx(muiTheme, {
      mobileMinHeight: 42,
      desktopMinHeight: 44,
      mobileFontSize: "0.82rem",
      desktopFontSize: "0.9rem",
      desktopPx: 1.35,
      mobilePx: 1.05,
    });
  const [meals, setMeals] = useState([]);
  const [showAdaptiveDrawer, setShowAdaptiveDrawer] = useState(false);
  const [adaptiveDrawerSection, setAdaptiveDrawerSection] = useState("progreso");
  const [dailyStatusTab, setDailyStatusTab] = useState(0);
  const [historyDate, setHistoryDate] = useState("");
  const [nutritionReady, setNutritionReady] = useState(false);
  const todayKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    if (!profileId) {
      setMeals([]);
      setNutritionReady(true);
      return;
    }
    setMeals(getMeals(profileId));
    setNutritionReady(true);
  }, [profileId]);
  useEffect(() => {
    if (!profileId || !nutritionReady) return;
    const lookup = buildFoodLookup([...foodCatalog, ...getCustomFoods(profileId)]);
    const enriched = enrichMealsWithStoredNutrients(meals, lookup);
    if (!enriched.changed) return;
    saveMeals(profileId, enriched.meals);
    setMeals(enriched.meals);
  }, [meals, nutritionReady, profileId]);

  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const availableMealDates = useMemo(() => {
    const unique = new Set((Array.isArray(meals) ? meals : []).map((meal) => meal?.date).filter(Boolean));
    return [...unique].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [meals]);
  useEffect(() => {
    if (!historyDate) {
      setHistoryDate(todayKey);
      return;
    }
    if (availableMealDates.length > 0 && !availableMealDates.includes(historyDate)) {
      setHistoryDate(availableMealDates[0]);
    }
  }, [availableMealDates, historyDate, todayKey]);

  const totalsToday = useMemo(() => calculateDailyTotals(mealsToday), [mealsToday]);
  const hungerToday = useMemo(() => estimateHungerFromMeals(mealsToday), [mealsToday]);
  const latestRecordedWeight = useMemo(() => {
    const safeLog = Array.isArray(metricsLog) ? [...metricsLog] : [];
    for (let i = safeLog.length - 1; i >= 0; i -= 1) {
      const value = Number(safeLog[i]?.weight);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }, [metricsLog]);
  const nutritionProfile = useMemo(() => {
    if (!profile) return profile;
    if (!latestRecordedWeight) return profile;
    return {
      ...profile,
      weight: latestRecordedWeight,
      peso: latestRecordedWeight,
    };
  }, [profile, latestRecordedWeight]);
  const metricsForTdee = useMemo(() => {
    const safeLog = Array.isArray(metricsLog) ? metricsLog : [];
    if (!safeLog.length) return {};
    const todayMetric = [...safeLog].reverse().find((entry) => entry?.date === todayKey);
    const source = todayMetric || {};
    return {
      steps: Number(source?.steps || 0),
      activeKcal: Number(source?.activeKcal || 0),
    };
  }, [metricsLog, todayKey]);
  const tdee = useMemo(
    () => calculateTDEEDynamic(nutritionProfile, metricsForTdee),
    [nutritionProfile, metricsForTdee]
  );
  const calorieBalance = useMemo(
    () => calculateCalorieBalance(totalsToday.calories, tdee),
    [totalsToday.calories, tdee]
  );
  const historyMeals = useMemo(
    () => getMealsForDate(meals, historyDate || todayKey),
    [historyDate, meals, todayKey]
  );
  const historyTotals = useMemo(() => calculateDailyTotals(historyMeals), [historyMeals]);
  const historyMetricEntry = useMemo(() => {
    return (Array.isArray(metricsLog) ? metricsLog : []).find((entry) => entry?.date === (historyDate || todayKey)) || {};
  }, [historyDate, metricsLog, todayKey]);
  const historyTdee = useMemo(
    () =>
      calculateTDEEDynamic(nutritionProfile, {
        steps: Number(historyMetricEntry?.steps || 0),
        activeKcal: Number(historyMetricEntry?.activeKcal || 0),
      }),
    [historyMetricEntry?.activeKcal, historyMetricEntry?.steps, nutritionProfile]
  );
  const historyBalance = useMemo(
    () => calculateCalorieBalance(historyTotals.calories, historyTdee),
    [historyTotals.calories, historyTdee]
  );
  const last7HistoryChart = useMemo(() => {
    const dateKeys = buildLastNDates(todayKey, 7);
    const metricsByDate = new Map(
      (Array.isArray(metricsLog) ? metricsLog : []).map((entry) => [entry?.date, entry || {}])
    );

    return dateKeys.map((date) => {
      const mealsForDate = getMealsForDate(meals, date);
      const totals = calculateDailyTotals(mealsForDate);
      const metric = metricsByDate.get(date) || {};
      const tdeeForDate = calculateTDEEDynamic(nutritionProfile, {
        steps: Number(metric?.steps || 0),
        activeKcal: Number(metric?.activeKcal || 0),
      });
      return {
        date,
        shortDate: date.slice(5),
        calories: Number(totals.calories || 0),
        tdee: Number(tdeeForDate || 0),
        protein: Number(totals.protein || 0),
        carbs: Number(totals.carbs || 0),
        fat: Number(totals.fat || 0),
      };
    });
  }, [meals, metricsLog, nutritionProfile, todayKey]);
  const chartCaloriesMax = useMemo(() => {
    const raw = Math.max(
      1,
      ...last7HistoryChart.map((day) => Math.max(day.calories || 0, day.tdee || 0))
    );
    return raw;
  }, [last7HistoryChart]);
  const chartMacrosMax = useMemo(() => {
    const raw = Math.max(
      1,
      ...last7HistoryChart.map((day) => Number(day.protein || 0) + Number(day.carbs || 0) + Number(day.fat || 0))
    );
    return raw;
  }, [last7HistoryChart]);
  const suggestedMealType = useMemo(() => inferMealTypeByHour(), []);
  const currentWeight = Number(
    latestRecordedWeight || nutritionProfile?.weight || nutritionProfile?.peso || 0
  );
  const calorieHistory = useMemo(() => {
    const byDate = new Map();
    (Array.isArray(meals) ? meals : []).forEach((meal) => {
      const key = meal?.date;
      if (!key) return;
      const prev = byDate.get(key) || 0;
      byDate.set(key, prev + Number(meal?.calories || 0));
    });

    const metricsByDate = new Map(
      (Array.isArray(metricsLog) ? metricsLog : []).map((entry) => [entry?.date, entry || {}])
    );

    return [...byDate.entries()]
      .map(([date, caloriesConsumed]) => {
        const metric = metricsByDate.get(date) || {};
        const tdeeForDate = calculateTDEEDynamic(nutritionProfile, {
          steps: Number(metric?.steps || 0),
          activeKcal: Number(metric?.activeKcal || 0),
        });
        return {
          date,
          caloriesConsumed: Number(caloriesConsumed.toFixed(2)),
          tdee: Number(tdeeForDate.toFixed(2)),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [meals, metricsLog, nutritionProfile]);
  const weightHistory = useMemo(() => {
    return (Array.isArray(metricsLog) ? metricsLog : [])
      .filter((entry) => entry?.date && Number.isFinite(Number(entry?.weight)))
      .map((entry) => ({
        date: entry.date,
        weight: Number(entry.weight),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metricsLog]);
  const currentTargetCalories = Math.round(tdee || 0);
  const macroTargets = useMemo(
    () => calculateMacroTargets(nutritionProfile, tdee),
    [nutritionProfile, tdee]
  );
  const microTargets = useMemo(
    () => ({
      fiber: 28,
      sodium: 2300,
      cholesterol: 300,
    }),
    []
  );
  const sugarReference = useMemo(() => {
    const dailyCalories = Math.max(0, Number(tdee || 0));
    if (!dailyCalories) return 0;
    return (dailyCalories * 0.15) / 4;
  }, [tdee]);
  const saturatedFatReference = useMemo(() => {
    const dailyCalories = Math.max(0, Number(tdee || 0));
    if (!dailyCalories) return 0;
    return (dailyCalories * 0.1) / 9;
  }, [tdee]);
  const mealQualityScore = useMemo(() => {
    if (!Array.isArray(mealsToday) || mealsToday.length === 0) return 0;
    const scores = mealsToday
      .map((meal) => {
        const foods = Array.isArray(meal?.foods) && meal.foods.length
          ? meal.foods.map((item) => item?.foodId || item).filter(Boolean)
          : [meal?.foodId || meal?.name].filter(Boolean);
        if (!foods.length) return 0;
        return Number(getMealNutritionScore(foods).score || 0);
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!scores.length) return 0;
    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    return Math.round(average);
  }, [mealsToday]);
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
        bodyWeightKg: currentWeight,
      }),
    [currentWeight, totalsToday.protein]
  );
  const vegetableAnalysis = useMemo(() => trackVegetableIntake(mealsToday), [mealsToday]);
  const dailyNutritionScore = useMemo(
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
        satietyScore: hungerToday.satietyScore,
      }),
    [
      hungerToday.satietyScore,
      macroAnalysis.carbs?.percent,
      macroAnalysis.fats?.percent,
      macroAnalysis.protein?.percent,
      proteinAnalysis.proteinTarget,
      tdee,
      totalsToday.calories,
      totalsToday.protein,
      vegetableAnalysis.servings,
    ]
  );
  const dailyNutritionAlerts = useMemo(
    () =>
      generateNutritionAlerts({
        proteinConsumedGrams: totalsToday.protein,
        bodyWeightKg: currentWeight,
        proteinCalories: totalsToday.protein * 4,
        carbCalories: totalsToday.carbs * 4,
        fatCalories: totalsToday.fat * 9,
        totalCalories: totalsToday.calories,
        meals: mealsToday,
      }),
    [currentWeight, mealsToday, totalsToday.calories, totalsToday.carbs, totalsToday.fat, totalsToday.protein]
  );
  const calorieState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.calories, macroTargets.calories, { lowWarnRatio: 0.5 }),
    [macroTargets.calories, theme, totalsToday.calories]
  );
  const proteinState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.protein, macroTargets.protein),
    [macroTargets.protein, theme, totalsToday.protein]
  );
  const carbsState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.carbs, macroTargets.carbs, { overWarnRatio: 1.3 }),
    [macroTargets.carbs, theme, totalsToday.carbs]
  );
  const fatState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.fat, macroTargets.fat, { overWarnRatio: 1.15 }),
    [macroTargets.fat, theme, totalsToday.fat]
  );
  const mealsState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.mealsCount, 4, { lowWarnRatio: 0.5, overWarnRatio: 1.5 }),
    [theme, totalsToday.mealsCount]
  );
  const fiberState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.fiber, microTargets.fiber, { lowWarnRatio: 0.5, overWarnRatio: 1.35 }),
    [microTargets.fiber, theme, totalsToday.fiber]
  );
  const sodiumState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.sodium, microTargets.sodium, { lowWarnRatio: 0.35, overWarnRatio: 1 }),
    [microTargets.sodium, theme, totalsToday.sodium]
  );
  const sugarsState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.sugars, sugarReference, { lowWarnRatio: 0.35, overWarnRatio: 1.35 }),
    [sugarReference, theme, totalsToday.sugars]
  );
  const saturatedFatState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.saturatedFat, saturatedFatReference, { lowWarnRatio: 0.25, overWarnRatio: 1 }),
    [saturatedFatReference, theme, totalsToday.saturatedFat]
  );
  const cholesterolState = useMemo(
    () => ({
      progress: microTargets.cholesterol > 0
        ? Math.max(0, Math.min(1, Number(totalsToday.cholesterol || 0) / microTargets.cholesterol))
        : 0,
      tone: "info",
      accent: "rgba(71, 85, 105, 0.78)",
      background: "rgba(248, 250, 252, 0.92)",
      border: "rgba(148, 163, 184, 0.24)",
      label: "Informativo",
    }),
    [microTargets.cholesterol, totalsToday.cholesterol]
  );
  const scoreState = useMemo(
    () => getNutritionMetricState(theme, dailyNutritionScore.score, 100, { lowWarnRatio: 0.55, overWarnRatio: 1 }),
    [dailyNutritionScore.score, theme]
  );
  const openAdaptiveDrawer = (section = "progreso") => {
    setAdaptiveDrawerSection(section);
    setShowAdaptiveDrawer(true);
  };

  return (
    <Box className="nutrition-page-content" sx={{ ...sectionStackSx, pb: { xs: 0.4, sm: 1 } }}>
      <Box sx={sectionHeaderSx}>
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.14em", fontSize: { xs: "0.62rem", sm: "0.72rem" } }}
        >
          Estado diario y planificación
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1, fontSize: { xs: "1.9rem", sm: "2.125rem" } }}>
          Nutrición
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 720, lineHeight: 1.5, fontSize: { xs: "0.95rem", sm: "1rem" }, display: { xs: "none", sm: "block" } }}
        >
          Estado diario, registro, planificación y herramientas prácticas en un solo flujo.
        </Typography>
        <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
          <Chip size="small" label={`TDEE ${Math.round(tdee || 0)} kcal`} variant="outlined" />
          <Chip
            size="small"
            label={`Balance ${Math.round(calorieBalance.balance)} kcal`}
            color={
              calorieBalance.status === "deficit"
                ? "success"
                : calorieBalance.status === "surplus"
                ? "error"
                : "warning"
            }
            variant="outlined"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          />
          <Chip
            size="small"
            label={currentWeight ? `Peso ${currentWeight.toFixed(1)} kg` : "Peso sin registro"}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Objetivo prot. ${Math.round(macroTargets.protein || 0)} g`}
            variant="outlined"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          />
        </Box>
        <Box sx={heroMetricsRailSx}>
          <HeroMetricCard
            label="Calorías"
            valueText={`${Math.round(totalsToday.calories)} / ${Math.round(macroTargets.calories || 0)}`}
            helperText={`objetivo: ${Math.round(macroTargets.calories || 0)} kcal`}
            state={calorieState}
          />
          <HeroMetricCard
            label="Proteínas"
            valueText={`${Math.round(totalsToday.protein || 0)} / ${Math.round(macroTargets.protein || 0)} g`}
            helperText={`recomendado: ${Math.round(macroTargets.protein || 0)} g`}
            state={proteinState}
          />
          <HeroMetricCard
            label="Carbohidratos"
            valueText={`${Math.round(totalsToday.carbs || 0)} / ${Math.round(macroTargets.carbs || 0)} g`}
            helperText={`recomendado: ${Math.round(macroTargets.carbs || 0)} g`}
            state={carbsState}
          />
          <HeroMetricCard
            label="Grasas"
            valueText={`${Math.round(totalsToday.fat || 0)} / ${Math.round(macroTargets.fat || 0)} g`}
            helperText={`recomendado: ${Math.round(macroTargets.fat || 0)} g`}
            state={fatState}
          />
          <HeroMetricCard
            label="Nutrition score"
            valueText={dailyNutritionScore.score ? `${dailyNutritionScore.score}/100` : "—"}
            helperText={`calidad diaria · comidas ${mealQualityScore || 0}/100`}
            state={scoreState}
          />
        </Box>
        <Box
          component="details"
          sx={(muiTheme) => ({
            ...nutritionSurfaceSx(muiTheme),
            display: { xs: "grid", lg: "none" },
            mt: 0.2,
            overflow: "hidden",
          })}
        >
          <Box
            component="summary"
            sx={{
              listStyle: "none",
              cursor: "pointer",
              p: 1.2,
              display: "grid",
              gap: 0.35,
              "&::-webkit-details-marker": { display: "none" },
            }}
          >
            <Typography variant="subtitle2">KPIs de apoyo</Typography>
            <Typography variant="caption" color="text.secondary">
              Comidas, fibra, sodio, azúcares, grasa saturada y colesterol.
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.2,
              pt: 0,
              display: "grid",
              gap: 1,
              gridTemplateColumns: "1fr",
            }}
          >
            <HeroMetricCard label="Comidas" valueText={`${Math.round(totalsToday.mealsCount || 0)}`} helperText="bloques lógicos del día" state={mealsState} />
            <HeroMetricCard label="Fibra" valueText={`${Math.round(totalsToday.fiber || 0)} / ${Math.round(microTargets.fiber || 0)} g`} helperText={`objetivo: ${Math.round(microTargets.fiber || 0)} g`} state={fiberState} />
            <HeroMetricCard label="Sodio" valueText={`${Math.round(totalsToday.sodium || 0)} / ${Math.round(microTargets.sodium || 0)} mg`} helperText={`límite: ${Math.round(microTargets.sodium || 0)} mg`} state={sodiumState} />
            <HeroMetricCard label="Azúcares totales" valueText={`${Math.round(totalsToday.sugars || 0)} / ${Math.round(sugarReference || 0)} g`} helperText={`referencia flexible: ${Math.round(sugarReference || 0)} g`} state={sugarsState} />
            <HeroMetricCard label="Grasa saturada" valueText={`${Math.round(totalsToday.saturatedFat || 0)} / ${Math.round(saturatedFatReference || 0)} g`} helperText={`límite aprox.: ${Math.round(saturatedFatReference || 0)} g`} state={saturatedFatState} />
            <HeroMetricCard label="Colesterol" valueText={`${Math.round(totalsToday.cholesterol || 0)} / ${Math.round(microTargets.cholesterol || 0)} mg`} helperText={`referencia clásica: ${Math.round(microTargets.cholesterol || 0)} mg`} state={cholesterolState} />
          </Box>
        </Box>
      </Box>
      <NutritionSectionNav activeSection={activeSection} onChangeSection={onChangeActiveSection} />
      <Divider />
      {activeSection === "registro" && (
        <Box sx={sectionStackSx}>
          {!nutritionReady ? (
            <NutritionSectionFallback rows={2} />
          ) : (
            <Suspense fallback={<NutritionSectionFallback rows={2} />}>
              <NutritionLog
                profileId={profileId}
                meals={meals}
                onMealsChange={setMeals}
                onDataChange={onNutritionDataChange}
              />
            </Suspense>
          )}
        </Box>
      )}

      {activeSection === "estado" && (
        <Box sx={sectionStackSx}>
          <NutritionInsights
            nutritionScore={dailyNutritionScore}
            macroAnalysis={macroAnalysis}
            proteinAnalysis={proteinAnalysis}
            vegetableAnalysis={vegetableAnalysis}
          />
          <Box sx={tabsContainerSx}>
            <Tabs
              value={dailyStatusTab}
              onChange={(_, value) => setDailyStatusTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={compactStatusTabsSx}
            >
              <Tab label={nutritionTabLabelDot("primary.main", "Resumen")} />
              <Tab label={nutritionTabLabelDot("warning.main", "Balance y proyección")} />
              <Tab label={nutritionTabLabelDot("success.main", "Adaptativo")} />
              <Tab label={nutritionTabLabelDot("info.main", "Historial")} />
            </Tabs>
          </Box>

          {dailyStatusTab === 0 && (
            <Box sx={sectionStackSx}>
              <Card variant="outlined">
                <CardContent sx={{ display: "grid", gap: 1.25 }}>
                  <Typography variant="h6">Índice de saciedad del día</Typography>
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
                        <Chip
                          size="small"
                          label={`Hambre estimada: ${hungerToday.hungerLevel}`}
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Score: {hungerToday.satietyScore} · Ventana estimada de hambre: {hungerToday.windowText}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Última comida: {hungerToday.lastMealTimeText} · Próxima hambre estimada: {hungerToday.nextHungerText}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Registra al menos una comida hoy para estimar saciedad y próxima ventana de hambre.
                    </Typography>
                  )}
                </CardContent>
              </Card>
              <NutritionAlerts alerts={dailyNutritionAlerts} />
              <NutritionSummary
                profile={nutritionProfile}
                meals={meals}
                tdeeOverride={tdee}
                activityMetrics={metricsForTdee}
              />
              <MealSuggestions
                dailyCaloriesTarget={tdee}
                dailyCaloriesConsumed={totalsToday.calories}
                recipes={recipes}
                foodCatalog={foodCatalog}
                mealType={suggestedMealType}
              />
              <NutritionEvaluation totals={totalsToday} profile={nutritionProfile} tdee={tdee} />
            </Box>
          )}

          {dailyStatusTab === 1 && (
            <Box sx={sectionStackSx}>
              <EnergyBalanceCard caloriesConsumed={totalsToday.calories} tdee={tdee} />
              <WeightProjection currentWeight={currentWeight} dailyBalance={calorieBalance.balance} />
            </Box>
          )}

          {dailyStatusTab === 2 && (
            <Box sx={sectionStackSx}>
              <NutritionAlerts
                calorieHistory={calorieHistory}
                weightHistory={weightHistory}
                currentTargetCalories={currentTargetCalories}
                onOpenDetail={openAdaptiveDrawer}
              />
              <AdaptiveCalorieAdjustment
                calorieHistory={calorieHistory}
                weightHistory={weightHistory}
                currentTargetCalories={currentTargetCalories}
                onOpenDetail={openAdaptiveDrawer}
              />
              <Box>
                <Button variant="outlined" size="large" onClick={() => openAdaptiveDrawer("progreso")}>
                  Ver análisis adaptativo
                </Button>
              </Box>
            </Box>
          )}

          {dailyStatusTab === 3 && (
            <Box sx={sectionStackSx}>
              <Card variant="outlined">
                <CardContent sx={{ display: "grid", gap: 1.1 }}>
                  <Typography variant="h6">Comparación calorías vs TDEE (7 días)</Typography>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                      <Box component="span" sx={{ width: 10, height: 10, bgcolor: "primary.main", borderRadius: "50%" }} />
                      Calorías
                    </Typography>
                    <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                      <Box component="span" sx={{ width: 10, height: 10, bgcolor: "warning.main", borderRadius: "50%" }} />
                      TDEE
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 1,
                      alignItems: "end",
                      minHeight: 170,
                    }}
                  >
                    {last7HistoryChart.map((day) => {
                      const caloriesHeight = Math.max(4, Math.round((day.calories / chartCaloriesMax) * 120));
                      const tdeeHeight = Math.max(4, Math.round((day.tdee / chartCaloriesMax) * 120));
                      return (
                        <Box key={`cal-${day.date}`} sx={{ display: "grid", gap: 0.7, justifyItems: "center" }}>
                          <Box sx={{ display: "flex", gap: 0.5, alignItems: "end", minHeight: 124 }}>
                            <Box
                              title={`${day.date} calorías: ${Math.round(day.calories)} kcal`}
                              sx={{ width: 10, height: caloriesHeight, bgcolor: "primary.main", borderRadius: 0.8 }}
                            />
                            <Box
                              title={`${day.date} TDEE: ${Math.round(day.tdee)} kcal`}
                              sx={{ width: 10, height: tdeeHeight, bgcolor: "warning.main", borderRadius: 0.8 }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {day.shortDate}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ display: "grid", gap: 1.1 }}>
                  <Typography variant="h6">Macros por día (7 días)</Typography>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                      <Box component="span" sx={{ width: 10, height: 10, bgcolor: "success.main", borderRadius: "50%" }} />
                      Proteína
                    </Typography>
                    <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                      <Box component="span" sx={{ width: 10, height: 10, bgcolor: "info.main", borderRadius: "50%" }} />
                      Carbohidratos
                    </Typography>
                    <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                      <Box component="span" sx={{ width: 10, height: 10, bgcolor: "error.main", borderRadius: "50%" }} />
                      Grasas
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 1,
                      alignItems: "end",
                      minHeight: 170,
                    }}
                  >
                    {last7HistoryChart.map((day) => {
                      const total = Number(day.protein || 0) + Number(day.carbs || 0) + Number(day.fat || 0);
                      const totalHeight = Math.max(4, Math.round((total / chartMacrosMax) * 120));
                      const proteinH = total > 0 ? Math.max(2, Math.round((Number(day.protein || 0) / total) * totalHeight)) : 0;
                      const carbsH = total > 0 ? Math.max(2, Math.round((Number(day.carbs || 0) / total) * totalHeight)) : 0;
                      const fatH = total > 0 ? Math.max(2, totalHeight - proteinH - carbsH) : 0;
                      return (
                        <Box key={`mac-${day.date}`} sx={{ display: "grid", gap: 0.7, justifyItems: "center" }}>
                          <Box
                            title={`${day.date} P:${Math.round(day.protein)} C:${Math.round(day.carbs)} G:${Math.round(day.fat)} g`}
                            sx={{
                              display: "flex",
                              flexDirection: "column-reverse",
                              width: 18,
                              minHeight: 124,
                              justifyContent: "flex-start",
                            }}
                          >
                            <Box sx={{ height: fatH, bgcolor: "error.main", borderRadius: 0.6 }} />
                            <Box sx={{ height: carbsH, bgcolor: "info.main", borderRadius: 0.6 }} />
                            <Box sx={{ height: proteinH, bgcolor: "success.main", borderRadius: 0.6 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {day.shortDate}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ display: "grid", gap: 1.2 }}>
                  <Typography variant="h6">Evolución histórica por fecha</Typography>
                  <TextField
                    label="Fecha"
                    type="date"
                    value={historyDate || todayKey}
                    onChange={(event) => setHistoryDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ maxWidth: 220 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {historyDate === todayKey ? "Hoy" : historyDate ? `Fecha: ${historyDate}` : "Sin fecha"}
                  </Typography>
                  <Divider />
                  <Typography variant="body1">Calorías: {Math.round(historyTotals.calories)} kcal</Typography>
                  <Typography variant="body1">Proteína: {Math.round(historyTotals.protein)} g</Typography>
                  <Typography variant="body1">Carbohidratos: {Math.round(historyTotals.carbs)} g</Typography>
                  <Typography variant="body1">Grasas: {Math.round(historyTotals.fat)} g</Typography>
                  <Typography variant="body1">
                    Balance: {Math.round(historyBalance.balance)} kcal (TDEE {Math.round(historyTdee)} kcal)
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.8 }}>
                    Comidas registradas: {historyTotals.mealsCount}
                  </Typography>
                  {historyMeals.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay comidas registradas para esa fecha.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "grid", gap: 0.5 }}>
                      {historyMeals.map((meal) => (
                        <Typography key={meal.id} variant="body2">
                          {mealTypeLabel(meal?.mealType)} · {meal.name}
                          {meal?.brand ? ` · ${meal.brand}` : ""} — {Math.round(Number(meal?.calories || 0))} kcal
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {dailyStatusTab !== 2 && (
            <Box>
              <Button variant="outlined" onClick={() => openAdaptiveDrawer("progreso")}>
                Ver análisis adaptativo
              </Button>
            </Box>
          )}
        </Box>
      )}

      {activeSection === "plan" && (
        <Box sx={sectionStackSx}>
          <Suspense fallback={<NutritionSectionFallback rows={3} />}>
            <DailyMealPlan
              dailyCaloriesTarget={tdee}
              recipes={recipes}
              foodCatalog={foodCatalog}
            />
            <WeeklyMealPlanner
              dailyCaloriesTarget={tdee}
              recipes={recipes}
              foodCatalog={foodCatalog}
            />
            <ShoppingListCard
              dailyCaloriesTarget={tdee}
              recipes={recipes}
              foodCatalog={foodCatalog}
            />
          </Suspense>
        </Box>
      )}

      {activeSection === "work" && (
        <Box sx={sectionStackSx}>
          <Suspense fallback={<NutritionSectionFallback rows={2} />}>
            <NutritionTools profileId={profileId} />
          </Suspense>
        </Box>
      )}

      <Suspense fallback={null}>
        <AdaptiveInsightDrawer
          open={showAdaptiveDrawer}
          onClose={() => setShowAdaptiveDrawer(false)}
          calorieHistory={calorieHistory}
          weightHistory={weightHistory}
          currentTargetCalories={currentTargetCalories}
          focusSection={adaptiveDrawerSection}
        />
      </Suspense>
    </Box>
  );
}
