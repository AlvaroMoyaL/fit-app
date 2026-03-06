import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
} from "@mui/material";
import { getMealSuggestions } from "../../utils/mealSuggestions";

export default function MealSuggestions({
  dailyCaloriesTarget,
  dailyCaloriesConsumed,
  recipes,
  foodCatalog,
  mealType,
}) {
  const target = Number(dailyCaloriesTarget || 0);
  const consumed = Number(dailyCaloriesConsumed || 0);
  const caloriesRemaining = Math.max(0, target - consumed);

  const mealTypeLabel = useMemo(() => {
    if (mealType === "breakfast") return "desayuno";
    if (mealType === "lunch") return "almuerzo";
    if (mealType === "dinner") return "cena";
    if (mealType === "snack") return "snack";
    return "hoy";
  }, [mealType]);

  const suggestions = useMemo(() => {
    return getMealSuggestions(caloriesRemaining, recipes, foodCatalog, mealType);
  }, [caloriesRemaining, recipes, foodCatalog, mealType]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">{`Sugerencias para ${mealTypeLabel}`}</Typography>
          <Typography variant="body2">
            Calorías restantes: {Math.round(caloriesRemaining)} kcal
          </Typography>

          {suggestions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay comidas recomendadas para las calorías restantes.
            </Typography>
          ) : (
            <List dense>
              {suggestions.slice(0, 5).map((item) => (
                <ListItem
                  key={`${item.type}-${item.id}`}
                  secondaryAction={
                    <Chip
                      size="small"
                      label={item.type === "recipe" ? "Recipe" : "Food"}
                      color={item.type === "recipe" ? "primary" : "default"}
                    />
                  }
                >
                  <ListItemText
                    primary={`${item.name} — ${Math.round(Number(item.calories || 0))} kcal`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
