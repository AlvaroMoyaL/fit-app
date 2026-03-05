import { useMemo } from "react";
import { Card, CardContent, Typography } from "@mui/material";
import { evaluateDailyNutrition } from "../../utils/nutritionEvaluation";

function scoreLabel(score) {
  if (score === "excellent") return "🟢 Excelente";
  if (score === "acceptable") return "🟡 Aceptable";
  return "🔴 Mejorable";
}

function scoreColor(score) {
  if (score === "excellent") return "success.main";
  if (score === "acceptable") return "warning.main";
  return "error.main";
}

export default function NutritionEvaluation({ totals, profile, tdee }) {
  const weight = Number(profile?.weight ?? profile?.peso ?? 0);
  const evaluation = useMemo(
    () => evaluateDailyNutrition({ ...(totals || {}), weight }, tdee),
    [totals, tdee, weight]
  );

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1 }}>
        <Typography variant="h6">Evaluación del día</Typography>
        <Typography variant="body1" sx={{ color: scoreColor(evaluation.score), fontWeight: 700 }}>
          {scoreLabel(evaluation.score)}
        </Typography>
        <Typography variant="subtitle2">Sugerencias:</Typography>
        {evaluation.messages.length === 0 ? (
          <Typography variant="body2">Buen equilibrio general para el día.</Typography>
        ) : (
          evaluation.messages.map((message) => (
            <Typography key={message} variant="body2">
              • {message}
            </Typography>
          ))
        )}
      </CardContent>
    </Card>
  );
}
