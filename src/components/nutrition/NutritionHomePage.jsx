import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { Box, Tabs, Tab, Typography } from "@mui/material";

import NutritionDashboard from "./NutritionDashboard";
import NutritionSectionNav from "./NutritionSectionNav";
import NutritionAlerts from "./NutritionAlerts";
import NutritionInsights from "./NutritionInsights";
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

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gap: 1.4,
          p: { xs: 2.2, md: 2.8 },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 4,
          bgcolor: "background.paper",
          backgroundImage:
            "linear-gradient(140deg, rgba(15, 118, 110, 0.18) 0%, rgba(255,255,255,0) 42%), radial-gradient(circle at top right, rgba(15, 118, 110, 0.12), rgba(255,255,255,0) 34%)",
          boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
        }}
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
