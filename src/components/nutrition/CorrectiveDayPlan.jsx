import { useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
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

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildPlanViewSignature(plan) {
  if (!isObject(plan)) return "";

  try {
    return JSON.stringify({
      summary: plan.summary || "",
      recoveryType: plan.recoveryType || "",
      goals: {
        caloriesToUse: roundNumber(plan?.goals?.caloriesToUse),
        proteinToRecover: roundNumber(plan?.goals?.proteinToRecover),
        vegetablesToRecover: roundNumber(plan?.goals?.vegetablesToRecover, 1),
      },
      suggestedMeals: getSafeArray(plan?.suggestedMeals).map((meal) => ({
        slot: meal?.slot || "",
        strategy: meal?.strategy || "",
      })),
    });
  } catch {
    return "";
  }
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

function getSuggestionFitLabel(score) {
  const safeScore = safeNumber(score, -1);
  if (safeScore >= 55) return "Buen ajuste";
  if (safeScore >= 35) return "Ajuste util";
  return "";
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

function getRecoveryTone(theme, recoveryType) {
  if (recoveryType === "protein") {
    return {
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.18),
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    };
  }

  if (recoveryType === "vegetables") {
    return {
      color: theme.palette.success.main,
      borderColor: alpha(theme.palette.success.main, 0.2),
      backgroundColor: alpha(theme.palette.success.main, 0.08),
    };
  }

  if (recoveryType === "post_excess") {
    return {
      color: theme.palette.warning.dark,
      borderColor: alpha(theme.palette.warning.main, 0.24),
      backgroundColor: alpha(theme.palette.warning.main, 0.09),
    };
  }

  return {
    color: theme.palette.text.primary,
    borderColor: alpha(theme.palette.text.primary, 0.12),
    backgroundColor: alpha(theme.palette.text.primary, 0.04),
  };
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
    score: safeNumber(item.score, -1),
    fitLabel: getSuggestionFitLabel(item.score),
    reasons: getSafeArray(item.reasons)
      .map((reason) => String(reason || "").trim())
      .filter(Boolean)
      .filter((reason) => !reason.toLowerCase().startsWith("fuente:"))
      .slice(0, 2),
  };
}

function extractSuggestionItems(source) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return [];

  const collections = [
    source.suggestions,
    source.items,
    source.options,
    source.matches,
    source.candidates,
    source.results,
    source.meals,
  ];

  for (const collection of collections) {
    if (Array.isArray(collection)) return collection;
  }

  return [];
}

function getSlotSuggestionMatch(plan, slotName) {
  if (!slotName) return null;

  const directMatch = [
    plan?.mealOptionsBySlot?.[slotName],
    plan?.suggestedMealMatches?.mealOptionsBySlot?.[slotName],
    plan?.suggestedMealMatches?.slotMatches?.[slotName],
    plan?.suggestedMealMatches?.[slotName],
    plan?.slotMatches?.[slotName],
    plan?.suggestionsBySlot?.[slotName],
    plan?.suggestions?.[slotName],
    plan?.matches?.[slotName],
  ].find(Boolean);

  if (directMatch) return directMatch;
  return null;
}

function getSlotSuggestions(plan, slotName, maxItems = 2) {
  const match = getSlotSuggestionMatch(plan, slotName);
  const suggestions = extractSuggestionItems(match);

  return suggestions
    .map(normalizeSuggestionItem)
    .filter(Boolean)
    .sort((left, right) => safeNumber(right?.score, -1) - safeNumber(left?.score, -1))
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

function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.08em", lineHeight: 1.1 }}
    >
      {children}
    </Typography>
  );
}

