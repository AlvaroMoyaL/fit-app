import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { Box, Tabs, Tab, Typography } from "@mui/material";

import NutritionDashboard from "./NutritionDashboard";
import NutritionSectionNav from "./NutritionSectionNav";
import NutritionAlerts from "./NutritionAlerts";
import NutritionInsights from "./NutritionInsights";
import AdaptiveMealSuggestions from "./AdaptiveMealSuggestions";
import { nutritionHeroSx } from "./nutritionUi";
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

function inferMealTiming() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 23) return "dinner";
  return "snack";
}

export default function NutritionHomePage({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "home",
  onChangeActiveSection,
}) {
  const [tab, setTab] = useState(0);
  const [meals, setMeals] = useState([]);
  const todayKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    if (!profileId) {
      setMeals([]);
      return;
    }
    setMeals(getMeals(profileId));
  }, [profileId]);

  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const totalsToday = useMemo(() => calculateDailyTotals(mealsToday), [mealsToday]);
  const latestMetric = useMemo(() => {
    const safeLog = Array.isArray(metricsLog) ? metricsLog : [];
    return [...safeLog].reverse().find((entry) => entry?.date === todayKey) || safeLog[safeLog.length - 1] || {};
  }, [metricsLog, todayKey]);
  const bodyWeightKg = Number(profile?.weight ?? profile?.peso ?? latestMetric?.weight || 0);
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
