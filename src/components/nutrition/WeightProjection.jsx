import { Card, CardContent, Typography } from "@mui/material";
import { projectWeightChange } from "../../utils/weightProjection";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function projectionColor(change) {
  if (change < 0) return "success.main";
  if (change > 0) return "error.main";
  return "warning.main";
}

function projectionIcon(change) {
  if (change < 0) return "v";
  if (change > 0) return "^";
  return "-";
}

function projectionSign(change) {
  const rounded = Number(change.toFixed(2));
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function formatWeight(weight) {
  return Number(weight).toFixed(1);
}

export default function WeightProjection({ currentWeight, dailyBalance }) {
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

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.5 }}>
        <Typography variant="h6">Proyección de peso</Typography>
        {rows.map((row) => (
          <Typography key={row.label} variant="body2" sx={{ color: projectionColor(row.change) }}>
            {row.label} | Cambio: {projectionIcon(row.change)} {projectionSign(row.change)} kg | Peso estimado:{" "}
            {formatWeight(row.projectedWeight)} kg
          </Typography>
        ))}
      </CardContent>
    </Card>
  );
}
