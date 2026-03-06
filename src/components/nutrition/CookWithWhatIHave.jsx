import { useState } from "react";
import { generateMealsFromIngredients } from "../../utils/ingredientMealGenerator";

import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

export default function CookWithWhatIHave() {
  const [ingredientsText, setIngredientsText] = useState("");
  const [result, setResult] = useState(null);

  const handleSuggestMeals = () => {
    const meals = generateMealsFromIngredients(ingredientsText);
    setResult(meals);
  };

  const cookNow = result?.cookNow || [];
  const cookAlmost = result?.cookAlmost || [];
  const hasNoResults = result && cookNow.length === 0 && cookAlmost.length === 0;

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Cocina con lo que tienes</Typography>

        <TextField
          label="Ingredientes disponibles"
          placeholder="huevo pan palta tomate"
          fullWidth
          value={ingredientsText}
          onChange={(event) => setIngredientsText(event.target.value)}
        />

        <Button variant="contained" onClick={handleSuggestMeals} disabled={!ingredientsText.trim()}>
          Sugerir comidas
        </Button>

        {result && (
          <>
            {hasNoResults && (
              <Typography variant="body2" color="text.secondary">
                No se encontraron recetas con esos ingredientes
              </Typography>
            )}

            {!hasNoResults && (
              <>
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Puedes cocinar ahora
                  </Typography>
                  {cookNow.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Aun no hay recetas completas con esos ingredientes.
                    </Typography>
                  ) : (
                    <List dense>
                      {cookNow.map((meal) => (
                        <ListItem key={`cook-now-${meal.recipeId}`} disablePadding>
                          <ListItemText primary={meal.name} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Casi puedes cocinar
                  </Typography>
                  {cookAlmost.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay recetas cercanas por ahora.
                    </Typography>
                  ) : (
                    <List dense>
                      {cookAlmost.map((meal) => (
                        <ListItem key={`cook-almost-${meal.recipeId}`} alignItems="flex-start" disablePadding>
                          <ListItemText
                            primary={meal.name}
                            secondary={
                              meal.missingIngredients?.length
                                ? `Falta: ${meal.missingIngredients.join(", ")}`
                                : "Sin ingredientes faltantes"
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}
