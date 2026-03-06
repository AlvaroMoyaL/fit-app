import React from "react";
import { Box, Card, CardContent, Typography, Alert, Button } from "@mui/material";
import {
  analizarProgresoPeso,
  detectarEstancamientoPeso,
  calcularAjusteCalorico,
} from "../../utils/adaptiveNutrition";

export default function NutritionAlerts({
  calorieHistory = [],
  weightHistory = [],
  currentTargetCalories,
  onOpenDetail,
}) {
  const progress = analizarProgresoPeso({
    calorieHistory,
    weightHistory,
  });

  const stall = detectarEstancamientoPeso({
    calorieHistory,
    weightHistory,
  });

  const adjustment = calcularAjusteCalorico({
    calorieHistory,
    weightHistory,
    currentTargetCalories,
  });

  const efficiencyRatio = Number(progress?.efficiencyRatio || 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">Análisis Nutricional</Typography>

          {!progress.analysisAvailable && (
            <Alert severity="info">
              Aún no hay suficientes datos para analizar tu progreso nutricional.
            </Alert>
          )}

          {progress.analysisAvailable && efficiencyRatio >= 0.8 && efficiencyRatio <= 1.2 && (
            <Alert
              severity="success"
              action={
                <Button color="inherit" size="small" onClick={() => onOpenDetail?.("progreso")}>
                  Ver detalle
                </Button>
              }
            >
              Tu progreso de pérdida de peso está dentro de lo esperado.
            </Alert>
          )}

          {progress.analysisAvailable && efficiencyRatio >= 0.4 && efficiencyRatio < 0.8 && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => onOpenDetail?.("progreso")}>
                  Ver detalle
                </Button>
              }
            >
              Tu pérdida de peso está siendo más lenta de lo esperado.
            </Alert>
          )}

          {progress.analysisAvailable && stall.stallDetected && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => onOpenDetail?.("estancamiento")}
                >
                  Ver detalle
                </Button>
              }
            >
              Se detecta posible estancamiento en la pérdida de peso.
            </Alert>
          )}

          {progress.analysisAvailable && efficiencyRatio > 1.2 && (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={() => onOpenDetail?.("progreso")}>
                  Ver detalle
                </Button>
              }
            >
              Estás perdiendo peso más rápido de lo esperado.
            </Alert>
          )}

          {progress.analysisAvailable && adjustment.adjustmentNeeded && (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={() => onOpenDetail?.("ajuste")}>
                  Ver detalle
                </Button>
              }
            >
              Recomendación: ajustar calorías en {adjustment.recommendedAdjustment} kcal/día.
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
