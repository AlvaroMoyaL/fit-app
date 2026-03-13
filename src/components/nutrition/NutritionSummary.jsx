import { useMemo } from "react";
import { Box, Card, CardContent, Chip, Divider, Typography } from "@mui/material";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import {
  calculateBMR,
  calculateCalorieBalance,
  calculateTDEEDynamic,
} from "../../utils/metabolism";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusLabel(status) {
  if (status === "deficit") return "Deficit calorico";
  if (status === "maintenance") return "Mantenimiento";
  return "Superavit calorico";
}

function statusColor(status) {
  if (status === "deficit") return "success.main";
  if (status === "maintenance") return "warning.main";
  return "error.main";
}

export default function NutritionSummary({ profile, meals, tdeeOverride, activityMetrics = {} }) {
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const totals = useMemo(() => calculateDailyTotals(mealsToday), [mealsToday]);
  const bmr = useMemo(() => calculateBMR(profile), [profile]);
  const tdee = useMemo(() => {
    const override = Number(tdeeOverride);
    if (Number.isFinite(override) && override > 0) return override;
    return calculateTDEEDynamic(profile, activityMetrics);
  }, [activityMetrics, profile, tdeeOverride]);
  const calorieBalance = useMemo(
    () => calculateCalorieBalance(totals.calories, tdee),
    [totals.calories, tdee]
  );
  const roundedBmr = Math.round(bmr);
  const roundedTdee = Math.round(tdee);
  const roundedBalance = Math.round(calorieBalance.balance);
  const balanceSign = roundedBalance > 0 ? `+${roundedBalance}` : `${roundedBalance}`;
  const statCardSx = {
    p: 1,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1.6,
    bgcolor: "background.paper",
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.2 }}>
        <Typography variant="h6">Resumen nutricional del día</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
            gap: 1,
          }}
        >
          <Box sx={statCardSx}>
            <Typography variant="caption" color="text.secondary">Calorías</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{Math.round(totals.calories)} kcal</Typography>
          </Box>
          <Box sx={statCardSx}>
            <Typography variant="caption" color="text.secondary">Proteína</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{Math.round(totals.protein)} g</Typography>
          </Box>
          <Box sx={statCardSx}>
            <Typography variant="caption" color="text.secondary">Carbohidratos</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{Math.round(totals.carbs)} g</Typography>
          </Box>
          <Box sx={statCardSx}>
            <Typography variant="caption" color="text.secondary">Grasas</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{Math.round(totals.fat)} g</Typography>
          </Box>
          <Box sx={statCardSx}>
            <Typography variant="caption" color="text.secondary">Comidas</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{totals.mealsCount}</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle1">Balance energetico</Typography>
        <Typography variant="body2">Calorías consumidas: {totals.calories} kcal</Typography>
        <Typography variant="body2">BMR estimado: {roundedBmr || 0} kcal</Typography>
        <Typography variant="body2">Gasto estimado (TDEE): {roundedTdee || 0} kcal</Typography>
        <Typography variant="body2">
          Pasos considerados: {Math.round(Number(activityMetrics?.steps || 0))}
        </Typography>
        <Typography variant="body2">Balance: {balanceSign} kcal</Typography>
        <Box>
          <Chip
            size="small"
            label={`Estado: ${statusLabel(calorieBalance.status)}`}
            sx={{
              color: statusColor(calorieBalance.status),
              borderColor: statusColor(calorieBalance.status),
              bgcolor: "transparent",
              fontWeight: 700,
            }}
            variant="outlined"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
