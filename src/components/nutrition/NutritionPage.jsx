import { useEffect, useMemo, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import NutritionSummary from "./NutritionSummary";
import EnergyBalanceCard from "./EnergyBalanceCard";
import NutritionLog from "./NutritionLog";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WeightProjection from "./WeightProjection";
import NutritionEvaluation from "./NutritionEvaluation";
import { getMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateCalorieBalance, calculateTDEE } from "../../utils/metabolism";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function NutritionPage({ profileId, profile }) {
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
  const tdee = useMemo(() => calculateTDEE(profile), [profile]);
  const calorieBalance = useMemo(
    () => calculateCalorieBalance(totalsToday.calories, tdee),
    [totalsToday.calories, tdee]
  );
  const currentWeight = Number(profile?.weight ?? profile?.peso ?? 0);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="h4">Nutrición</Typography>
      <Divider />
      <NutritionSummary profile={profile} meals={meals} />
      <EnergyBalanceCard caloriesConsumed={totalsToday.calories} tdee={tdee} />
      <WeightProjection currentWeight={currentWeight} dailyBalance={calorieBalance.balance} />
      <NutritionEvaluation totals={totalsToday} profile={profile} tdee={tdee} />
      <NutritionLog profileId={profileId} meals={meals} onMealsChange={setMeals} />
      <CasinoMealEvaluator />
    </Box>
  );
}
