import { Box, Card, CardContent, Typography } from "@mui/material";

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

export default function EnergyBalanceCard({ caloriesConsumed, tdee }) {
  const consumed = Number(caloriesConsumed || 0);
  const estimatedTdee = Number(tdee || 0);
  const balance = consumed - estimatedTdee;
  const weeklyChange = (balance * 7) / 7700;
  const status = getBalanceLabel(balance);

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="h6">Balance energético</Typography>
          <Typography variant="body2">Calorías consumidas</Typography>
          <Typography variant="body1">{Math.round(consumed)} kcal</Typography>
          <Typography variant="body2">Gasto estimado</Typography>
          <Typography variant="body1">{Math.round(estimatedTdee)} kcal</Typography>
          <Typography variant="body2">Balance energético</Typography>
          <Typography variant="body1">{formatSigned(balance, 0)} kcal</Typography>
          <Typography variant="body2">Estado</Typography>
          <Typography variant="body1">{status}</Typography>
          <Typography variant="body2">Proyección semanal</Typography>
          <Typography variant="body1">{formatSigned(weeklyChange, 1)} kg / semana</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
