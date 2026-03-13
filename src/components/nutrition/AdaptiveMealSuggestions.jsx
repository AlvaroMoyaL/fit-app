import { useMemo } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { createMealCorrections } from "../../utils/mealCorrectionEngine";

function formatPriorityLabel(priority) {
  if (priority === "protein-and-vegetables") return "Proteina y vegetales";
  if (priority === "protein") return "Proteina";
  if (priority === "vegetables") return "Vegetales";
  if (priority === "macro-balance") return "Balance de macros";
  if (priority === "light-adjustment") return "Ajuste ligero";
  return "Sin accion";
}

function formatSuggestionMeta(item) {
  const parts = [];

  if (Number(item?.protein) > 0) {
    parts.push(`${Math.round(Number(item.protein))} g proteina`);
  }

  if (Number(item?.calories) > 0) {
    parts.push(`${Math.round(Number(item.calories))} kcal`);
  }

  if (Number(item?.vegetableServings) > 0) {
    parts.push(`${Number(item.vegetableServings).toFixed(1).replace(".0", "")} porciones de vegetales`);
  }

  return parts.join(" • ");
}

function getSuggestionName(item) {
  return item?.name || item?.recipe?.name || "Opcion sugerida";
}

function SuggestionItem({ item, compact = false }) {
  const tags = Array.isArray(item?.tags) ? item.tags.slice(0, compact ? 2 : 3) : [];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.1 : 1.4,
        borderRadius: 2.5,
        display: "grid",
        gap: compact ? 0.7 : 0.9,
        bgcolor: "rgba(255,255,255,0.74)",
      }}
    >
      <Box sx={{ display: "grid", gap: 0.35 }}>
        <Typography variant={compact ? "body2" : "subtitle2"} sx={{ fontWeight: 800 }}>
          {getSuggestionName(item)}
        </Typography>
        {item?.serving ? (
          <Typography variant="caption" color="text.secondary">
            {item.serving}
          </Typography>
        ) : null}
      </Box>

      <Typography variant="body2" color="text.secondary">
        {formatSuggestionMeta(item)}
      </Typography>

      {tags.length ? (
        <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap" }}>
          {tags.map((tag) => (
            <Chip key={`${item?.id || item?.recipe?.id || "tag"}-${tag}`} size="small" label={tag} variant="outlined" />
          ))}
        </Box>
      ) : null}
    </Paper>
  );
}

function SuggestionGroup({ title, items, compact = false }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {items.map((item, index) => (
          <SuggestionItem
            key={`${item?.id || item?.recipe?.id || title}-${index}`}
            item={item}
            compact={compact}
          />
        ))}
      </Stack>
    </Box>
  );
}

function SummaryChips({ summary }) {
  const chips = [];

  if (summary?.needsProtein) chips.push({ key: "protein", label: "Proteina baja" });
  if (summary?.needsVegetables) chips.push({ key: "vegetables", label: "Vegetales bajos" });
  if (Number(summary?.caloriesRemaining) > 0) {
    chips.push({
      key: "calories",
      label: `${Math.round(Number(summary.caloriesRemaining))} kcal disponibles`,
    });
  }
  if (summary?.priority) {
    chips.push({
      key: "priority",
      label: `Prioridad: ${formatPriorityLabel(summary.priority)}`,
    });
  }

  if (!chips.length) return null;

  return (
    <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
      {chips.map((chip) => (
        <Chip key={chip.key} size="small" label={chip.label} variant="outlined" />
      ))}
    </Box>
  );
}

export default function AdaptiveMealSuggestions({
  dailyStatus,
  options = {},
  title,
  compact = false,
}) {
  const result = useMemo(
    () => createMealCorrections(dailyStatus, options),
    [dailyStatus, options]
  );

  const summary = result?.summary || {};
  const messages = Array.isArray(result?.messages) ? result.messages : [];
  const bestStrategy = result?.bestStrategy || null;
  const suggestions = result?.suggestions || {};
  const mealSuggestions = Array.isArray(suggestions?.meals)
    ? suggestions.meals.slice(0, compact ? 2 : 4)
    : [];
  const proteinSuggestions = Array.isArray(suggestions?.proteinFoods)
    ? suggestions.proteinFoods.slice(0, compact ? 2 : 4)
    : [];
  const vegetableSuggestions = Array.isArray(suggestions?.vegetableFoods)
    ? suggestions.vegetableFoods.slice(0, compact ? 2 : 4)
    : [];
  const visibleMessages = messages.slice(0, compact ? 2 : 4);
  const hasSuggestions =
    mealSuggestions.length > 0 || proteinSuggestions.length > 0 || vegetableSuggestions.length > 0;

  if (!bestStrategy && visibleMessages.length === 0 && !hasSuggestions) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="success">No se detectan correcciones importantes por ahora.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: compact ? 1.5 : 2 }}>
        <Box sx={{ display: "grid", gap: 0.7 }}>
          <Typography variant="h6">
            {title || "Recomendaciones para mejorar tu dia"}
          </Typography>
          {!compact ? (
            <Typography variant="body2" color="text.secondary">
              Ajustes sugeridos segun tu estado nutricional actual.
            </Typography>
          ) : null}
        </Box>

        <SummaryChips summary={summary} />

        {bestStrategy ? (
          <Paper
            variant="outlined"
            sx={{
              p: compact ? 1.2 : 1.6,
              borderRadius: 3,
              display: "grid",
              gap: 0.7,
              bgcolor: "rgba(15,118,110,0.08)",
              borderColor: "rgba(15,118,110,0.2)",
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.12em", color: "text.secondary" }}>
              Estrategia principal
            </Typography>
            <Typography variant={compact ? "subtitle2" : "subtitle1"} sx={{ fontWeight: 800 }}>
              {bestStrategy.label || "Sin estrategia principal"}
            </Typography>
            {bestStrategy.reason ? (
              <Typography variant="body2" color="text.secondary">
                {bestStrategy.reason}
              </Typography>
            ) : null}
          </Paper>
        ) : null}

        {visibleMessages.length ? (
          <>
            <Divider />
            <Box sx={{ display: "grid", gap: 0.8 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Lo que detectamos hoy
              </Typography>
              <List disablePadding sx={{ display: "grid", gap: 0.4 }}>
                {visibleMessages.map((message, index) => (
                  <ListItem key={`message-${index}`} disablePadding sx={{ alignItems: "flex-start" }}>
                    <ListItemText
                      primaryTypographyProps={{ variant: "body2" }}
                      primary={message}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </>
        ) : null}

        {hasSuggestions ? <Divider /> : null}

        <Stack spacing={compact ? 1.4 : 1.8}>
          <SuggestionGroup
            title="Comidas sugeridas"
            items={mealSuggestions}
            compact={compact}
          />
          <SuggestionGroup
            title="Opciones de proteina"
            items={proteinSuggestions}
            compact={compact}
          />
          <SuggestionGroup
            title="Opciones para aumentar vegetales"
            items={vegetableSuggestions}
            compact={compact}
          />
        </Stack>

        {!hasSuggestions && visibleMessages.length === 0 ? (
          <Alert severity="success">
            Tu alimentación de hoy no requiere ajustes relevantes.
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
