import { useEffect, useMemo, useState } from "react";
import { Box, Button, Divider, Typography } from "@mui/material";
import NutritionSummary from "./NutritionSummary";
import EnergyBalanceCard from "./EnergyBalanceCard";
import MealSuggestions from "./MealSuggestions";
import DailyMealPlan from "./DailyMealPlan";
import WeeklyMealPlanner from "./WeeklyMealPlanner";
import ShoppingListCard from "./ShoppingListCard";
import NutritionLog from "./NutritionLog";
import WeightProjection from "./WeightProjection";
import NutritionEvaluation from "./NutritionEvaluation";
import NutritionAlerts from "./NutritionAlerts";
import AdaptiveCalorieAdjustment from "./AdaptiveCalorieAdjustment";
import AdaptiveInsightDrawer from "./AdaptiveInsightDrawer";
import WorkNutritionTools from "./WorkNutritionTools";
import { getMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateCalorieBalance, calculateTDEEDynamic } from "../../utils/metabolism";
import { recipes } from "../../data/recipes";
import { foodCatalog } from "../../data/foodCatalog";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferMealTypeByHour() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

export default function NutritionPage({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "registro",
  onNutritionDataChange,
}) {
  const [meals, setMeals] = useState([]);
  const [showAdaptiveDrawer, setShowAdaptiveDrawer] = useState(false);
  const [adaptiveDrawerSection, setAdaptiveDrawerSection] = useState("progreso");
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
    () => calculateTDEEDynamic(profile, metricsForTdee),
    [profile, metricsForTdee]
  );
  const calorieBalance = useMemo(
    () => calculateCalorieBalance(totalsToday.calories, tdee),
    [totalsToday.calories, tdee]
  );
  const suggestedMealType = useMemo(() => inferMealTypeByHour(), []);
  const currentWeight = Number(profile?.weight ?? profile?.peso ?? 0);
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
        const tdeeForDate = calculateTDEEDynamic(profile, {
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
  }, [meals, metricsLog, profile]);
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
  const openAdaptiveDrawer = (section = "progreso") => {
    setAdaptiveDrawerSection(section);
    setShowAdaptiveDrawer(true);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="h4">Nutrición</Typography>
      <Divider />

      {activeSection === "registro" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <NutritionLog
            profileId={profileId}
            meals={meals}
            onMealsChange={setMeals}
            onDataChange={onNutritionDataChange}
          />
        </Box>
      )}

      {activeSection === "estado" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <NutritionSummary
            profile={profile}
            meals={meals}
            tdeeOverride={tdee}
            activityMetrics={metricsForTdee}
          />
          <EnergyBalanceCard caloriesConsumed={totalsToday.calories} tdee={tdee} />
          <MealSuggestions
            dailyCaloriesTarget={tdee}
            dailyCaloriesConsumed={totalsToday.calories}
            recipes={recipes}
            foodCatalog={foodCatalog}
            mealType={suggestedMealType}
          />
          <WeightProjection currentWeight={currentWeight} dailyBalance={calorieBalance.balance} />
          <NutritionEvaluation totals={totalsToday} profile={profile} tdee={tdee} />
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
            <Button variant="outlined" onClick={() => openAdaptiveDrawer("progreso")}>
              Ver análisis adaptativo
            </Button>
          </Box>
        </Box>
      )}

      {activeSection === "plan" && (
        <Box sx={{ display: "grid", gap: 2 }}>
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
        </Box>
      )}

      {activeSection === "work" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <WorkNutritionTools />
        </Box>
      )}

      <AdaptiveInsightDrawer
        open={showAdaptiveDrawer}
        onClose={() => setShowAdaptiveDrawer(false)}
        calorieHistory={calorieHistory}
        weightHistory={weightHistory}
        currentTargetCalories={currentTargetCalories}
        focusSection={adaptiveDrawerSection}
      />
    </Box>
  );
}
