import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getMeals, saveMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateTDEEDynamic } from "../../utils/metabolism";
import { foodCatalog } from "../../data/foodCatalog";
import { getCustomFoods } from "../../utils/customFoodsStorage";
import {
  getNutritionInformationalMetricState,
  getNutritionMetricState,
  nutritionSurfaceSx,
} from "./nutritionUi";

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateMicroTargets() {
  return {
    fiber: 28,
    sodium: 2300,
    cholesterol: 300,
  };
}

function HeroMetricCard({ label, valueText, helperText, state }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: state.background,
        border: `1px solid ${state.border}`,
        display: "grid",
        gap: 0.7,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}
        >
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: state.accent, fontWeight: 800 }}>
          {state.label}
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ lineHeight: 1 }}>
        {valueText}
      </Typography>
      <Box sx={{ height: 7, borderRadius: 999, bgcolor: state.track, overflow: "hidden" }}>
        <Box
          sx={{
            width: `${Math.max(6, Math.round((state.progress || 0) * 100))}%`,
            height: "100%",
            borderRadius: 999,
            bgcolor: state.fill,
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
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
    if (!brandKey && !lookup.has(`${nameKey}::`)) lookup.set(`${nameKey}::`, item);
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
    const source = foodLookup.get(`${nameKey}::${brandKey}`) || foodLookup.get(`${nameKey}::`) || null;
    if (!source) return meal;
    const ratio = getMealRatio(meal);
    if (!ratio) return meal;
    const nextMeal = {
      ...meal,
      sodium: meal?.sodium ?? Number((Number(source?.sodium || 0) * ratio).toFixed(2)),
      sugars: meal?.sugars ?? Number((Number(source?.sugars || 0) * ratio).toFixed(2)),
      fiber: meal?.fiber ?? Number((Number(source?.fiber || 0) * ratio).toFixed(2)),
      saturatedFat:
        meal?.saturatedFat ?? Number((Number(source?.saturatedFat || 0) * ratio).toFixed(2)),
      transFat: meal?.transFat ?? Number((Number(source?.transFat || 0) * ratio).toFixed(2)),
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

export default function NutritionSidePanel({ profileId, profile, metricsLog = [] }) {
  const theme = useTheme();
  const [meals, setMeals] = useState([]);
  const todayKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    if (!profileId) {
      setMeals([]);
      return;
    }
    setMeals(getMeals(profileId));
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const lookup = buildFoodLookup([...foodCatalog, ...getCustomFoods(profileId)]);
    const enriched = enrichMealsWithStoredNutrients(meals, lookup);
    if (!enriched.changed) return;
    saveMeals(profileId, enriched.meals);
    setMeals(enriched.meals);
  }, [meals, profileId]);

  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const totalsToday = useMemo(() => calculateDailyTotals(mealsToday), [mealsToday]);
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
    return { ...profile, weight: latestRecordedWeight, peso: latestRecordedWeight };
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
    [metricsForTdee, nutritionProfile]
  );
  const microTargets = useMemo(() => calculateMicroTargets(), []);
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
    () => getNutritionInformationalMetricState(theme, totalsToday.cholesterol, microTargets.cholesterol),
    [microTargets.cholesterol, theme, totalsToday.cholesterol]
  );
  const mealsState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.mealsCount, 4, { lowWarnRatio: 0.5, overWarnRatio: 1.5 }),
    [theme, totalsToday.mealsCount]
  );
  const surfaceSx = (muiTheme) => ({
    ...nutritionSurfaceSx(muiTheme),
    p: 1.2,
    display: "grid",
    gap: 1.1,
  });

  return (
    <Box
      sx={(muiTheme) => ({
        display: "grid",
        gap: 1.4,
        position: { xs: "static", lg: "sticky" },
        top: { lg: 88 },
        width: "100%",
        minWidth: 0,
        p: { xs: 0, xl: 1.2 },
        borderRadius: { xl: "24px" },
        bgcolor: { xl: muiTheme.palette.background.paper },
        border: { xl: `1px solid ${muiTheme.palette.divider}` },
        boxShadow: {
          xl:
            muiTheme.palette.mode === "dark"
              ? "0 12px 28px rgba(0, 0, 0, 0.18)"
              : "0 10px 24px rgba(15, 23, 42, 0.045)",
        },
      })}
    >
      <Box sx={surfaceSx}>
        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.12em" }}>
          KPIs de apoyo
        </Typography>
        <HeroMetricCard label="Comidas" valueText={`${Math.round(totalsToday.mealsCount || 0)}`} helperText="bloques lógicos del día" state={mealsState} />
        <HeroMetricCard label="Fibra" valueText={`${Math.round(totalsToday.fiber || 0)} / ${Math.round(microTargets.fiber || 0)} g`} helperText={`objetivo FDA: ${Math.round(microTargets.fiber || 0)} g`} state={fiberState} />
        <HeroMetricCard label="Sodio" valueText={`${Math.round(totalsToday.sodium || 0)} / ${Math.round(microTargets.sodium || 0)} mg`} helperText={`límite diario: ${Math.round(microTargets.sodium || 0)} mg`} state={sodiumState} />
        <HeroMetricCard label="Azúcares totales" valueText={`${Math.round(totalsToday.sugars || 0)} / ${Math.round(sugarReference || 0)} g`} helperText={`referencia flexible: ${Math.round(sugarReference || 0)} g · incluye fruta y lácteos`} state={sugarsState} />
        <HeroMetricCard label="Grasa saturada" valueText={`${Math.round(totalsToday.saturatedFat || 0)} / ${Math.round(saturatedFatReference || 0)} g`} helperText={`límite aprox.: ${Math.round(saturatedFatReference || 0)} g`} state={saturatedFatState} />
        <HeroMetricCard label="Colesterol" valueText={`${Math.round(totalsToday.cholesterol || 0)} / ${Math.round(microTargets.cholesterol || 0)} mg`} helperText={`referencia clásica: ${Math.round(microTargets.cholesterol || 0)} mg · hoy se prioriza más la grasa saturada`} state={cholesterolState} />
      </Box>
    </Box>
  );
}
