import { useMemo } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { evaluateDailyNutrition } from "../../utils/nutritionEvaluation";
import { nutritionSurfaceSx } from "./nutritionUi";

function scoreLabel(score) {
  if (score === "excellent") return "Excelente";
  if (score === "acceptable") return "Aceptable";
  return "Mejorable";
}

function scoreColor(score) {
  if (score === "excellent") return "success.main";
  if (score === "acceptable") return "warning.main";
  return "error.main";
}

export default function NutritionEvaluation({ totals, profile, tdee, embedded = false }) {
  const weight = Number(profile?.weight ?? profile?.peso ?? 0);
  const evaluation = useMemo(
    () => evaluateDailyNutrition({ ...(totals || {}), weight }, tdee, profile),
    [profile, totals, tdee, weight]
  );

  const content = (
    <>
      <Typography variant={embedded ? "subtitle1" : "h6"}>Evaluación del día</Typography>
      <Typography variant="body1" sx={{ color: scoreColor(evaluation.score), fontWeight: 700 }}>
        {scoreLabel(evaluation.score)}
      </Typography>
      <Typography variant="subtitle2">Sugerencias</Typography>
      {evaluation.messages.length === 0 ? (
        <Typography variant="body2">Buen equilibrio general para el día.</Typography>
      ) : (
        evaluation.messages.map((message) => (
          <Typography key={message} variant="body2">
            {message}
          </Typography>
        ))
      )}
    </>
  );

  if (embedded) {
    return (
      <Box sx={(theme) => ({ ...nutritionSurfaceSx(theme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1 })}>
        {content}
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1 }}>
        {content}
      </CardContent>
    </Card>
  );
}
