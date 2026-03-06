import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import {
  analizarProgresoPeso,
  detectarEstancamientoPeso,
  calcularAjusteCalorico,
} from "../../utils/adaptiveNutrition";

function fmt(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(digits);
}

export default function AdaptiveInsightDrawer({
  open,
  onClose,
  calorieHistory = [],
  weightHistory = [],
  currentTargetCalories = 0,
  focusSection = "progreso",
}) {
  const progress = analizarProgresoPeso({ calorieHistory, weightHistory });
  const stall = detectarEstancamientoPeso({ calorieHistory, weightHistory });
  const adjustment = calcularAjusteCalorico({ calorieHistory, weightHistory });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 430 }, p: 2.2, display: "grid", gap: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Detalle Adaptativo</Typography>
          <Button size="small" onClick={onClose}>
            Cerrar
          </Button>
        </Stack>

        {!progress.analysisAvailable ? (
          <Typography variant="body2" color="text.secondary">
            Aún no hay suficientes datos para análisis adaptativo.
          </Typography>
        ) : (
          <>
            <Box
              id="adaptive-progreso"
              sx={{
                display: "grid",
                gap: 0.6,
                p: 1,
                borderRadius: 1,
                border: "1px solid",
                borderColor: focusSection === "progreso" ? "primary.main" : "divider",
              }}
            >
              <Typography variant="subtitle2">Progreso</Typography>
              <Typography variant="body2">
                Eficiencia déficit: {fmt(progress.efficiencyRatio, 2)}
              </Typography>
              <Typography variant="body2">
                Pérdida esperada: {fmt(progress.expectedWeightLoss, 2)} kg
              </Typography>
              <Typography variant="body2">
                Cambio real: {fmt(progress.realWeightChange, 2)} kg
              </Typography>
              <Typography variant="body2">{progress.interpretation}</Typography>
            </Box>

            <Divider />

            <Box
              id="adaptive-estancamiento"
              sx={{
                display: "grid",
                gap: 0.6,
                p: 1,
                borderRadius: 1,
                border: "1px solid",
                borderColor: focusSection === "estancamiento" ? "primary.main" : "divider",
              }}
            >
              <Typography variant="subtitle2">Estancamiento</Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  color={stall.stallDetected ? "error" : "success"}
                  label={stall.stallDetected ? "Posible estancamiento" : "Sin estancamiento"}
                />
                <Chip size="small" label={`Días: ${stall.daysAnalyzed || 0}`} />
              </Stack>
              <Typography variant="body2">
                Cambio peso período: {fmt(stall.weightChange || 0, 2)} kg
              </Typography>
              <Typography variant="body2">
                Déficit promedio: {fmt(stall.averageDeficit || 0, 0)} kcal/día
              </Typography>
            </Box>

            <Divider />

            <Box
              id="adaptive-ajuste"
              sx={{
                display: "grid",
                gap: 0.6,
                p: 1,
                borderRadius: 1,
                border: "1px solid",
                borderColor: focusSection === "ajuste" ? "primary.main" : "divider",
              }}
            >
              <Typography variant="subtitle2">Ajuste recomendado</Typography>
              <Typography variant="body2">
                Objetivo actual: {Math.round(Number(currentTargetCalories || 0))} kcal/día
              </Typography>
              <Typography variant="body2">
                Ajuste: {Number(adjustment.recommendedAdjustment || 0)} kcal/día
              </Typography>
              <Typography variant="body2">
                Código: {adjustment.explanation || "mantener_calorias"}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
