import React from "react";
import { Box, Card, CardContent, Typography, Divider, Chip } from "@mui/material";
import {
  calcularAjusteCalorico,
  calcularNuevoObjetivoCalorico,
} from "../../utils/adaptiveNutrition";

function getExplanationText(code) {
  if (code === "possible_plateau_detected" || code === "possible_plateau") {
    return "Se detectó posible estancamiento en la pérdida de peso.";
  }
  if (code === "slow_progress" || code === "slow_progress_adjustment") {
    return "Tu progreso es más lento de lo esperado.";
  }
  if (code === "fast_weight_loss" || code === "weight_loss_too_fast") {
    return "Estás perdiendo peso más rápido de lo esperado.";
  }
  if (code === "deficit_below_threshold") {
    return "El déficit actual aún no justifica un ajuste calórico.";
  }
  return "Tu progreso es adecuado, no se requieren ajustes.";
}

export default function AdaptiveCalorieAdjustment({
  calorieHistory = [],
  weightHistory = [],
  currentTargetCalories = 0,
  onOpenDetail,
}) {
  const adjustment = calcularAjusteCalorico({
    calorieHistory,
    weightHistory,
  });

  const recommendedAdjustment = Number(adjustment?.recommendedAdjustment || 0);
  const newTarget = calcularNuevoObjetivoCalorico({
    currentTargetCalories,
    adjustment: recommendedAdjustment,
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">Calorías Adaptativas</Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body1">Calorías objetivo actuales:</Typography>
            <Typography variant="h5">
              {Math.round(Number(currentTargetCalories || 0))} kcal/día
            </Typography>
          </Box>

          {adjustment?.adjustmentNeeded ? (
            <Chip
              color="warning"
              label={`Ajuste recomendado: ${recommendedAdjustment} kcal`}
              sx={{ width: "fit-content" }}
            />
          ) : (
            <Chip
              color="success"
              label="Calorías adecuadas actualmente"
              sx={{ width: "fit-content" }}
            />
          )}

          <Divider />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body1">Nueva recomendación calórica</Typography>
            <Typography variant="h4">
              {Math.round(Number(newTarget?.newTargetCalories || 0))} kcal/día
            </Typography>
          </Box>

          <Typography variant="body2">
            {getExplanationText(adjustment?.explanation || "mantener_calorias")}
          </Typography>
          <Box>
            <Chip
              clickable
              color="info"
              label="Ver detalle del ajuste"
              onClick={() => onOpenDetail?.("ajuste")}
              sx={{ width: "fit-content" }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
