import React, { useMemo } from "react";
import { Card, CardContent, Typography, Grid, Box } from "@mui/material";
import { generateDailyMealPlan } from "../../utils/mealPlanner";

function mealTypeLabel(type) {
  if (type === "breakfast") return "Desayuno";
  if (type === "lunch") return "Almuerzo";
  if (type === "dinner") return "Cena";
  if (type === "snack") return "Snack";
  return type;
}

export default function DailyMealPlan({ dailyCaloriesTarget, recipes, foodCatalog }) {
  const mealPlan = useMemo(() => {
    return generateDailyMealPlan(dailyCaloriesTarget, recipes, foodCatalog);
  }, [dailyCaloriesTarget, recipes, foodCatalog]);

  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1.5 }}>
        <Typography variant="h6">Menú sugerido para hoy</Typography>
        <Grid container spacing={1.5}>
          {mealTypes.map((mealType) => {
            const meal = mealPlan?.[mealType] || null;
            return (
              <Grid item xs={12} md={6} key={mealType}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: 1.25,
                    height: "100%",
                    display: "grid",
                    gap: 0.4,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {mealTypeLabel(mealType)}
                  </Typography>
                  {meal ? (
                    <>
                      <Typography variant="body2">{meal.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(Number(meal.calories || 0))} kcal
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin sugerencia disponible
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
}
