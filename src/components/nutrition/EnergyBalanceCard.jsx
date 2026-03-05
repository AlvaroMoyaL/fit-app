import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";

function getBalanceLabel(balance) {
  if (balance < -300) return "Déficit calórico";
  if (balance > 200) return "Superávit calórico";
  return "Mantenimiento energético";
}

function formatSigned(value, decimals = 0) {
  const rounded = Number(value.toFixed(decimals));
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function getStatusColor(balance) {
  if (balance < -300) return "success.main";
  if (balance > 200) return "error.main";
  return "warning.main";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function EnergyBalanceCard({ caloriesConsumed, tdee }) {
  const consumed = Number(caloriesConsumed || 0);
  const estimatedTdee = Number(tdee || 0);
  const balance = consumed - estimatedTdee;
  const weeklyChange = (balance * 7) / 7700;
  const status = getBalanceLabel(balance);
  const statusColor = getStatusColor(balance);

  const maxEnergyScale = Math.max(1, estimatedTdee * 1.2);
  const consumedProgress = clamp((consumed / maxEnergyScale) * 100, 0, 100);
  const tdeeProgress = clamp((estimatedTdee / maxEnergyScale) * 100, 0, 100);

  // Rango visual de balance: -1000 kcal a +1000 kcal, centro = mantenimiento.
  const balanceProgress = clamp(((balance + 1000) / 2000) * 100, 0, 100);

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="h6">Balance energético</Typography>
          <Typography variant="body2">Calorías consumidas</Typography>
          <Typography variant="body1">{Math.round(consumed)} kcal</Typography>
          <Typography variant="body2">Gasto estimado</Typography>
          <Typography variant="body1">{Math.round(estimatedTdee)} kcal</Typography>
          <Box sx={{ display: "grid", gap: 0.6 }}>
            <Typography variant="caption" color="text.secondary">
              Consumo vs gasto
            </Typography>
            <LinearProgress variant="determinate" value={consumedProgress} />
            <LinearProgress
              variant="determinate"
              value={tdeeProgress}
              sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "text.secondary" } }}
            />
          </Box>
          <Typography variant="body2">Balance energético</Typography>
          <Typography variant="body1">{formatSigned(balance, 0)} kcal</Typography>
          <Box sx={{ display: "grid", gap: 0.6 }}>
            <Typography variant="caption" color="text.secondary">
              Gráfico de balance (déficit ← mantenimiento → superávit)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={balanceProgress}
              sx={{ "& .MuiLinearProgress-bar": { backgroundColor: statusColor } }}
            />
          </Box>
          <Typography variant="body2">Estado</Typography>
          <Typography variant="body1" sx={{ color: statusColor, fontWeight: 700 }}>
            {status}
          </Typography>
          <Typography variant="body2">Proyección semanal</Typography>
          <Typography variant="body1">{formatSigned(weeklyChange, 1)} kg / semana</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
