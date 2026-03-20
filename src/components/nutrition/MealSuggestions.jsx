import React, { useMemo } from "react";
import {
  Box,
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
import { nutritionSurfaceSx } from "./nutritionUi";

export default function MealSuggestions({
  dailyCaloriesTarget,
  dailyCaloriesConsumed,
  recipes,
  foodCatalog,
  mealType,
  embedded = false,
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

  const content = (
    <Stack spacing={1.5}>
      <Typography variant={embedded ? "subtitle1" : "h6"}>{`Sugerencias para ${mealTypeLabel}`}</Typography>
      <Typography variant="body2">
        Calorías restantes: {Math.round(caloriesRemaining)} kcal
      </Typography>

      {suggestions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay comidas recomendadas para las calorías restantes.
        </Typography>
      ) : (
        <List dense disablePadding>
          {suggestions.slice(0, 5).map((item) => (
            <ListItem
              key={`${item.type}-${item.id}`}
              secondaryAction={
                <Chip
                  size="small"
                  label={item.type === "recipe" ? "Receta" : "Alimento"}
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
      <CardContent>{content}</CardContent>
    </Card>
  );
}