function SuggestionList({ items, compact = false }) {
  const safeItems = getSafeArray(items);
  if (!safeItems.length) return null;

  return (
    <Box
      sx={(theme) => ({
        display: "grid",
        gap: compact ? 0.75 : 0.85,
        pl: { xs: 0, sm: 0.3 },
        borderLeft: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
      })}
    >
      <SectionLabel>Opciones sugeridas</SectionLabel>

      <Stack spacing={compact ? 0.75 : 0.85}>
        {safeItems.map((item, index) => {
          const metrics = renderSuggestionMetrics(item);

          return (
            <Paper
              key={`${item.id || item.name}-${index}`}
              variant="outlined"
              sx={{
                p: compact ? 0.95 : 1.05,
                borderRadius: 2.6,
                display: "grid",
                gap: 0.5,
                bgcolor: "rgba(255,255,255,0.52)",
                borderColor: "rgba(15,23,42,0.08)",
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
                <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Chip
                    size="small"
                    label={formatSuggestionType(item.type)}
                    variant="outlined"
                  />
                  {item.fitLabel ? (
                    <Chip
                      size="small"
                      label={item.fitLabel}
                      color="primary"
                      variant="filled"
                    />
                  ) : null}
                </Box>
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
        p: compact ? 0.95 : 1.1,
        borderRadius: 2.9,
        minWidth: 0,
        display: "grid",
        gap: 0.3,
        bgcolor: "rgba(255,255,255,0.72)",
        borderColor: "rgba(15,23,42,0.08)",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.1, fontWeight: 700 }}
      >
        {label}
      </Typography>
      <Typography variant={compact ? "body2" : "subtitle2"} sx={{ fontWeight: 800, lineHeight: 1.15 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function SuggestedMealCard({ meal, suggestions = [], compact = false }) {
  const focusItems = Array.isArray(meal?.nutritionalFocus) ? meal.nutritionalFocus : [];
  const targetMetrics = [];

  if (safeNumber(meal?.targetCalories) > 0) {
    targetMetrics.push(`${Math.round(safeNumber(meal.targetCalories))} kcal`);
  }
  if (safeNumber(meal?.targetProtein) > 0) {
    targetMetrics.push(`${Math.round(safeNumber(meal.targetProtein))} g proteina`);
  }
  if (safeNumber(meal?.targetVegetables) > 0) {
    targetMetrics.push(
      `${roundNumber(meal.targetVegetables, 1).toFixed(1).replace(".0", "")} porciones de vegetales`
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.1 : 1.3,
        borderRadius: 3.1,
        display: "grid",
        gap: compact ? 0.85 : 1,
        bgcolor: "rgba(255,255,255,0.78)",
        borderColor: "rgba(15,23,42,0.08)",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ flexWrap: "wrap", rowGap: 0.7 }}
      >
        <Box sx={{ display: "grid", gap: 0.3, minWidth: 0 }}>
          <Typography variant={compact ? "subtitle2" : "subtitle1"} sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            {formatSlotLabel(meal?.slot)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
            {meal?.strategy || "Sin estrategia definida."}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={formatSlotLabel(meal?.slot)}
          variant="outlined"
          sx={{ fontWeight: 700, bgcolor: "rgba(255,255,255,0.86)" }}
        />
      </Stack>

      {targetMetrics.length ? (
        <Box sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}>
          {targetMetrics.map((metric) => (
            <Chip
              key={`${meal?.slot || "meal"}-${metric}`}
              label={metric}
              size="small"
              variant="outlined"
              sx={{ bgcolor: "rgba(255,255,255,0.74)" }}
            />
          ))}
        </Box>
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
    <Stack spacing={compact ? 0.7 : 0.8}>
      {safeItems.map((item, index) => (
        <Box
          key={`reasoning-${index}`}
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 0.75,
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={(theme) => ({
              width: 7,
              height: 7,
              borderRadius: "50%",
              mt: 0.72,
              bgcolor: alpha(theme.palette.primary.main, 0.82),
            })}
          />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
            {item}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function PlanActionBar({
  plan,
  onAccept,
  onSaveForLater,
  onDismiss,
  compact = false,
}) {
  if (!onAccept && !onSaveForLater && !onDismiss) return null;

  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      <SectionLabel>Acciones</SectionLabel>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.8}
        sx={{
          flexWrap: "wrap",
          rowGap: 0.8,
          "& .MuiButton-root": {
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 700,
            minHeight: compact ? 34 : 36,
          },
        }}
      >
        {onAccept ? (
          <Button size="small" variant="outlined" color="primary" onClick={() => onAccept(plan)}>
            Usar plan
          </Button>
        ) : null}
        {onSaveForLater ? (
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => onSaveForLater(plan)}
            sx={{ px: compact ? 0.5 : 0.8 }}
          >
            Ver despues
          </Button>
        ) : null}
        {onDismiss ? (
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => onDismiss(plan)}
            sx={{ px: compact ? 0.5 : 0.8 }}
          >
            Descartar
          </Button>
        ) : null}
      </Stack>
    </Box>
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
  context,
  mealMatchingOptions,
  planOverride,
  title,
  onViewed,
  onAccept,
  onSaveForLater,
  onDismiss,
  compact = false,
}) {
  const plan = useMemo(
    () => {
      if (isObject(planOverride)) {
        return planOverride;
      }

      return buildCorrectiveDayPlan({
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
        context,
        mealMatchingOptions,
      });
    },
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
      context,
      mealMatchingOptions,
      planOverride,
    ]
  );
  const viewSignature = useMemo(() => buildPlanViewSignature(plan), [plan]);
  const viewedSignatureRef = useRef("");

  useEffect(() => {
    if (!onViewed) return;
    if (plan?.status === "insufficient_data") return;
    if (!viewSignature || viewedSignatureRef.current === viewSignature) return;

    viewedSignatureRef.current = viewSignature;
    onViewed(plan);
  }, [onViewed, plan, viewSignature]);

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
  const maxSuggestionsPerSlot = 2;
  const focusLabels = Array.from(
    new Set(
      suggestedMeals
        .flatMap((meal) => (Array.isArray(meal?.nutritionalFocus) ? meal.nutritionalFocus : []))
        .filter(Boolean)
    )
  ).slice(0, compact ? 3 : 3);
  const visibleReasoning = Array.isArray(plan?.reasoning)
    ? plan.reasoning.slice(0, compact ? 2 : 3)
    : [];

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        ...nutritionSurfaceSx(theme),
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.035)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 42%)`,
      })}
    >
      <CardContent sx={{ p: compact ? 1.5 : 1.8, display: "grid", gap: compact ? 1.35 : 1.6 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "flex-start" }}
          justifyContent="space-between"
        >
          <Box sx={{ display: "grid", gap: 0.4 }}>
            <SectionLabel>Cierre de hoy</SectionLabel>
            <Typography variant={compact ? "subtitle1" : "h6"} sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {title || "Plan correctivo del dia"}
            </Typography>
          </Box>

          {plan?.status === "insufficient_data" ? null : (
            <Chip
              size="small"
              label={formatRecoveryType(plan?.recoveryType)}
              variant="outlined"
              sx={(theme) => {
                const tone = getRecoveryTone(theme, plan?.recoveryType);
                return {
                  color: tone.color,
                  borderColor: tone.borderColor,
                  backgroundColor: tone.backgroundColor,
                  fontWeight: 700,
                };
              }}
            />
          )}
        </Stack>

        {plan?.status === "insufficient_data" ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Aun no hay suficiente informacion para proponer un cierre correctivo del dia.
          </Typography>
        ) : (
          <>
            <Paper
              variant="outlined"
              sx={(theme) => ({
                p: compact ? 1.15 : 1.35,
                borderRadius: 3.1,
                display: "grid",
                gap: 0.9,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                borderColor: alpha(theme.palette.primary.main, 0.1),
              })}
            >
              <SectionLabel>Resumen</SectionLabel>
              <Typography variant={compact ? "body1" : "h6"} sx={{ fontWeight: 800, lineHeight: 1.28 }}>
                {plan?.summary || "Todavia no hay una propuesta correctiva clara para hoy."}
              </Typography>

              <Box sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={`${suggestedMeals.length} slot${suggestedMeals.length === 1 ? "" : "s"} activo${suggestedMeals.length === 1 ? "" : "s"}`}
                  variant="outlined"
                  sx={{ bgcolor: "rgba(255,255,255,0.72)" }}
                />
                {focusLabels.map((focus) => (
                  <Chip
                    key={`focus-${focus}`}
                    size="small"
                    label={formatFocusLabel(focus)}
                    variant="outlined"
                    sx={(theme) => {
                      const tone = getFocusTone(theme, focus);
                      return {
                        color: tone.color,
                        borderColor: tone.borderColor,
                        backgroundColor: tone.backgroundColor,
                      };
                    }}
                  />
                ))}
              </Box>
            </Paper>

            {visibleGoals.length ? (
              <Box sx={{ display: "grid", gap: 0.8 }}>
                <SectionLabel>Metas pendientes</SectionLabel>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: `repeat(${Math.min(visibleGoals.length, 3)}, minmax(0, 1fr))`,
                    },
                    gap: 0.8,
                  }}
                >
                  {visibleGoals.map((goal) => (
                    <GoalMetric key={goal.key} label={goal.label} value={goal.value} compact={compact} />
                  ))}
                </Box>
              </Box>
            ) : null}

            {suggestedMeals.length ? (
              <Box sx={{ display: "grid", gap: 0.95 }}>
                <SectionLabel>Slots sugeridos</SectionLabel>
                <Stack spacing={0.95}>
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
            ) : null}

            {visibleReasoning.length ? (
              <Box
                sx={(theme) => ({
                  display: "grid",
                  gap: 0.75,
                  p: compact ? 1 : 1.15,
                  borderRadius: 2.8,
                  backgroundColor: alpha(theme.palette.text.primary, 0.025),
                })}
              >
                <SectionLabel>Notas utiles</SectionLabel>
                <ReasoningList items={visibleReasoning} compact={compact} />
              </Box>
            ) : null}

            <Divider />
            <PlanActionBar
              plan={plan}
              onAccept={onAccept}
              onSaveForLater={onSaveForLater}
              onDismiss={onDismiss}
              compact={compact}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
