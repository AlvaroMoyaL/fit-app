import React from "react";
import { Box, Card, CardContent, Typography, Alert, Button, Stack } from "@mui/material";
import {
  analizarProgresoPeso,
  detectarEstancamientoPeso,
  calcularAjusteCalorico,
} from "../../utils/adaptiveNutrition";
import { nutritionSurfaceSx } from "./nutritionUi";

export default function NutritionAlerts({
  alerts,
  calorieHistory = [],
  weightHistory = [],
  currentTargetCalories,
  onOpenDetail,
  embedded = false,
}) {
  const explicitAlerts = Array.isArray(alerts) ? alerts : null;
  const wrap = (children) => {
    if (embedded) {
      return (
        <Box sx={(theme) => ({ ...nutritionSurfaceSx(theme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1.2 })}>
          {children}
        </Box>
      );
    }

    return (
      <Card variant="outlined">
        <CardContent>{children}</CardContent>
      </Card>
    );
  };

  if (explicitAlerts) {
    return wrap(
      <Stack spacing={1.2}>
        <Typography variant={embedded ? "subtitle1" : "h6"}>Alertas del día</Typography>
        {explicitAlerts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay alertas nutricionales relevantes hoy.
          </Typography>
        ) : (
          <Stack spacing={0.9}>
            {explicitAlerts.map((alert, index) => (
              <Typography key={`${alert?.type || "alert"}-${index}`} variant="body2">
                {alert?.message || ""}
              </Typography>
            ))}
          </Stack>
        )}
      </Stack>
    );
  }

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

  return wrap(
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant={embedded ? "subtitle1" : "h6"}>Análisis adaptativo</Typography>

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
  );
}
