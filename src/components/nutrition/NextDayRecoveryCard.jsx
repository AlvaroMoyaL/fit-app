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
import { buildNextDayRecoveryPlan } from "../../utils/nextDayRecoveryPlanner.js";
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

function shouldShowMetric(value) {
  return safeNumber(value) > 0;
}

function formatTemplateLabel(templateKey, templateName) {
  if (templateKey === "high_protein") return "Dia alto en proteina";
  if (templateKey === "vegetable_recovery") return "Dia de recuperacion vegetal";
  if (templateKey === "balanced") return "Dia equilibrado correctivo";
  if (templateKey === "portable_workday") return "Dia portable para trabajo";
  if (templateKey === "post_excess") return "Dia correctivo post exceso";
  return templateName || "Dia sugerido";
}

function formatSlotLabel(slot) {
  if (slot === "breakfast") return "Desayuno";
  if (slot === "lunch") return "Almuerzo";
  if (slot === "dinner") return "Cena";
  if (slot === "snack") return "Snack";
  return "Slot";
}

function formatPriorityLabel(priority) {
  if (priority === "high") return "Alta prioridad";
  if (priority === "medium") return "Prioridad media";
  if (priority === "low") return "Baja prioridad";
  return "Prioridad media";
}

function formatSuggestionType(type) {
  if (type === "recipe") return "Receta";
  if (type === "portable_meal") return "Portable";
  if (type === "satiety_meal") return "Alta saciedad";
  if (type === "fallback") return "Idea simple";
  return "Sugerencia";
}

function formatPatternSummary(patterns) {
  const trends = patterns?.trends || {};

  if (trends.repeatedExcessCalories) {
    return "Exceso calorico repetido en dias recientes.";
  }

  if (trends.repeatedLowProtein && trends.repeatedLowVegetables) {
    return "Se repiten baja proteina y baja presencia de vegetales.";
  }

  if (trends.repeatedLowProtein) {
    return "Se repite baja ingesta de proteina.";
  }

  if (trends.repeatedLowVegetables) {
    return "Se repite baja ingesta de vegetales.";
  }

  if (trends.repeatedPoorBalance) {
    return "Se repite un desbalance de macros.";
  }

  return "No se observa un problema dominante claro.";
}

function formatFocusSummary(templateKey) {
  if (templateKey === "high_protein") return "Enfoque: proteina y saciedad";
  if (templateKey === "vegetable_recovery") return "Enfoque: vegetales, fibra y volumen";
  if (templateKey === "balanced") return "Enfoque: proteina y vegetales";
  if (templateKey === "portable_workday") return "Enfoque: practicidad y adherencia";
  if (templateKey === "post_excess") return "Enfoque: volumen, proteina y calorias moderadas";
  return "Enfoque: base equilibrada";
}

function formatMetricValue(value, unit, decimals = 0) {
  const rounded = roundNumber(value, decimals);
  if (!rounded) return "";
  const text = decimals > 0 ? rounded.toFixed(decimals).replace(".0", "") : Math.round(rounded);
  return `${text} ${unit}`;
}

function getPriorityTone(theme, priority) {
  if (priority === "high") {
    return {
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.2),
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    };
  }

  if (priority === "low") {
    return {
      color: theme.palette.text.secondary,
      borderColor: alpha(theme.palette.text.primary, 0.12),
      backgroundColor: alpha(theme.palette.text.primary, 0.04),
    };
  }

  return {
    color: theme.palette.warning.main,
    borderColor: alpha(theme.palette.warning.main, 0.22),
    backgroundColor: alpha(theme.palette.warning.main, 0.08),
  };
}

