import { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Skeleton, Tab, Tabs, TextField, Typography } from "@mui/material";
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
import NutritionTools from "./NutritionTools";
import { getMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateCalorieBalance, calculateTDEEDynamic } from "../../utils/metabolism";
import { estimateHungerFromMeals } from "../../utils/hungerEstimate";
import { recipes } from "../../data/recipes";
import { foodCatalog } from "../../data/foodCatalog";

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

function tabLabelDot(color, text) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color,
          flex: "0 0 auto",
        }}
      />
      <Box component="span">{text}</Box>
    </Box>
  );
}

export default function NutritionPage({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "registro",
  onNutritionDataChange,
}) {
  const sectionStackSx = {
    display: "grid",
    gap: 2,
  };
  const sectionHeaderSx = {
    display: "grid",
    gap: 0.4,
    p: 1.5,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    bgcolor: "background.paper",
  };
  const tabsContainerSx = {
    px: 0.6,
    py: 0.4,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    bgcolor: "background.paper",
  };
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
      calculateTDEEDynamic(profile, {
        steps: Number(historyMetricEntry?.steps || 0),
        activeKcal: Number(historyMetricEntry?.activeKcal || 0),
      }),
    [historyMetricEntry?.activeKcal, historyMetricEntry?.steps, profile]
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
      const tdeeForDate = calculateTDEEDynamic(profile, {
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
  }, [meals, metricsLog, profile, todayKey]);
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
    <Box sx={{ ...sectionStackSx, pb: 1 }}>
      <Box sx={sectionHeaderSx}>
        <Typography variant="h4">Nutrición</Typography>
        <Typography variant="body2" color="text.secondary">
          Registro, estado diario, planificación y herramientas prácticas.
        </Typography>
      </Box>
      <Divider />

      {activeSection === "registro" && (
        <Box sx={sectionStackSx}>
          {!nutritionReady ? (
            <Card variant="outlined">
              <CardContent sx={{ display: "grid", gap: 1 }}>
                <Skeleton variant="text" width={220} height={34} />
                <Skeleton variant="rounded" height={56} />
                <Skeleton variant="rounded" height={120} />
              </CardContent>
            </Card>
          ) : (
          <NutritionLog
            profileId={profileId}
            meals={meals}
            onMealsChange={setMeals}
            onDataChange={onNutritionDataChange}
          />
          )}
        </Box>
      )}

      {activeSection === "estado" && (
        <Box sx={sectionStackSx}>
          <Box sx={tabsContainerSx}>
            <Tabs
              value={dailyStatusTab}
              onChange={(_, value) => setDailyStatusTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab label={tabLabelDot("primary.main", "Resumen")} />
              <Tab label={tabLabelDot("warning.main", "Balance y proyección")} />
              <Tab label={tabLabelDot("success.main", "Adaptativo")} />
              <Tab label={tabLabelDot("info.main", "Historial")} />
            </Tabs>
          </Box>

          {dailyStatusTab === 0 && (
            <Box sx={sectionStackSx}>
              <Card variant="outlined">
                <CardContent sx={{ display: "grid", gap: 1 }}>
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
              <NutritionSummary
                profile={profile}
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
              <NutritionEvaluation totals={totalsToday} profile={profile} tdee={tdee} />
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
                <Button variant="outlined" onClick={() => openAdaptiveDrawer("progreso")}>
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
        <Box sx={sectionStackSx}>
          <NutritionTools profileId={profileId} />
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
