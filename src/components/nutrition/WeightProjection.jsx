import { Box, Card, CardContent, Typography } from "@mui/material";
import { projectWeightChange } from "../../utils/weightProjection";
import { nutritionSurfaceSx } from "./nutritionUi";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function projectionColor(change) {
  if (change < 0) return "success.main";
  if (change > 0) return "error.main";
  return "warning.main";
}

function projectionSign(change) {
  const rounded = Number(change.toFixed(2));
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function formatWeight(weight) {
  return Number(weight).toFixed(1);
}

export default function WeightProjection({ currentWeight, dailyBalance, embedded = false }) {
  const weight = toNumber(currentWeight);
  const projections = projectWeightChange(dailyBalance);
  const rows = [
    { label: "Proyección 7 días", change: projections.week, projectedWeight: weight + projections.week },
    { label: "Proyección 30 días", change: projections.month, projectedWeight: weight + projections.month },
    {
      label: "Proyección 90 días",
      change: projections.threeMonths,
      projectedWeight: weight + projections.threeMonths,
    },
  ];

  const content = (
    <>
      <Typography variant={embedded ? "subtitle1" : "h6"}>Proyección de peso</Typography>
      <Typography variant="body1">
        Peso actual: <strong>{formatWeight(weight)} kg</strong>
      </Typography>
      <Box sx={{ display: "grid", gap: 0.9 }}>
        {rows.map((row) => (
          <Box key={row.label} sx={{ display: "grid", gap: 0.15 }}>
            <Typography variant="body2" sx={{ color: projectionColor(row.change), fontWeight: 700 }}>
              {row.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cambio estimado: {projectionSign(row.change)} kg
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Peso proyectado: {formatWeight(row.projectedWeight)} kg
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  );

  if (embedded) {
    return (
      <Box sx={(theme) => ({ ...nutritionSurfaceSx(theme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1.2 })}>
        {content}
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.5 }}>
        {content}
      </CardContent>
    </Card>
  );
}
