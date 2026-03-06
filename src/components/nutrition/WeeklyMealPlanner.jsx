import React, { useMemo } from "react";
import { Card, CardContent, Typography, Grid, Box, Divider } from "@mui/material";
import { generateWeeklyMealPlan } from "../../utils/mealPlanner";

function mealLabel(type) {
  if (type === "breakfast") return "Breakfast";
  if (type === "lunch") return "Lunch";
  if (type === "dinner") return "Dinner";
  if (type === "snack") return "Snack";
  return type;
}

function renderMealValue(meal) {
  if (!meal) return "Sin sugerencia";
  return `${meal.name} — ${Math.round(Number(meal.calories || 0))} kcal`;
}

export default function WeeklyMealPlanner({ dailyCaloriesTarget, recipes, foodCatalog }) {
  const weeklyPlan = useMemo(() => {
    return generateWeeklyMealPlan(dailyCaloriesTarget, recipes, foodCatalog);
  }, [dailyCaloriesTarget, recipes, foodCatalog]);
  const safeWeeklyPlan = Array.isArray(weeklyPlan) ? weeklyPlan : [];

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.5 }}>
        <Typography variant="h6">Plan nutricional semanal</Typography>
        <Grid container spacing={1.5}>
          {safeWeeklyPlan.map((dayPlan, index) => {
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={`${dayPlan?.day || "day"}-${index}`}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: 1.25,
                    display: "grid",
                    gap: 0.9,
                    height: "100%",
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {dayPlan?.day || "Day"}
                  </Typography>
                  <Divider />

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {mealLabel("breakfast")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {renderMealValue(dayPlan.breakfast)}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {mealLabel("lunch")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {renderMealValue(dayPlan.lunch)}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {mealLabel("dinner")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {renderMealValue(dayPlan.dinner)}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {mealLabel("snack")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {renderMealValue(dayPlan.snack)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
}
