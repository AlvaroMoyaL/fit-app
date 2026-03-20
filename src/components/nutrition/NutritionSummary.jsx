import { useMemo } from "react";
import { Box, Card, CardContent, Chip, Divider, Typography } from "@mui/material";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import {
  calculateBMR,
  calculateCalorieBalance,
  calculateTDEEDynamic,
} from "../../utils/metabolism";
import { nutritionSurfaceSx } from "./nutritionUi";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusLabel(status) {
  if (status === "deficit") return "Déficit calórico";
  if (status === "maintenance") return "Mantenimiento";
  return "Superávit calórico";
}

function statusColor(status) {
  if (status === "deficit") return "success.main";
  if (status === "maintenance") return "warning.main";
  return "error.main";
}

export default function NutritionSummary({ profile, meals, tdeeOverride, activityMetrics = {}, embedded = false }) {
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

  const content = (
    <>
      <Typography variant={embedded ? "subtitle1" : "h6"}>Resumen nutricional del día</Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            xl: "repeat(5, minmax(0, 1fr))",
          },
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
      <Divider sx={{ my: 0.35 }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 1,
        }}
      >
        <Box sx={statCardSx}>
          <Typography variant="caption" color="text.secondary">BMR estimado</Typography>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>{roundedBmr || 0} kcal</Typography>
          <Typography variant="body2" color="text.secondary">
            Pasos considerados: {Math.round(Number(activityMetrics?.steps || 0))}
          </Typography>
        </Box>
        <Box
          sx={{
            ...statCardSx,
            display: "grid",
            gap: 0.6,
          }}
        >
          <Typography variant="caption" color="text.secondary">Balance energético</Typography>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {balanceSign} kcal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            TDEE estimado: {roundedTdee || 0} kcal
          </Typography>
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
        </Box>
      </Box>
    </>
  );

  if (embedded) {
    return (
      <Box sx={(theme) => ({ ...nutritionSurfaceSx(theme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1.2 })}>
        {content}
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.2 }}>
        {content}
      </CardContent>
    </Card>
  );
}
