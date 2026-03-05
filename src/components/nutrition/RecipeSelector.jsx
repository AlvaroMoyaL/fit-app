import { Box, Divider, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { recipes as baseRecipes } from "../../data/recipes";
import { foodCatalog } from "../../data/foodCatalog";
import { calculateRecipeMacros, expandRecipe } from "../../utils/recipes";

export default function RecipeSelector({ onAddFoods, recipes = baseRecipes, catalog = foodCatalog }) {
  const handleSelectRecipe = (recipe) => {
    const ingredients = expandRecipe(recipe);
    if (typeof onAddFoods === "function") {
      onAddFoods(ingredients);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="h6">Recetas rápidas</Typography>
      <List disablePadding>
        {recipes.map((recipe, index) => {
          const macros = calculateRecipeMacros(recipe, catalog);
          return (
            <Box key={recipe.id}>
              <ListItemButton onClick={() => handleSelectRecipe(recipe)}>
                <ListItemText
                  primary={recipe.name}
                  secondary={`~ ${Math.round(macros.calories)} kcal`}
                />
              </ListItemButton>
              {index < recipes.length - 1 && <Divider component="li" />}
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
