import { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { buildCorrectiveDayPlan } from "../../utils/correctiveDayBuilder";
import { nutritionSurfaceSx } from "./nutritionUi";

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

function getSafeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function formatRecoveryType(recoveryType) {
  if (recoveryType === "protein") return "Recuperacion proteica";
  if (recoveryType === "vegetables") return "Recuperacion vegetal";
  if (recoveryType === "balanced") return "Recuperacion equilibrada";
  if (recoveryType === "post_excess") return "Post exceso calorico";
  return "Cierre liviano";
}

function formatSlotLabel(slot) {
  if (slot === "breakfast") return "Desayuno";
  if (slot === "lunch") return "Almuerzo";
  if (slot === "dinner") return "Cena";
  if (slot === "snack") return "Snack";
  return "Comida";
}

function formatFocusLabel(focus) {
  if (focus === "protein") return "Proteina";
  if (focus === "vegetables") return "Vegetales";
  if (focus === "satiety") return "Saciedad";
  if (focus === "low_calorie") return "Baja densidad calorica";
  if (focus === "energy_recovery") return "Recuperar energia";
  if (focus === "macro_balance") return "Balance de macros";
  return String(focus || "")
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatSuggestionType(type) {
  if (type === "recipe") return "Receta";
  if (type === "portable_meal") return "Portable";
  if (type === "satiety_meal") return "Alta saciedad";
  if (type === "fallback") return "Idea simple";
  return "Sugerencia";
}

function shouldShowGoal(value) {
  return safeNumber(value) > 0;
}

function formatGoalValue(value, unit, decimals = 0) {
  const rounded = roundNumber(value, decimals);
  if (!rounded) return "";
  const text = decimals > 0 ? rounded.toFixed(decimals).replace(".0", "") : Math.round(rounded);
  return `${text} ${unit}`;
}

function getFocusTone(theme, focus) {
  if (focus === "protein") {
    return {
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.2),
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    };
  }

  if (focus === "vegetables") {
    return {
      color: theme.palette.success.main,
      borderColor: alpha(theme.palette.success.main, 0.22),
      backgroundColor: alpha(theme.palette.success.main, 0.08),
    };
  }

  if (focus === "low_calorie") {
    return {
      color: theme.palette.warning.main,
      borderColor: alpha(theme.palette.warning.main, 0.24),
      backgroundColor: alpha(theme.palette.warning.main, 0.09),
    };
  }

  return {
    color: theme.palette.text.secondary,
    borderColor: alpha(theme.palette.text.primary, 0.12),
    backgroundColor: alpha(theme.palette.text.primary, 0.04),
  };
}

function normalizeSuggestionItem(item) {
  if (!item || typeof item !== "object") return null;

  return {
    id: item.id || item.name || "suggestion",
    name: String(item.name || item.label || "Opcion sugerida").trim(),
    type: String(item.type || "meal_suggestion").trim().toLowerCase(),
    calories: Math.max(0, Math.round(safeNumber(item.calories))),
    protein: Math.max(0, Math.round(safeNumber(item.protein))),
    vegetableServings: Math.max(0, roundNumber(item.vegetableServings, 1)),
    reasons: getSafeArray(item.reasons)
      .map((reason) => String(reason || "").trim())
      .filter(Boolean)
      .filter((reason) => !reason.toLowerCase().startsWith("fuente:"))
      .slice(0, 2),
  };
}

function getSlotSuggestionMatch(plan, slotName) {
  if (!slotName) return null;

  const directMatch =
    plan?.mealOptionsBySlot?.[slotName] ||
    plan?.suggestedMealMatches?.slotMatches?.[slotName] ||
    plan?.suggestedMealMatches?.[slotName];

  if (directMatch) return directMatch;
  return null;
}

function getSlotSuggestions(plan, slotName, maxItems = 2) {
  const match = getSlotSuggestionMatch(plan, slotName);
  const suggestions = Array.isArray(match?.suggestions)
    ? match.suggestions
    : Array.isArray(match)
      ? match
      : [];

  return suggestions
    .map(normalizeSuggestionItem)
    .filter(Boolean)
    .slice(0, maxItems);
}

function renderSuggestionMetrics(item) {
  const metrics = [];

  if (safeNumber(item?.calories) > 0) {
    metrics.push(`${Math.round(safeNumber(item.calories))} kcal`);
  }
  if (safeNumber(item?.protein) > 0) {
    metrics.push(`${Math.round(safeNumber(item.protein))} g proteina`);
  }
  if (safeNumber(item?.vegetableServings) > 0) {
    metrics.push(
      `${roundNumber(item.vegetableServings, 1).toFixed(1).replace(".0", "")} porciones vegetales`
    );
  }

  return metrics.join(" • ");
}

function SuggestionList({ items, compact = false }) {
  const safeItems = getSafeArray(items);
  if (!safeItems.length) return null;

  return (
    <Box sx={{ display: "grid", gap: compact ? 0.75 : 0.85 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Opciones sugeridas
      </Typography>

      <Stack spacing={compact ? 0.75 : 0.85}>
        {safeItems.map((item, index) => {
          const metrics = renderSuggestionMetrics(item);

          return (
            <Paper
              key={`${item.id || item.name}-${index}`}
              variant="outlined"
              sx={{
                p: compact ? 0.9 : 1,
                borderRadius: 2.5,
                display: "grid",
                gap: 0.45,
                bgcolor: "rgba(255,255,255,0.58)",
              }}
            >
              <Stack
                direction="row"
                spacing={0.8}
                alignItems="flex-start"
                justifyContent="space-between"
                sx={{ flexWrap: "wrap", rowGap: 0.5 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.name}
                </Typography>
                <Chip
                  size="small"
                  label={formatSuggestionType(item.type)}
                  variant="outlined"
                />
              </Stack>

              {metrics ? (
                <Typography variant="caption" color="text.secondary">
                  {metrics}
                </Typography>
              ) : null}

              {item.reasons.length ? (
                <Typography variant="caption" color="text.secondary">
                  {item.reasons.join(" • ")}
                </Typography>
              ) : null}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

function GoalMetric({ label, value, compact = false }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1 : 1.2,
        borderRadius: 2.75,
        minWidth: 0,
        display: "grid",
        gap: 0.35,
        bgcolor: "rgba(255,255,255,0.66)",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant={compact ? "body2" : "subtitle2"} sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function SuggestedMealCard({ meal, suggestions = [], compact = false }) {
  const focusItems = Array.isArray(meal?.nutritionalFocus) ? meal.nutritionalFocus : [];
  const metaParts = [];

  if (safeNumber(meal?.targetCalories) > 0) {
    metaParts.push(`${Math.round(safeNumber(meal.targetCalories))} kcal`);
  }
  if (safeNumber(meal?.targetProtein) > 0) {
    metaParts.push(`${Math.round(safeNumber(meal.targetProtein))} g proteina`);
  }
  if (safeNumber(meal?.targetVegetables) > 0) {
    metaParts.push(
      `${roundNumber(meal.targetVegetables, 1).toFixed(1).replace(".0", "")} porciones de vegetales`
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.1 : 1.4,
        borderRadius: 3,
        display: "grid",
        gap: compact ? 0.8 : 1,
        bgcolor: "rgba(255,255,255,0.72)",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ flexWrap: "wrap", rowGap: 0.7 }}
      >
        <Box sx={{ display: "grid", gap: 0.35, minWidth: 0 }}>
          <Typography variant={compact ? "subtitle2" : "subtitle1"} sx={{ fontWeight: 800 }}>
            {formatSlotLabel(meal?.slot)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meal?.strategy || "Sin estrategia definida."}
          </Typography>
        </Box>
        <Chip size="small" label={formatSlotLabel(meal?.slot)} variant="outlined" />
      </Stack>

      {metaParts.length ? (
        <Typography variant="body2" color="text.secondary">
          {metaParts.join(" • ")}
        </Typography>
      ) : null}

      {focusItems.length ? (
        <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap" }}>
          {focusItems.map((focus) => (
            <Chip
              key={`${meal?.slot || "meal"}-${focus}`}
              label={formatFocusLabel(focus)}
              size="small"
              sx={(theme) => {
                const tone = getFocusTone(theme, focus);
                return {
                  color: tone.color,
                  borderColor: tone.borderColor,
                  backgroundColor: tone.backgroundColor,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                };
              }}
              variant="outlined"
            />
          ))}
        </Box>
      ) : null}

      <SuggestionList items={suggestions} compact={compact} />
    </Paper>
  );
}

function ReasoningList({ items, compact = false }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return null;

  return (
    <Stack spacing={compact ? 0.75 : 0.9}>
      {safeItems.map((item, index) => (
        <Box
          key={`reasoning-${index}`}
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 0.9,
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={(theme) => ({
              width: 7,
              height: 7,
              borderRadius: "50%",
              mt: 0.85,
              bgcolor: alpha(theme.palette.primary.main, 0.9),
            })}
          />
          <Typography variant="body2" color="text.secondary">
            {item}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

export default function CorrectiveDayPlan({
  dailyTargetCalories,
  dailyTargetProtein,
  dailyTargetCarbs,
  dailyTargetFat,
  consumedCalories,
  consumedProtein,
  consumedCarbs,
  consumedFat,
  vegetableServings,
  deficits,
  mealHistory,
  title,
  compact = false,
}) {
  const plan = useMemo(
    () =>
      buildCorrectiveDayPlan({
        dailyTargetCalories,
        dailyTargetProtein,
        dailyTargetCarbs,
        dailyTargetFat,
        consumedCalories,
        consumedProtein,
        consumedCarbs,
        consumedFat,
        vegetableServings,
        deficits,
        mealHistory,
      }),
    [
      dailyTargetCalories,
      dailyTargetProtein,
      dailyTargetCarbs,
      dailyTargetFat,
      consumedCalories,
      consumedProtein,
      consumedCarbs,
      consumedFat,
      vegetableServings,
      deficits,
      mealHistory,
    ]
  );

  const visibleGoals = [
    shouldShowGoal(plan?.goals?.caloriesToUse)
      ? {
          key: "calories",
          label: "Calorias por usar",
          value: formatGoalValue(plan?.goals?.caloriesToUse, "kcal"),
        }
      : null,
    shouldShowGoal(plan?.goals?.proteinToRecover)
      ? {
          key: "protein",
          label: "Proteina por recuperar",
          value: formatGoalValue(plan?.goals?.proteinToRecover, "g"),
        }
      : null,
    shouldShowGoal(plan?.goals?.vegetablesToRecover)
      ? {
          key: "vegetables",
          label: "Vegetales por recuperar",
          value: formatGoalValue(plan?.goals?.vegetablesToRecover, "porciones", 1),
        }
      : null,
  ].filter(Boolean);

  const suggestedMeals = Array.isArray(plan?.suggestedMeals) ? plan.suggestedMeals : [];
  const maxSuggestionsPerSlot = compact ? 2 : 3;
  const focusLabels = Array.from(
    new Set(
      suggestedMeals
        .flatMap((meal) => (Array.isArray(meal?.nutritionalFocus) ? meal.nutritionalFocus : []))
        .filter(Boolean)
    )
  ).slice(0, compact ? 3 : 4);

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        ...nutritionSurfaceSx(theme),
      })}
    >
      <CardContent sx={{ p: compact ? 1.5 : 2, display: "grid", gap: compact ? 1.5 : 2 }}>
        <Box sx={{ display: "grid", gap: 0.65 }}>
          <Typography variant={compact ? "subtitle1" : "h6"} sx={{ fontWeight: 800 }}>
            {title || "Plan correctivo del dia"}
          </Typography>
          {plan?.status === "insufficient_data" ? (
            <Typography variant="body2" color="text.secondary">
              Aun no hay suficiente informacion para proponer un cierre correctivo del dia.
            </Typography>
          ) : (
            <Typography variant={compact ? "body2" : "subtitle1"} sx={{ fontWeight: 700 }}>
              {plan?.summary || "Todavia no hay una propuesta correctiva clara para hoy."}
            </Typography>
          )}
        </Box>

        {plan?.status === "insufficient_data" ? null : (
          <>
            <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
              <Chip size="small" label={formatRecoveryType(plan?.recoveryType)} variant="outlined" />
              <Chip
                size="small"
                label={`${suggestedMeals.length} comida${suggestedMeals.length === 1 ? "" : "s"} sugerida${suggestedMeals.length === 1 ? "" : "s"}`}
                variant="outlined"
              />
              {focusLabels.map((focus) => (
                <Chip
                  key={`focus-${focus}`}
                  size="small"
                  label={formatFocusLabel(focus)}
                  variant="outlined"
                />
              ))}
            </Box>

            {visibleGoals.length ? (
              <Box sx={{ display: "grid", gap: 0.8 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Metas pendientes
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: `repeat(${Math.min(visibleGoals.length, 3)}, minmax(0, 1fr))`,
                    },
                    gap: 0.9,
                  }}
                >
                  {visibleGoals.map((goal) => (
                    <GoalMetric key={goal.key} label={goal.label} value={goal.value} compact={compact} />
                  ))}
                </Box>
              </Box>
            ) : null}

            {suggestedMeals.length ? (
              <>
                <Divider />
                <Box sx={{ display: "grid", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Comidas sugeridas
                  </Typography>
                  <Stack spacing={1}>
                    {suggestedMeals.map((meal, index) => (
                      <SuggestedMealCard
                        key={`${meal?.slot || "meal"}-${index}`}
                        meal={meal}
                        suggestions={getSlotSuggestions(plan, meal?.slot, maxSuggestionsPerSlot)}
                        compact={compact}
                      />
                    ))}
                  </Stack>
                </Box>
              </>
            ) : null}

            {Array.isArray(plan?.reasoning) && plan.reasoning.length ? (
              <>
                <Divider />
                <Box sx={{ display: "grid", gap: 0.85 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Por que te lo proponemos
                  </Typography>
                  <ReasoningList items={plan.reasoning.slice(0, compact ? 3 : 5)} compact={compact} />
                </Box>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
