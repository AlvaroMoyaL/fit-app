import { Box, Paper, Typography, Grid } from "@mui/material";

function DashboardCard({ title, value }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );
}

export default function NutritionDashboard({
  dailyCalories = 0,
  targetCalories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
  nutritionScore = 0,
}) {
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Calorías hoy"
            value={`${Math.round(Number(dailyCalories || 0))} / ${Math.round(
              Number(targetCalories || 0)
            )}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard title="Proteína" value={`${Math.round(Number(protein || 0))} g`} />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard title="Carbohidratos" value={`${Math.round(Number(carbs || 0))} g`} />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard title="Grasa" value={`${Math.round(Number(fat || 0))} g`} />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Nutrition Score"
            value={`${Math.round(Number(nutritionScore || 0))} / 100`}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
