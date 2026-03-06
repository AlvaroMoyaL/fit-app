import { useEffect, useMemo, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import NutritionSummary from "./NutritionSummary";
import EnergyBalanceCard from "./EnergyBalanceCard";
import MealSuggestions from "./MealSuggestions";
import DailyMealPlan from "./DailyMealPlan";
import WeeklyMealPlanner from "./WeeklyMealPlanner";
import ShoppingListCard from "./ShoppingListCard";
import NutritionLog from "./NutritionLog";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WeightProjection from "./WeightProjection";
import NutritionEvaluation from "./NutritionEvaluation";
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
}) {
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

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="h4">Nutrición</Typography>
      <Divider />

      {activeSection === "registro" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <NutritionLog profileId={profileId} meals={meals} onMealsChange={setMeals} />
          <CasinoMealEvaluator />
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
    </Box>
  );
}
