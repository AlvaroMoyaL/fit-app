import { Suspense, lazy, startTransition, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
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
import {
  buildNutritionTargetExplanations,
  calculateMicroTargets,
  calculateNutritionTargets,
} from "../../utils/nutritionTargets";
import { recipes } from "../../data/recipes";
import { foodCatalog } from "../../data/foodCatalog";
import { getCustomFoods } from "../../utils/customFoodsStorage";
import { getCustomRecipes } from "../../utils/customRecipesStorage";
import WorkspaceHeader from "../WorkspaceHeader";
import {
  getNutritionMetricState,
  nutritionCompactTabsSx,
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
const CorrectiveDayPlan = lazy(() => import("./CorrectiveDayPlan"));
const NextDayRecoveryCard = lazy(() => import("./NextDayRecoveryCard"));

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

function NutritionWorkspacePanel({
  eyebrow,
  title,
  description,
  children,
  id,
  action = null,
}) {
  return (
    <Box id={id} className="workspace-panel" sx={{ gap: { xs: 1.15, sm: 1.4 } }}>
      <Box
        className="workspace-section-head"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1.2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "grid", gap: 0.65, minWidth: 0 }}>
          {eyebrow ? (
            <Typography component="p" className="workspace-section-kicker">
              {eyebrow}
            </Typography>
          ) : null}
          <Typography
            component="h3"
            sx={{
              m: 0,
              fontSize: { xs: "1.24rem", sm: "1.42rem" },
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography component="p" className="workspace-section-copy" sx={{ m: 0 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {action ? <Box>{action}</Box> : null}
      </Box>
      {children}
    </Box>
  );
}

function HeroMetricCard({ label, valueText, helperText, state, infoText }) {
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.35, minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, fontSize: { xs: "0.64rem", sm: "0.72rem" } }}
          >
            {label}
          </Typography>
          {infoText ? (
            <Tooltip
              title={
                <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                  {infoText}
                </Typography>
              }
              arrow
              enterTouchDelay={0}
            >
              <IconButton
                size="small"
                sx={{
                  p: 0.15,
                  color: "text.secondary",
                  "&:hover": { color: "text.primary" },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    border: "1px solid currentColor",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  i
                </Box>
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
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
      {helperText ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.66rem", sm: "0.72rem" } }}
        >
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}

function HistoryChartLegendItem({ color, label }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}
    >
      <Box
        component="span"
        sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
      />
      {label}
    </Typography>
  );
}

function HistoryChartPreviewCard({ title, description, legendItems, onExpand, children }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onExpand}
      aria-label={`Ampliar gráfico ${title}`}
      sx={(muiTheme) => ({
        ...nutritionSurfaceSx(muiTheme),
        p: { xs: 1.2, sm: 1.4 },
        display: "grid",
        gap: 1.1,
        width: "100%",
        textAlign: "left",
        appearance: "none",
        WebkitAppearance: "none",
        color: "inherit",
        font: "inherit",
        cursor: "zoom-in",
        transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-1px)",
          borderColor: muiTheme.palette.primary.main,
          boxShadow: muiTheme.shadows[4],
        },
        "&:focus-visible": {
          outline: `2px solid ${muiTheme.palette.primary.main}`,
          outlineOffset: 3,
        },
      })}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1.2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "grid", gap: 0.35, minWidth: 0 }}>
          <Typography variant="subtitle1">{title}</Typography>
          {description ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        <Chip size="small" variant="outlined" label="Ampliar" sx={{ fontWeight: 700 }} />
      </Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        {legendItems.map((item) => (
          <HistoryChartLegendItem key={item.label} color={item.color} label={item.label} />
        ))}
      </Box>
      {children}
    </Box>
  );
}

