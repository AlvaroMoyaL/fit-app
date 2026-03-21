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

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildRecoveryViewSignature(recovery) {
  if (!isObject(recovery)) return "";

  try {
    return JSON.stringify({
      summary: recovery.summary || "",
      templateKey: recovery.templateKey || "",
      recoveryType: recovery.recoveryType || "",
      slots: getEnabledSlots(recovery?.plan?.slots).map((slot) => ({
        slot: slot?.slot || "",
        priority: slot?.priority || "",
        strategy: slot?.strategy || "",
      })),
      totals: {
        plannedCalories: roundNumber(recovery?.plan?.totals?.plannedCalories),
        plannedProtein: roundNumber(recovery?.plan?.totals?.plannedProtein),
        plannedVegetables: roundNumber(recovery?.plan?.totals?.plannedVegetables, 1),
      },
    });
  } catch {
    return "";
  }
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

function getSuggestionFitLabel(score) {
  const safeScore = safeNumber(score, -1);
  if (safeScore >= 55) return "Buen ajuste";
  if (safeScore >= 35) return "Ajuste util";
  return "";
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
  if (templateKey === "high_protein") return "Proteina y saciedad";
  if (templateKey === "vegetable_recovery") return "Vegetales y fibra";
  if (templateKey === "balanced") return "Proteina y vegetales";
  if (templateKey === "portable_workday") return "Portable y adherente";
  if (templateKey === "post_excess") return "Volumen y control";
  return "Base equilibrada";
}

function formatMetricValue(value, unit, decimals = 0) {
  const rounded = roundNumber(value, decimals);
  if (!rounded) return "";
  const text = decimals > 0 ? rounded.toFixed(decimals).replace(".0", "") : Math.round(rounded);
  return `${text} ${unit}`;
}

function getTemplateTone(theme, templateKey) {
  if (templateKey === "high_protein") {
    return {
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.18),
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    };
  }

  if (templateKey === "vegetable_recovery") {
    return {
      color: theme.palette.success.main,
      borderColor: alpha(theme.palette.success.main, 0.2),
      backgroundColor: alpha(theme.palette.success.main, 0.08),
    };
  }

  if (templateKey === "post_excess") {
    return {
      color: theme.palette.warning.dark,
      borderColor: alpha(theme.palette.warning.main, 0.22),
      backgroundColor: alpha(theme.palette.warning.main, 0.09),
    };
  }

  return {
    color: theme.palette.text.primary,
    borderColor: alpha(theme.palette.text.primary, 0.12),
    backgroundColor: alpha(theme.palette.text.primary, 0.04),
  };
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

function getSlotSuggestionMatch(recovery, slotName) {
  if (!slotName) return null;

  return [
    recovery?.plan?.mealOptionsBySlot?.[slotName],
    recovery?.mealOptionsBySlot?.[slotName],
    recovery?.plan?.mealMatches?.mealOptionsBySlot?.[slotName],
    recovery?.mealMatches?.mealOptionsBySlot?.[slotName],
    recovery?.plan?.mealMatches?.slotMatches?.[slotName],
    recovery?.mealMatches?.slotMatches?.[slotName],
    recovery?.slotMatches?.[slotName],
    recovery?.plan?.slotMatches?.[slotName],
    recovery?.plan?.suggestionsBySlot?.[slotName],
    recovery?.plan?.suggestions?.[slotName],
    recovery?.suggestionsBySlot?.[slotName],
    recovery?.suggestions?.[slotName],
  ].find(Boolean) || null;
}

function getSlotSuggestions(recovery, slotName, maxItems = 2) {
  const match = getSlotSuggestionMatch(recovery, slotName);
  const suggestions = extractSuggestionItems(match);

  return suggestions
    .map(normalizeSuggestionItem)
    .filter(Boolean)
    .sort((left, right) => safeNumber(right?.score, -1) - safeNumber(left?.score, -1))
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

function CompactMetric({ label, value, compact = false }) {
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

function SlotCard({ slot, suggestions = [], compact = false }) {
  const targetMetrics = [];

  if (shouldShowMetric(slot?.targetCalories)) {
    targetMetrics.push(`${Math.round(safeNumber(slot.targetCalories))} kcal`);
  }
  if (shouldShowMetric(slot?.targetProtein)) {
    targetMetrics.push(`${Math.round(safeNumber(slot.targetProtein))} g proteina`);
  }
  if (shouldShowMetric(slot?.targetVegetables)) {
    targetMetrics.push(
      `${roundNumber(slot.targetVegetables, 1).toFixed(1).replace(".0", "")} porciones de vegetales`
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
            {formatSlotLabel(slot?.slot)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
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
              fontWeight: 700,
            };
          }}
          variant="outlined"
        />
      </Stack>

      {targetMetrics.length ? (
        <Box sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}>
          {targetMetrics.map((metric) => (
            <Chip
              key={`${slot?.slot || "slot"}-${metric}`}
              label={metric}
              size="small"
              variant="outlined"
              sx={{ bgcolor: "rgba(255,255,255,0.74)" }}
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
  recovery,
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
          <Button size="small" variant="outlined" color="primary" onClick={() => onAccept(recovery)}>
            Usar manana
          </Button>
        ) : null}
        {onSaveForLater ? (
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => onSaveForLater(recovery)}
            sx={{ px: compact ? 0.5 : 0.8 }}
          >
            Guardar idea
          </Button>
        ) : null}
        {onDismiss ? (
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => onDismiss(recovery)}
            sx={{ px: compact ? 0.5 : 0.8 }}
          >
            Descartar
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

export default function NextDayRecoveryCard({
  recentDays,
  options,
  context,
  planOverride,
  title,
  onViewed,
  onAccept,
  onSaveForLater,
  onDismiss,
  compact = false,
}) {
  const recovery = useMemo(
    () => {
      if (isObject(planOverride)) {
        return planOverride;
      }

      return buildNextDayRecoveryPlan({
        recentDays,
        options,
        context,
      });
    },
    [recentDays, options, context, planOverride]
  );
  const viewSignature = useMemo(() => buildRecoveryViewSignature(recovery), [recovery]);
  const viewedSignatureRef = useRef("");

  useEffect(() => {
    if (!onViewed) return;
    if (recovery?.status === "insufficient_data") return;
    if (!viewSignature || viewedSignatureRef.current === viewSignature) return;

    viewedSignatureRef.current = viewSignature;
    onViewed(recovery);
  }, [onViewed, recovery, viewSignature]);

  const enabledSlots = getEnabledSlots(recovery?.plan?.slots);
  const maxSuggestionsPerSlot = 2;
  const patternItems = getRelevantPatternItems(recovery?.patterns);
  const visibleReasoning = Array.isArray(recovery?.reasoning)
    ? recovery.reasoning.slice(0, compact ? 2 : 3)
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
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 42%)`,
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
            <SectionLabel>Manana sugerido</SectionLabel>
            <Typography variant={compact ? "subtitle1" : "h6"} sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {title || "Plan sugerido para manana"}
            </Typography>
          </Box>

          {recovery?.status === "insufficient_data" ? null : (
            <Chip
              size="small"
              label={formatTemplateLabel(recovery?.templateKey, recovery?.templateName)}
              variant="outlined"
              sx={(theme) => {
                const tone = getTemplateTone(theme, recovery?.templateKey);
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

        {recovery?.status === "insufficient_data" ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Aun no hay suficiente informacion reciente para proponer un plan de recuperacion para manana.
          </Typography>
        ) : (
          <>
            <Paper
              variant="outlined"
              sx={(theme) => ({
                p: compact ? 1.15 : 1.35,
                borderRadius: 3.1,
                display: "grid",
                gap: 0.85,
                backgroundColor: alpha(theme.palette.text.primary, 0.025),
                borderColor: alpha(theme.palette.text.primary, 0.08),
              })}
            >
              <SectionLabel>Patron reciente</SectionLabel>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {formatPatternSummary(recovery?.patterns)}
              </Typography>

              <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={`${Math.round(safeNumber(recovery?.patterns?.daysAnalyzed))} dia${Math.round(safeNumber(recovery?.patterns?.daysAnalyzed)) === 1 ? "" : "s"} analizado${Math.round(safeNumber(recovery?.patterns?.daysAnalyzed)) === 1 ? "" : "s"}`}
                  variant="outlined"
                  sx={{ bgcolor: "rgba(255,255,255,0.74)" }}
                />
                {options?.isWorkday ? (
                  <Chip size="small" label="Dia laboral" variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.74)" }} />
                ) : null}
              </Box>

              {patternItems.length ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: `repeat(${Math.min(patternItems.length, 4)}, minmax(0, 1fr))`,
                    },
                    gap: 0.8,
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
              ) : null}
            </Paper>

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
              <SectionLabel>Tipo de dia sugerido</SectionLabel>
              <Typography variant={compact ? "body1" : "h6"} sx={{ fontWeight: 800, lineHeight: 1.28 }}>
                {recovery?.summary || "Todavia no hay una propuesta clara para manana."}
              </Typography>

              <Box sx={{ display: "flex", gap: 0.65, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={`${enabledSlots.length} slot${enabledSlots.length === 1 ? "" : "s"} activo${enabledSlots.length === 1 ? "" : "s"}`}
                  variant="outlined"
                  sx={{ bgcolor: "rgba(255,255,255,0.72)" }}
                />
                <Chip
                  size="small"
                  label={formatFocusSummary(recovery?.templateKey)}
                  variant="outlined"
                  sx={{ bgcolor: "rgba(255,255,255,0.72)" }}
                />
              </Box>

              {totalItems.length ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: `repeat(${Math.min(totalItems.length, 4)}, minmax(0, 1fr))`,
                    },
                    gap: 0.8,
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
              ) : null}
            </Paper>

            {enabledSlots.length ? (
              <Box sx={{ display: "grid", gap: 0.95 }}>
                <SectionLabel>Slots principales</SectionLabel>
                <Stack spacing={0.95}>
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
              recovery={recovery}
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
