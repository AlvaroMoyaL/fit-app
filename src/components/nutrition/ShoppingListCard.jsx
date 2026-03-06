import React, { useMemo } from "react";
import { Card, CardContent, Typography, List, ListItem, ListItemText } from "@mui/material";
import { generateWeeklyMealPlan, generateShoppingList } from "../../utils/mealPlanner";

export default function ShoppingListCard({ dailyCaloriesTarget, recipes, foodCatalog }) {
  const weeklyPlan = useMemo(
    () => generateWeeklyMealPlan(dailyCaloriesTarget, recipes, foodCatalog),
    [dailyCaloriesTarget, recipes, foodCatalog]
  );

  const shoppingList = useMemo(
    () => generateShoppingList(weeklyPlan, recipes, foodCatalog),
    [weeklyPlan, recipes, foodCatalog]
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Lista de compras semanal
        </Typography>
        {shoppingList.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Sin ingredientes sugeridos para esta semana.
          </Typography>
        ) : (
          <List dense>
            {shoppingList.map((item) => (
              <ListItem key={item.id} disableGutters>
                <ListItemText
                  primary={item.name}
                  secondary={`${item.quantity} ${item.unit}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