function NutritionCaloriesHistoryChart({ data = [], chartMax = 1, expanded = false }) {
  const days = Array.isArray(data) ? data : [];
  const columns = Math.max(days.length, 1);
  const safeMax = Math.max(Number(chartMax || 0), 1);

  return (
    <Box sx={{ overflowX: "auto", pb: expanded ? 0.6 : 0.3, scrollbarWidth: "thin" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: expanded
            ? {
                xs: `repeat(${columns}, minmax(72px, 1fr))`,
                sm: `repeat(${columns}, minmax(92px, 1fr))`,
              }
            : `repeat(${columns}, minmax(48px, 1fr))`,
          gap: expanded ? { xs: 1, sm: 1.4 } : 1,
          alignItems: "end",
          minHeight: expanded ? 300 : 170,
          minWidth: expanded ? { xs: columns * 74, sm: "100%" } : undefined,
        }}
      >
        {days.map((day) => {
          const caloriesHeight = Math.max(4, Math.round((Number(day?.calories || 0) / safeMax) * (expanded ? 214 : 120)));
          const tdeeHeight = Math.max(4, Math.round((Number(day?.tdee || 0) / safeMax) * (expanded ? 214 : 120)));

          return (
            <Box
              key={`cal-${day.date}`}
              sx={{ display: "grid", gap: expanded ? 0.9 : 0.7, justifyItems: "center" }}
            >
              {expanded ? (
                <Box sx={{ display: "grid", gap: 0.2, justifyItems: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
                    {Math.round(day.calories)} kcal
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "warning.main", lineHeight: 1 }}>
                    {Math.round(day.tdee)} kcal
                  </Typography>
                </Box>
              ) : null}
              <Box
                sx={{
                  display: "flex",
                  gap: expanded ? 0.8 : 0.5,
                  alignItems: "end",
                  justifyContent: "center",
                  width: "100%",
                  minHeight: expanded ? 220 : 124,
                }}
              >
                <Box
                  title={`${day.date} calorías: ${Math.round(day.calories)} kcal`}
                  sx={{
                    width: expanded ? 16 : 10,
                    height: caloriesHeight,
                    bgcolor: "primary.main",
                    borderRadius: 0.8,
                  }}
                />
                <Box
                  title={`${day.date} TDEE: ${Math.round(day.tdee)} kcal`}
                  sx={{
                    width: expanded ? 16 : 10,
                    height: tdeeHeight,
                    bgcolor: "warning.main",
                    borderRadius: 0.8,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {day.shortDate}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function NutritionMacrosHistoryChart({ data = [], chartMax = 1, expanded = false }) {
  const days = Array.isArray(data) ? data : [];
  const columns = Math.max(days.length, 1);
  const safeMax = Math.max(Number(chartMax || 0), 1);

  return (
    <Box sx={{ overflowX: "auto", pb: expanded ? 0.6 : 0.3, scrollbarWidth: "thin" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: expanded
            ? {
                xs: `repeat(${columns}, minmax(72px, 1fr))`,
                sm: `repeat(${columns}, minmax(92px, 1fr))`,
              }
            : `repeat(${columns}, minmax(48px, 1fr))`,
          gap: expanded ? { xs: 1, sm: 1.4 } : 1,
          alignItems: "end",
          minHeight: expanded ? 300 : 170,
          minWidth: expanded ? { xs: columns * 74, sm: "100%" } : undefined,
        }}
      >
        {days.map((day) => {
          const total = Number(day.protein || 0) + Number(day.carbs || 0) + Number(day.fat || 0);
          const totalHeight = Math.max(4, Math.round((total / safeMax) * (expanded ? 214 : 120)));
          const proteinH = total > 0 ? Math.max(2, Math.round((Number(day.protein || 0) / total) * totalHeight)) : 0;
          const carbsH = total > 0 ? Math.max(2, Math.round((Number(day.carbs || 0) / total) * totalHeight)) : 0;
          const fatH = total > 0 ? Math.max(0, totalHeight - proteinH - carbsH) : 0;

          return (
            <Box
              key={`mac-${day.date}`}
              sx={{ display: "grid", gap: expanded ? 0.9 : 0.7, justifyItems: "center" }}
            >
              {expanded ? (
                <Box sx={{ display: "grid", gap: 0.18, justifyItems: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "success.main", lineHeight: 1 }}>
                    P {Math.round(day.protein)} g
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "info.main", lineHeight: 1 }}>
                    C {Math.round(day.carbs)} g
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "error.main", lineHeight: 1 }}>
                    G {Math.round(day.fat)} g
                  </Typography>
                </Box>
              ) : null}
              <Box
                title={`${day.date} P:${Math.round(day.protein)} C:${Math.round(day.carbs)} G:${Math.round(day.fat)} g`}
                sx={{
                  display: "flex",
                  flexDirection: "column-reverse",
                  justifyContent: "flex-start",
                  width: expanded ? 24 : 18,
                  minHeight: expanded ? 220 : 124,
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

function buildNutritionMealState(profileId) {
  return {
    profileKey: String(profileId || ""),
    meals: profileId ? getMeals(profileId) : [],
  };
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeString(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getFirstFiniteNumber(...values) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return 0;
}

function formatDateKey(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  return formatDateKey(value);
}

function inferMealTypeFromTime(entry) {
  const timeValue = safeString(entry?.time || entry?.loggedTime || entry?.consumedTime);
  const consumedAt = safeNumber(entry?.consumedAt || entry?.timestamp || entry?.createdAt, 0);

  let hour = -1;
  if (timeValue) {
    const parsedHour = Number(timeValue.split(":")[0]);
    if (Number.isFinite(parsedHour)) {
      hour = parsedHour;
    }
  } else if (consumedAt > 0) {
    hour = new Date(consumedAt).getHours();
  }

  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 23) return "dinner";
  if (hour >= 0) return "snack";
  return "";
}

function normalizeMealType(value, entry) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const aliases = {
    desayuno: "breakfast",
    breakfast: "breakfast",
    desayuno_pm: "breakfast",
    almuerzo: "lunch",
    lunch: "lunch",
    comida: "lunch",
    lunch_box: "lunch",
    cena: "dinner",
    dinner: "dinner",
    supper: "dinner",
    once: "dinner",
    snack: "snack",
    colacion: "snack",
    merienda: "snack",
    tentempie: "snack",
  };

  if (aliases[normalized]) return aliases[normalized];
  if (normalized === "breakfast" || normalized === "lunch" || normalized === "dinner" || normalized === "snack") {
    return normalized;
  }

  return inferMealTypeFromTime(entry) || "snack";
}

function getMealEntryDate(entry, fallbackDate = "") {
  return (
    normalizeDateValue(entry?.date) ||
    normalizeDateValue(entry?.day) ||
    normalizeDateValue(entry?.loggedDate) ||
    normalizeDateValue(entry?.consumedDate) ||
    normalizeDateValue(entry?.timestamp) ||
    normalizeDateValue(entry?.consumedAt) ||
    normalizeDateValue(entry?.createdAt) ||
    safeString(fallbackDate)
  );
}

function getMealEntryVegetableServings(entry) {
  const nutrition = isObject(entry?.nutrition) ? entry.nutrition : {};
  const servings = getFirstFiniteNumber(
    entry?.vegetableServings,
    entry?.vegetables,
    entry?.vegetableCount,
    entry?.vegetablePortions,
    entry?.veggieServings,
    nutrition?.vegetableServings,
    nutrition?.vegetables
  );

  if (servings > 0) return servings;
  return safeNumber(trackVegetableIntake([entry]).servings, 0);
}

function normalizeMealEntry(entry, fallbackDate = "") {
  if (!isObject(entry)) return null;

  const nutrition = isObject(entry?.nutrition) ? entry.nutrition : {};
  const macros = isObject(entry?.macros) ? entry.macros : {};
  const totals = isObject(entry?.totals) ? entry.totals : {};

  return {
    date: getMealEntryDate(entry, fallbackDate),
    type: normalizeMealType(
      entry?.mealType || entry?.type || entry?.slot || entry?.meal || entry?.category,
      entry
    ),
    calories: getFirstFiniteNumber(
      entry?.calories,
      entry?.caloriesConsumed,
      entry?.kcal,
      entry?.energy,
      nutrition?.calories,
      nutrition?.kcal,
      macros?.calories,
      totals?.calories
    ),
    protein: getFirstFiniteNumber(
      entry?.protein,
      entry?.proteins,
      nutrition?.protein,
      nutrition?.proteins,
      macros?.protein,
      totals?.protein
    ),
    carbs: getFirstFiniteNumber(
      entry?.carbs,
      entry?.carbohydrates,
      nutrition?.carbs,
      nutrition?.carbohydrates,
      macros?.carbs,
      totals?.carbs
    ),
    fat: getFirstFiniteNumber(
      entry?.fat,
      entry?.fats,
      nutrition?.fat,
      nutrition?.fats,
      macros?.fat,
      totals?.fat
    ),
    vegetableServings: getMealEntryVegetableServings(entry),
  };
}

function buildRecoveryInsights({
  totals,
  proteinAnalysis,
  vegetableAnalysis,
  macroAnalysis,
  satiety,
  calorieTarget,
}) {
  const calories = Number(totals?.calories || 0);
  const targetCalories = Number(calorieTarget || 0);
  const satietyScore = Number(satiety?.satietyScore || 0);

  return {
    lowProtein: proteinAnalysis?.status !== "optimal",
    lowVegetables: ["low", "very_low"].includes(vegetableAnalysis?.status),
    excessCalories: targetCalories > 0 ? calories > targetCalories * 1.08 : false,
    poorMacroBalance:
      macroAnalysis?.protein?.status === "low" ||
      macroAnalysis?.carbs?.status === "high" ||
      macroAnalysis?.fats?.status === "high",
    lowSatiety: Boolean(satiety?.hasData) && satietyScore < 50,
  };
}

export default function NutritionPage({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "estado",
  onChangeActiveSection,
  onNutritionDataChange,
  showInlineSectionNav = true,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const sectionStackSx = {
    display: "grid",
    gap: { xs: 1.5, sm: 2.25 },
  };
  const tabsContainerSx = nutritionTabsRailSx;
  const statusWorkspaceSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.2fr) minmax(320px, 0.92fr)" },
    gap: { xs: 1.3, md: 1.6 },
    alignItems: "start",
  };
  const statusColumnSx = {
    display: "grid",
    gap: { xs: 1.2, md: 1.4 },
  };
  const historyChartsGridSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
    gap: { xs: 1.2, md: 1.4 },
  };
  const historySummaryGridSx = {
    display: "grid",
    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
    gap: 1,
  };
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
  const [mealState, setMealState] = useState(() => buildNutritionMealState(profileId));
  const [showAdaptiveDrawer, setShowAdaptiveDrawer] = useState(false);
  const [adaptiveDrawerSection, setAdaptiveDrawerSection] = useState("progreso");
  const [expandedHistoryChart, setExpandedHistoryChart] = useState("");
  const [dailyStatusTab, setDailyStatusTab] = useState(0);
  const [historyDate, setHistoryDate] = useState("");
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const currentProfileKey = String(profileId || "");
  const meals = mealState.meals;
  const nutritionReady = mealState.profileKey === currentProfileKey;
  const customFoods = useMemo(
    () => (profileId ? getCustomFoods(profileId) : []),
    [profileId]
  );
  const customRecipes = useMemo(
    () => (profileId ? getCustomRecipes(profileId) : []),
    [profileId]
  );
  const recoveryMatchContext = useMemo(
    () => ({
      customFoods,
      recipes: customRecipes,
    }),
    [customFoods, customRecipes]
  );

  useEffect(() => {
    startTransition(() => {
      setMealState(buildNutritionMealState(profileId));
    });
  }, [profileId]);

  useEffect(() => {
    if (!profileId || !nutritionReady) return;
    const lookup = buildFoodLookup([...foodCatalog, ...customFoods]);
    const enriched = enrichMealsWithStoredNutrients(meals, lookup);
    if (!enriched.changed) return;
    saveMeals(profileId, enriched.meals);
    startTransition(() => {
      setMealState({
        profileKey: currentProfileKey,
        meals: enriched.meals,
      });
    });
  }, [currentProfileKey, customFoods, meals, nutritionReady, profileId]);

  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const availableMealDates = useMemo(() => {
    const unique = new Set((Array.isArray(meals) ? meals : []).map((meal) => meal?.date).filter(Boolean));
    return [...unique].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [meals]);
  const resolvedHistoryDate = useMemo(() => {
    if (historyDate && (availableMealDates.length === 0 || availableMealDates.includes(historyDate))) {
      return historyDate;
    }
    return availableMealDates[0] || todayKey;
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
    () => getMealsForDate(meals, resolvedHistoryDate),
    [meals, resolvedHistoryDate]
  );
  const historyTotals = useMemo(() => calculateDailyTotals(historyMeals), [historyMeals]);
  const historyMetricEntry = useMemo(() => {
    return (Array.isArray(metricsLog) ? metricsLog : []).find((entry) => entry?.date === resolvedHistoryDate) || {};
  }, [metricsLog, resolvedHistoryDate]);
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
    () => calculateNutritionTargets(nutritionProfile, { dailyCalories: tdee }),
    [nutritionProfile, tdee]
  );
  const microTargets = useMemo(
    () => calculateMicroTargets(nutritionProfile, { dailyCalories: tdee }),
    [nutritionProfile, tdee]
  );
  const sugarReference = useMemo(
    () => Number(microTargets.sugars || 0),
    [microTargets.sugars]
  );
  const saturatedFatReference = useMemo(
    () => Number(microTargets.saturatedFat || 0),
    [microTargets.saturatedFat]
  );
  const targetExplanations = useMemo(
    () => buildNutritionTargetExplanations(macroTargets),
    [macroTargets]
  );
  const supportTargetExplanations = useMemo(
    () =>
      buildNutritionTargetExplanations({
        ...macroTargets,
        ...microTargets,
        sugars: sugarReference,
        saturatedFat: saturatedFatReference,
      }),
    [macroTargets, microTargets, saturatedFatReference, sugarReference]
  );
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
        profile: nutritionProfile,
      }),
    [nutritionProfile, totalsToday.protein]
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
        profile: nutritionProfile,
        proteinCalories: totalsToday.protein * 4,
        carbCalories: totalsToday.carbs * 4,
        fatCalories: totalsToday.fat * 9,
        totalCalories: totalsToday.calories,
        meals: mealsToday,
      }),
    [
      currentWeight,
      mealsToday,
      nutritionProfile,
      totalsToday.calories,
      totalsToday.carbs,
      totalsToday.fat,
      totalsToday.protein,
    ]
  );
  const frequentMealSuggestionContext = useMemo(
    () => ({
      caloriesRemaining: Math.max(0, Math.round(currentTargetCalories - totalsToday.calories)),
      calorieDelta: Math.round(currentTargetCalories - totalsToday.calories),
      proteinRemaining: Math.max(0, Math.round(macroTargets.protein - totalsToday.protein)),
      proteinTarget: Math.round(Number(macroTargets.protein || 0)),
      vegetableServings: Number(vegetableAnalysis.servings || 0),
      needsProtein:
        Number(macroTargets.protein || 0) - Number(totalsToday.protein || 0) >= 20 ||
        ["low", "very_low", "slightly_low"].includes(String(proteinAnalysis.status || "")),
      needsVegetables: Number(vegetableAnalysis.servings || 0) < 3,
      macroBalance: {
        protein: macroAnalysis.protein?.status || "good",
        carbs: macroAnalysis.carbs?.status || "good",
        fats: macroAnalysis.fats?.status || "good",
      },
      mealTiming: suggestedMealType,
    }),
    [
      currentTargetCalories,
      macroAnalysis.carbs?.status,
      macroAnalysis.fats?.status,
      macroAnalysis.protein?.status,
      macroTargets.protein,
      proteinAnalysis.status,
      suggestedMealType,
      totalsToday.calories,
      totalsToday.protein,
      vegetableAnalysis.servings,
    ]
  );
  const normalizedMealHistory = useMemo(
    () => getSafeArray(meals).map((entry) => normalizeMealEntry(entry)).filter(Boolean),
    [meals]
  );
  const normalizedTodayMealHistory = useMemo(
    () => normalizedMealHistory.filter((meal) => meal?.date === todayKey),
    [normalizedMealHistory, todayKey]
  );
  const correctiveDeficits = useMemo(
    () =>
      buildRecoveryInsights({
        totals: totalsToday,
        proteinAnalysis,
        vegetableAnalysis,
        macroAnalysis,
        satiety: hungerToday,
        calorieTarget: tdee,
      }),
    [hungerToday, macroAnalysis, proteinAnalysis, tdee, totalsToday, vegetableAnalysis]
  );
  const nextDayRecoveryOptions = useMemo(() => {
    const next = {};

    if (safeNumber(tdee) > 0) {
      next.dailyTargetCalories = safeNumber(tdee);
    }
    if (safeNumber(macroTargets.protein) > 0) {
      next.dailyTargetProtein = safeNumber(macroTargets.protein);
    }

    return next;
  }, [macroTargets.protein, tdee]);
  const recoveryRecentDays = useMemo(() => {
    const metricsByDate = new Map(
      getSafeArray(metricsLog)
        .map((entry) => {
          const key =
            normalizeDateValue(entry?.date) ||
            normalizeDateValue(entry?.day) ||
            normalizeDateValue(entry?.loggedDate) ||
            normalizeDateValue(entry?.timestamp) ||
            normalizeDateValue(entry?.createdAt);
          return key ? [key, entry] : null;
        })
        .filter(Boolean)
    );

    const uniqueDates = Array.from(
      new Set([
        ...normalizedMealHistory.map((meal) => meal?.date).filter(Boolean),
        ...metricsByDate.keys(),
      ])
    )
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
      .slice(0, 7);

    return uniqueDates
      .map((date) => {
        const mealsForDate = normalizedMealHistory.filter((meal) => meal?.date === date);
        const totalsFromMeals = calculateDailyTotals(mealsForDate);
        const metric = metricsByDate.get(date) || {};
        const metricNutrition = isObject(metric?.nutrition) ? metric.nutrition : {};
        const metricTotals = isObject(metric?.totals) ? metric.totals : {};
        const caloriesForDate = getFirstFiniteNumber(
          metric?.calories,
          metric?.caloriesConsumed,
          metric?.kcal,
          metricNutrition?.calories,
          metricNutrition?.kcal,
          metricTotals?.calories,
          totalsFromMeals.calories
        );
        const proteinForDate = getFirstFiniteNumber(
          metric?.protein,
          metric?.proteins,
          metricNutrition?.protein,
          metricNutrition?.proteins,
          metricTotals?.protein,
          totalsFromMeals.protein
        );
        const carbsForDate = getFirstFiniteNumber(
          metric?.carbs,
          metric?.carbohydrates,
          metricNutrition?.carbs,
          metricNutrition?.carbohydrates,
          metricTotals?.carbs,
          totalsFromMeals.carbs
        );
        const fatForDate = getFirstFiniteNumber(
          metric?.fat,
          metric?.fats,
          metricNutrition?.fat,
          metricNutrition?.fats,
          metricTotals?.fat,
          totalsFromMeals.fat
        );
        const trackedVegetables = trackVegetableIntake(mealsForDate);
        const vegetableServingsForDate = getFirstFiniteNumber(
          metric?.vegetableServings,
          metric?.vegetables,
          metricNutrition?.vegetableServings,
          metricNutrition?.vegetables,
          metricTotals?.vegetableServings,
          trackedVegetables.servings
        );
        const hasMeaningfulData =
          mealsForDate.length > 0 ||
          caloriesForDate > 0 ||
          proteinForDate > 0 ||
          carbsForDate > 0 ||
          fatForDate > 0 ||
          vegetableServingsForDate > 0;

        if (!hasMeaningfulData) return null;

        const weightForDate = getFirstFiniteNumber(
          metric?.weight,
          metric?.peso,
          currentWeight,
          nutritionProfile?.weight,
          nutritionProfile?.peso
        );
        const tdeeForDate = calculateTDEEDynamic(nutritionProfile, {
          steps: safeNumber(metric?.steps),
          activeKcal: safeNumber(metric?.activeKcal),
        });
        const macroForDate = analyzeMacroBalance({
          proteinCalories: proteinForDate * 4,
          carbCalories: carbsForDate * 4,
          fatCalories: fatForDate * 9,
          totalCalories: caloriesForDate,
        });
        const proteinForDay = analyzeProteinIntake({
          proteinConsumedGrams: proteinForDate,
          bodyWeightKg: weightForDate,
          profile: {
            ...nutritionProfile,
            weight: weightForDate,
            peso: weightForDate,
          },
        });
        const satietyForDay = estimateHungerFromMeals(mealsForDate);
        const nutritionScoreForDate = calculateDailyNutritionScore({
          caloriesConsumed: caloriesForDate,
          calorieTarget: tdeeForDate,
          proteinGrams: proteinForDate,
          proteinTarget: proteinForDay.proteinTarget,
          macroDistribution: {
            protein: macroForDate.protein?.percent,
            carbs: macroForDate.carbs?.percent,
            fat: macroForDate.fats?.percent,
          },
          vegetableServings: vegetableServingsForDate,
          satietyScore: satietyForDay.satietyScore,
        });

        return {
          date,
          calories: caloriesForDate,
          protein: proteinForDate,
          carbs: carbsForDate,
          fat: fatForDate,
          vegetableServings: vegetableServingsForDate,
          nutritionScore: nutritionScoreForDate,
          alerts: generateNutritionAlerts({
            proteinConsumedGrams: proteinForDate,
            bodyWeightKg: weightForDate,
            profile: {
              ...nutritionProfile,
              weight: weightForDate,
              peso: weightForDate,
            },
            proteinCalories: proteinForDate * 4,
            carbCalories: carbsForDate * 4,
            fatCalories: fatForDate * 9,
            totalCalories: caloriesForDate,
            meals: mealsForDate,
          }),
          insights: buildRecoveryInsights({
            totals: {
              calories: caloriesForDate,
              protein: proteinForDate,
              carbs: carbsForDate,
              fat: fatForDate,
            },
            proteinAnalysis: proteinForDay,
            vegetableAnalysis: {
              ...trackedVegetables,
              servings: vegetableServingsForDate,
            },
            macroAnalysis: macroForDate,
            satiety: satietyForDay,
            calorieTarget: tdeeForDate,
          }),
        };
      })
      .filter(Boolean);
  }, [currentWeight, metricsLog, normalizedMealHistory, nutritionProfile]);
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
  const caloriesHistoryLegend = [
    { color: "primary.main", label: "Calorías" },
    { color: "warning.main", label: "TDEE" },
  ];
  const macrosHistoryLegend = [
    { color: "success.main", label: "Proteína" },
    { color: "info.main", label: "Carbohidratos" },
    { color: "error.main", label: "Grasas" },
  ];
  const expandedHistoryChartConfig =
    expandedHistoryChart === "calories"
      ? {
          title: "Calorías vs TDEE",
          description: "Comparativa ampliada de consumo y gasto estimado en los últimos 7 días.",
          legendItems: caloriesHistoryLegend,
          content: (
            <NutritionCaloriesHistoryChart
              data={last7HistoryChart}
              chartMax={chartCaloriesMax}
              expanded
            />
          ),
        }
      : expandedHistoryChart === "macros"
      ? {
          title: "Macros por día",
          description: "Distribución diaria ampliada de proteína, carbohidratos y grasas en los últimos 7 días.",
          legendItems: macrosHistoryLegend,
          content: (
            <NutritionMacrosHistoryChart
              data={last7HistoryChart}
              chartMax={chartMacrosMax}
              expanded
            />
          ),
        }
      : null;

  return (
    <Box className="nutrition-page-content workspace-view" sx={{ ...sectionStackSx, pb: { xs: 0.4, sm: 1 } }}>
      <WorkspaceHeader
        eyebrow="Estado diario y planificación"
        title="Nutrición"
        description="Estado diario, registro, planificación y herramientas prácticas dentro del mismo marco visual que el resto de la app."
        tags={[
          `TDEE ${Math.round(tdee || 0)} kcal`,
          `Balance ${Math.round(calorieBalance.balance)} kcal`,
          currentWeight ? `Peso ${currentWeight.toFixed(1)} kg` : "Peso sin registro",
          macroTargets.usedAdjustedWeight && macroTargets.effectiveWeightKg
            ? `Peso efectivo ${macroTargets.effectiveWeightKg.toFixed(1)} kg`
            : null,
          `Objetivo prot. ${Math.round(macroTargets.protein || 0)} g`,
        ].filter(Boolean)}
        className="workspace-header-nutrition"
        bodyClassName="workspace-header-body-nutrition"
      >
        <Box sx={heroMetricsRailSx}>
          <HeroMetricCard
            label="Calorías"
            valueText={`${Math.round(totalsToday.calories)} / ${Math.round(macroTargets.calories || 0)}`}
            state={calorieState}
            infoText={targetExplanations.calories}
          />
          <HeroMetricCard
            label="Proteínas"
            valueText={`${Math.round(totalsToday.protein || 0)} / ${Math.round(macroTargets.protein || 0)} g`}
            state={proteinState}
            infoText={targetExplanations.protein}
          />
          <HeroMetricCard
            label="Carbohidratos"
            valueText={`${Math.round(totalsToday.carbs || 0)} / ${Math.round(macroTargets.carbs || 0)} g`}
            state={carbsState}
            infoText={targetExplanations.carbs}
          />
          <HeroMetricCard
            label="Grasas"
            valueText={`${Math.round(totalsToday.fat || 0)} / ${Math.round(macroTargets.fat || 0)} g`}
            state={fatState}
            infoText={targetExplanations.fat}
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
            <HeroMetricCard label="Fibra" valueText={`${Math.round(totalsToday.fiber || 0)} / ${Math.round(microTargets.fiber || 0)} g`} state={fiberState} infoText={supportTargetExplanations.fiber} />
            <HeroMetricCard label="Sodio" valueText={`${Math.round(totalsToday.sodium || 0)} / ${Math.round(microTargets.sodium || 0)} mg`} state={sodiumState} infoText={supportTargetExplanations.sodium} />
            <HeroMetricCard label="Azúcares totales" valueText={`${Math.round(totalsToday.sugars || 0)} / ${Math.round(sugarReference || 0)} g`} state={sugarsState} infoText={supportTargetExplanations.sugars} />
            <HeroMetricCard label="Grasa saturada" valueText={`${Math.round(totalsToday.saturatedFat || 0)} / ${Math.round(saturatedFatReference || 0)} g`} state={saturatedFatState} infoText={supportTargetExplanations.saturatedFat} />
            <HeroMetricCard label="Colesterol" valueText={`${Math.round(totalsToday.cholesterol || 0)} / ${Math.round(microTargets.cholesterol || 0)} mg`} state={cholesterolState} infoText={supportTargetExplanations.cholesterol} />
          </Box>
        </Box>
      </WorkspaceHeader>
      {showInlineSectionNav ? (
        <>
          <NutritionWorkspacePanel
            eyebrow="Flujo del módulo"
            title="Navegación nutricional"
            description="Registro, estado, planificación y herramientas prácticas dentro del mismo flujo."
          >
            <NutritionSectionNav activeSection={activeSection} onChangeSection={onChangeActiveSection} />
          </NutritionWorkspacePanel>
          <Divider />
        </>
      ) : null}
      {activeSection === "registro" && (
        <Box className="workspace-section" sx={sectionStackSx}>
          <NutritionWorkspacePanel
            id="nutrition-register-panel"
            eyebrow="Registro"
            title="Ingesta del día"
            description="Alta rápida, borradores y detalle de comidas sin salir del flujo principal."
          >
          {!nutritionReady ? (
            <NutritionSectionFallback rows={2} />
          ) : (
            <Suspense fallback={<NutritionSectionFallback rows={2} />}>
              <NutritionLog
                profileId={profileId}
                meals={meals}
                onMealsChange={(nextMeals) =>
                  setMealState({
                    profileKey: currentProfileKey,
                    meals: Array.isArray(nextMeals) ? nextMeals : [],
                  })
                }
                onDataChange={onNutritionDataChange}
                dailyStatus={frequentMealSuggestionContext}
              />
            </Suspense>
          )}
          </NutritionWorkspacePanel>
        </Box>
      )}

      {activeSection === "estado" && (
        <Box className="workspace-section" sx={sectionStackSx}>
          <NutritionWorkspacePanel
            id="nutrition-status-panel"
            eyebrow="Estado diario"
            title="Lectura del día"
            description="Resume calidad, balance y tendencia antes de entrar a los detalles de cada bloque."
          >
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
          </NutritionWorkspacePanel>

          {dailyStatusTab === 0 && (
            <NutritionWorkspacePanel
              eyebrow="Resumen"
              title="Estado del día"
              description="Saciedad, alertas y lectura global de la alimentación del día."
            >
              <Box sx={statusWorkspaceSx}>
                <Box sx={statusColumnSx}>
                  <Box sx={(muiTheme) => ({ ...nutritionSurfaceSx(muiTheme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1.25 })}>
                    <Typography variant="subtitle1">Índice de saciedad del día</Typography>
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
                  </Box>
                  <NutritionInsights
                    nutritionScore={dailyNutritionScore}
                    macroAnalysis={macroAnalysis}
                    proteinAnalysis={proteinAnalysis}
                    vegetableAnalysis={vegetableAnalysis}
                    embedded
                  />
                  <NutritionSummary
                    profile={nutritionProfile}
                    meals={meals}
                    tdeeOverride={tdee}
                    activityMetrics={metricsForTdee}
                    embedded
                  />
                </Box>
                <Box sx={statusColumnSx}>
                  <NutritionAlerts alerts={dailyNutritionAlerts} embedded />
                  <MealSuggestions
                    dailyCaloriesTarget={tdee}
                    dailyCaloriesConsumed={totalsToday.calories}
                    recipes={recipes}
                    foodCatalog={foodCatalog}
                    mealType={suggestedMealType}
                    embedded
                  />
                  <NutritionEvaluation totals={totalsToday} profile={nutritionProfile} tdee={tdee} embedded />
                </Box>
              </Box>
              <Box sx={{ display: "grid", gap: 1.05 }}>
                <Box sx={{ display: "grid", gap: 0.35 }}>
                  <Typography variant="subtitle1">Planning correctivo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cierra hoy y aterriza mañana en comidas concretas cuando hay matches reales con recetas o ideas del perfil.
                  </Typography>
                </Box>
                <Suspense fallback={<NutritionSectionFallback rows={2} />}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
                      gap: { xs: 1.2, md: 1.4 },
                      alignItems: "start",
                    }}
                  >
                    <CorrectiveDayPlan
                      title="Plan correctivo del día"
                      dailyTargetCalories={safeNumber(tdee)}
                      dailyTargetProtein={safeNumber(macroTargets?.protein)}
                      dailyTargetCarbs={safeNumber(macroTargets?.carbs)}
                      dailyTargetFat={safeNumber(macroTargets?.fat)}
                      consumedCalories={safeNumber(totalsToday?.calories)}
                      consumedProtein={safeNumber(totalsToday?.protein)}
                      consumedCarbs={safeNumber(totalsToday?.carbs)}
                      consumedFat={safeNumber(totalsToday?.fat)}
                      vegetableServings={safeNumber(vegetableAnalysis?.servings)}
                      deficits={correctiveDeficits}
                      mealHistory={normalizedTodayMealHistory}
                      context={recoveryMatchContext}
                      compact
                    />
                    <NextDayRecoveryCard
                      title="Plan sugerido para mañana"
                      recentDays={recoveryRecentDays}
                      options={nextDayRecoveryOptions}
                      context={recoveryMatchContext}
                      compact
                    />
                  </Box>
                </Suspense>
              </Box>
            </NutritionWorkspacePanel>
          )}

          {dailyStatusTab === 1 && (
            <NutritionWorkspacePanel
              eyebrow="Balance"
              title="Balance y proyección"
              description="Cruza consumo, gasto y posible trayectoria del peso con un bloque más analítico."
            >
              <Box sx={{ ...statusWorkspaceSx, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
                <EnergyBalanceCard caloriesConsumed={totalsToday.calories} tdee={tdee} embedded />
                <WeightProjection currentWeight={currentWeight} dailyBalance={calorieBalance.balance} embedded />
              </Box>
            </NutritionWorkspacePanel>
          )}

          {dailyStatusTab === 2 && (
            <NutritionWorkspacePanel
              eyebrow="Ajuste"
              title="Análisis adaptativo"
              description="Revisa alertas de tendencia y si el objetivo energético necesita corrección."
              action={
                <Button variant="outlined" size="medium" onClick={() => openAdaptiveDrawer("progreso")}>
                  Ver detalle
                </Button>
              }
            >
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
            </NutritionWorkspacePanel>
          )}

          {dailyStatusTab === 3 && (
            <NutritionWorkspacePanel
              eyebrow="Histórico"
              title="Comparativa reciente"
              description="Últimos 7 días y revisión puntual por fecha para detectar patrones repetidos."
            >
              <Box sx={statusWorkspaceSx}>
                <Box sx={statusColumnSx}>
                  <Box sx={historyChartsGridSx}>
                    <HistoryChartPreviewCard
                      title="Calorías vs TDEE"
                      description="Haz clic para ampliar y revisar la comparación con más espacio."
                      legendItems={caloriesHistoryLegend}
                      onExpand={() => setExpandedHistoryChart("calories")}
                    >
                      <NutritionCaloriesHistoryChart
                        data={last7HistoryChart}
                        chartMax={chartCaloriesMax}
                      />
                    </HistoryChartPreviewCard>

                    <HistoryChartPreviewCard
                      title="Macros por día"
                      description="Haz clic para ampliar y leer mejor la distribución de macros."
                      legendItems={macrosHistoryLegend}
                      onExpand={() => setExpandedHistoryChart("macros")}
                    >
                      <NutritionMacrosHistoryChart
                        data={last7HistoryChart}
                        chartMax={chartMacrosMax}
                      />
                    </HistoryChartPreviewCard>
                  </Box>
                </Box>

                <Box sx={statusColumnSx}>
                  <Box sx={(muiTheme) => ({ ...nutritionSurfaceSx(muiTheme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1.2 })}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 1.2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "grid", gap: 0.45, minWidth: 0 }}>
                        <Typography variant="subtitle1">Detalle por fecha</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {resolvedHistoryDate === todayKey ? "Lectura de hoy" : `Fecha seleccionada: ${resolvedHistoryDate}`}
                        </Typography>
                      </Box>
                      <TextField
                        label="Fecha"
                        type="date"
                        value={resolvedHistoryDate}
                        onChange={(event) => setHistoryDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: { xs: "100%", sm: 220 } }}
                      />
                    </Box>

                    <Box sx={historySummaryGridSx}>
                      {[
                        { label: "Calorías", value: `${Math.round(historyTotals.calories)} kcal` },
                        { label: "Proteína", value: `${Math.round(historyTotals.protein)} g` },
                        { label: "Carbohidratos", value: `${Math.round(historyTotals.carbs)} g` },
                        { label: "Grasas", value: `${Math.round(historyTotals.fat)} g` },
                        { label: "Balance", value: `${Math.round(historyBalance.balance)} kcal` },
                        { label: "Comidas", value: `${historyTotals.mealsCount}` },
                      ].map((item) => (
                        <Box
                          key={item.label}
                          sx={{
                            p: 1,
                            borderRadius: 1.6,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            display: "grid",
                            gap: 0.35,
                            minWidth: 0,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                            {item.label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Box
                      sx={{
                        p: 1.05,
                        borderRadius: 1.8,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        display: "grid",
                        gap: 0.45,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        TDEE estimado
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {Math.round(historyTdee)} kcal
                      </Typography>
                    </Box>

                    <Divider />

                    <Box sx={{ display: "grid", gap: 0.9 }}>
                      <Typography variant="subtitle2">Comidas registradas</Typography>
                      {historyMeals.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No hay comidas registradas para esa fecha.
                        </Typography>
                      ) : (
                        historyMeals.map((meal) => (
                          <Box
                            key={meal.id}
                            sx={{
                              display: "grid",
                              gap: 0.25,
                              p: 1,
                              borderRadius: 1.6,
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                              {mealTypeLabel(meal?.mealType)} · {meal.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                              {meal?.brand ? `${meal.brand} · ` : ""}
                              {Math.round(Number(meal?.calories || 0))} kcal
                            </Typography>
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </NutritionWorkspacePanel>
          )}

          {dailyStatusTab !== 2 && (
            <Box className="workspace-section">
              <Button variant="outlined" onClick={() => openAdaptiveDrawer("progreso")}>
                Ver análisis adaptativo
              </Button>
            </Box>
          )}
        </Box>
      )}

      {activeSection === "plan" && (
        <Box className="workspace-section" sx={sectionStackSx}>
          <Suspense fallback={<NutritionSectionFallback rows={3} />}>
            <NutritionWorkspacePanel
              eyebrow="Planificación"
              title="Plan diario"
              description="Construye la jornada alimentaria con una vista priorizada para hoy."
            >
              <DailyMealPlan
                dailyCaloriesTarget={tdee}
                recipes={recipes}
                foodCatalog={foodCatalog}
              />
            </NutritionWorkspacePanel>
            <NutritionWorkspacePanel
              eyebrow="Semana"
              title="Plan semanal y compras"
              description="Organiza la semana y deriva una lista de compra desde el mismo bloque."
            >
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
            </NutritionWorkspacePanel>
          </Suspense>
        </Box>
      )}

      {activeSection === "work" && (
        <Box className="workspace-section" sx={sectionStackSx}>
          <Suspense fallback={<NutritionSectionFallback rows={2} />}>
            <NutritionWorkspacePanel
              eyebrow="Contexto laboral"
              title="Nutrición en el trabajo"
              description="Herramientas prácticas para decidir, planificar y resolver comidas fuera de casa."
            >
              <NutritionTools profileId={profileId} />
            </NutritionWorkspacePanel>
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
      <Dialog
        open={Boolean(expandedHistoryChartConfig)}
        onClose={() => setExpandedHistoryChart("")}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
          },
        }}
      >
        {expandedHistoryChartConfig ? (
          <Box sx={{ p: { xs: 1.5, sm: 2.2 }, display: "grid", gap: 1.4 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1.2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "grid", gap: 0.4, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}
                >
                  Histórico nutricional
                </Typography>
                <Typography variant="h6">{expandedHistoryChartConfig.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
                  {expandedHistoryChartConfig.description}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => setExpandedHistoryChart("")}>
                Cerrar
              </Button>
            </Box>

            <Box
              sx={(muiTheme) => ({
                ...nutritionSurfaceSx(muiTheme),
                p: { xs: 1.2, sm: 1.6 },
                display: "grid",
                gap: 1.25,
              })}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                {expandedHistoryChartConfig.legendItems.map((item) => (
                  <HistoryChartLegendItem
                    key={`expanded-${item.label}`}
                    color={item.color}
                    label={item.label}
                  />
                ))}
              </Box>
              {expandedHistoryChartConfig.content}
            </Box>
          </Box>
        ) : null}
      </Dialog>
    </Box>
  );
}