function getRelevantPatternItems(patterns) {
  const issues = patterns?.issues || {};
  const items = [];

  if (shouldShowMetric(issues.lowProteinDays)) {
    items.push({
      key: "protein",
      label: "Dias con proteina baja",
      value: String(Math.round(safeNumber(issues.lowProteinDays))),
    });
  }

  if (shouldShowMetric(issues.lowVegetableDays)) {
    items.push({
      key: "vegetables",
      label: "Dias con vegetales bajos",
      value: String(Math.round(safeNumber(issues.lowVegetableDays))),
    });
  }

  if (shouldShowMetric(issues.excessCalorieDays)) {
    items.push({
      key: "calories",
      label: "Dias con exceso calorico",
      value: String(Math.round(safeNumber(issues.excessCalorieDays))),
    });
  }

  if (shouldShowMetric(issues.poorBalanceDays)) {
    items.push({
      key: "balance",
      label: "Dias con desbalance",
      value: String(Math.round(safeNumber(issues.poorBalanceDays))),
    });
  }

  return items;
}

function getEnabledSlots(slots) {
  const safeSlots = slots && typeof slots === "object" ? slots : {};
  return ["breakfast", "lunch", "dinner", "snack"]
    .map((slot) => safeSlots[slot])
    .filter((slot) => slot?.enabled);
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

function getSlotSuggestionMatch(recovery, slotName) {
  if (!slotName) return null;

  return (
    recovery?.plan?.mealMatches?.slotMatches?.[slotName] ||
    recovery?.mealMatches?.slotMatches?.[slotName] ||
    recovery?.slotMatches?.[slotName] ||
    null
  );
}

function getSlotSuggestions(recovery, slotName, maxItems = 2) {
  const match = getSlotSuggestionMatch(recovery, slotName);
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

  if (shouldShowMetric(item?.calories)) {
    metrics.push(`${Math.round(safeNumber(item.calories))} kcal`);
  }
  if (shouldShowMetric(item?.protein)) {
    metrics.push(`${Math.round(safeNumber(item.protein))} g proteina`);
  }
  if (shouldShowMetric(item?.vegetableServings)) {
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

function CompactMetric({ label, value, compact = false }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1 : 1.2,
        borderRadius: 2.75,
        minWidth: 0,
        display: "grid",
        gap: 0.35,
        bgcolor: "rgba(255,255,255,0.68)",
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

function SlotCard({ slot, suggestions = [], compact = false }) {
  const metaParts = [];

  if (shouldShowMetric(slot?.targetCalories)) {
    metaParts.push(`${Math.round(safeNumber(slot.targetCalories))} kcal`);
  }
  if (shouldShowMetric(slot?.targetProtein)) {
    metaParts.push(`${Math.round(safeNumber(slot.targetProtein))} g proteina`);
  }
  if (shouldShowMetric(slot?.targetVegetables)) {
    metaParts.push(
      `${roundNumber(slot.targetVegetables, 1).toFixed(1).replace(".0", "")} porciones de vegetales`
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
            {formatSlotLabel(slot?.slot)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {slot?.strategy || "Sin estrategia definida."}
          </Typography>
        </Box>

        <Chip
          size="small"
          label={formatPriorityLabel(slot?.priority)}
          sx={(theme) => {
            const tone = getPriorityTone(theme, slot?.priority);
            return {
              color: tone.color,
              borderColor: tone.borderColor,
              backgroundColor: tone.backgroundColor,
            };
          }}
          variant="outlined"
        />
      </Stack>

      {metaParts.length ? (
        <Typography variant="body2" color="text.secondary">
          {metaParts.join(" • ")}
        </Typography>
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

export default function NextDayRecoveryCard({
  recentDays,
  options,
  title,
  compact = false,
}) {
  const recovery = useMemo(
    () =>
      buildNextDayRecoveryPlan({
        recentDays,
        options,
      }),
    [recentDays, options]
  );

  const enabledSlots = getEnabledSlots(recovery?.plan?.slots);
  const maxSuggestionsPerSlot = compact ? 2 : 3;
  const patternItems = getRelevantPatternItems(recovery?.patterns);
  const visibleReasoning = Array.isArray(recovery?.reasoning)
    ? recovery.reasoning.slice(0, compact ? 3 : 5)
    : [];

  const totals = recovery?.plan?.totals || {};
  const totalItems = [
    shouldShowMetric(totals.plannedCalories)
      ? {
          key: "calories",
          label: "Calorias planificadas",
          value: formatMetricValue(totals.plannedCalories, "kcal"),
        }
      : null,
    shouldShowMetric(totals.plannedProtein)
      ? {
          key: "protein",
          label: "Proteina planificada",
          value: formatMetricValue(totals.plannedProtein, "g"),
        }
      : null,
    shouldShowMetric(totals.plannedVegetables)
      ? {
          key: "vegetables",
          label: "Vegetales planificados",
          value: formatMetricValue(totals.plannedVegetables, "porciones", 1),
        }
      : null,
    shouldShowMetric(totals.enabledSlots)
      ? {
          key: "slots",
          label: "Slots activos",
          value: String(Math.round(safeNumber(totals.enabledSlots))),
        }
      : null,
  ].filter(Boolean);

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
            {title || "Plan sugerido para manana"}
          </Typography>
          {recovery?.status === "insufficient_data" ? (
            <Typography variant="body2" color="text.secondary">
              Aun no hay suficiente informacion reciente para proponer un plan de recuperacion para manana.
            </Typography>
          ) : (
            <Typography variant={compact ? "body2" : "subtitle1"} sx={{ fontWeight: 700 }}>
              {recovery?.summary || "Todavia no hay una propuesta clara para manana."}
            </Typography>
          )}
        </Box>

        {recovery?.status === "insufficient_data" ? null : (
          <>
            <Box sx={{ display: "grid", gap: 0.8 }}>
              <Typography variant="body2" color="text.secondary">
                {formatPatternSummary(recovery?.patterns)}
              </Typography>

              <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={formatTemplateLabel(recovery?.templateKey, recovery?.templateName)}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${enabledSlots.length} slot${enabledSlots.length === 1 ? "" : "s"} activo${enabledSlots.length === 1 ? "" : "s"}`}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${Math.round(safeNumber(recovery?.patterns?.daysAnalyzed))} dia${Math.round(safeNumber(recovery?.patterns?.daysAnalyzed)) === 1 ? "" : "s"} analizado${Math.round(safeNumber(recovery?.patterns?.daysAnalyzed)) === 1 ? "" : "s"}`}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={formatFocusSummary(recovery?.templateKey)}
                  variant="outlined"
                />
                {options?.isWorkday ? (
                  <Chip size="small" label="Dia laboral" variant="outlined" />
                ) : null}
              </Box>
            </Box>

            {patternItems.length ? (
              <Box sx={{ display: "grid", gap: 0.8 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Patrones recientes
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: `repeat(${Math.min(patternItems.length, 4)}, minmax(0, 1fr))`,
                    },
                    gap: 0.9,
                  }}
                >
                  {patternItems.map((item) => (
                    <CompactMetric
                      key={item.key}
                      label={item.label}
                      value={item.value}
                      compact={compact}
                    />
                  ))}
                </Box>
              </Box>
            ) : null}

            {enabledSlots.length ? (
              <>
                <Divider />
                <Box sx={{ display: "grid", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Slots planificados
                  </Typography>
                  <Stack spacing={1}>
                    {enabledSlots.map((slot) => (
                      <SlotCard
                        key={slot.slot || "slot"}
                        slot={slot}
                        suggestions={getSlotSuggestions(recovery, slot?.slot, maxSuggestionsPerSlot)}
                        compact={compact}
                      />
                    ))}
                  </Stack>
                </Box>
              </>
            ) : null}

            {totalItems.length ? (
              <>
                <Divider />
                <Box sx={{ display: "grid", gap: 0.8 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Totales del plan
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(1, minmax(0, 1fr))",
                        sm: `repeat(${Math.min(totalItems.length, 4)}, minmax(0, 1fr))`,
                      },
                      gap: 0.9,
                    }}
                  >
                    {totalItems.map((item) => (
                      <CompactMetric
                        key={item.key}
                        label={item.label}
                        value={item.value}
                        compact={compact}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            ) : null}

            {visibleReasoning.length ? (
              <>
                <Divider />
                <Box sx={{ display: "grid", gap: 0.85 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Por que te lo proponemos
                  </Typography>
                  <ReasoningList items={visibleReasoning} compact={compact} />
                </Box>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
