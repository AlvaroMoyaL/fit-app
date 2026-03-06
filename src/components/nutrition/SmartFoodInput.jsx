import { useEffect, useState } from "react";
import { parseSmartMeal } from "../../utils/smartMealParser";
import { getTopFrequentMeals, saveFrequentMeal } from "../../utils/frequentMeals";

import { Box, TextField, Button, Typography, Paper } from "@mui/material";

function formatMealTypeLabel(mealType) {
  const labels = {
    breakfast: "Desayuno",
    lunch: "Almuerzo",
    dinner: "Cena",
    snack: "Snack",
    default: "Sin tipo detectado",
  };

  return labels[mealType] || labels.default;
}

export default function SmartFoodInput({ onMealParsed, profileId }) {
  const [inputText, setInputText] = useState("");
  const [previewMeal, setPreviewMeal] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!profileId) {
      setSuggestions([]);
      return;
    }
    setSuggestions(getTopFrequentMeals(profileId));
  }, [profileId]);

  const handleInterpret = () => {
    const meal = parseSmartMeal(inputText);
    setPreviewMeal(meal);
  };

  const handleRegister = () => {
    if (!previewMeal || typeof onMealParsed !== "function") return;
    const textToSave = inputText.trim();
    if (profileId && textToSave) {
      saveFrequentMeal(profileId, textToSave);
      setSuggestions(getTopFrequentMeals(profileId));
    }
    onMealParsed(previewMeal);
    setInputText("");
    setPreviewMeal(null);
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Registro inteligente de comidas</Typography>

        {suggestions.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Sugerencias rapidas
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {suggestions.map((item) => (
                <Button
                  key={item.text}
                  size="small"
                  variant="outlined"
                  onClick={() => setInputText(item.text)}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        <TextField
          label="Registrar comida"
          placeholder={'Ejemplo:\n"pan con palta y huevo"\n"arroz con pollo"\n"desayuno: yogurt con fruta"'}
          multiline
          minRows={3}
          fullWidth
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
        />

        <Button variant="contained" onClick={handleInterpret} disabled={!inputText.trim()}>
          Interpretar comida
        </Button>

        {previewMeal && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle1">
              Tipo de comida: {formatMealTypeLabel(previewMeal.mealType)}
            </Typography>

            {previewMeal.foods.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No se detectaron alimentos del catálogo
              </Typography>
            ) : (
              <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                {previewMeal.foods.map((food) => (
                  <Typography component="li" variant="body2" key={`${food.foodId}-${food.grams}`}>
                    {food.foodId} - {food.grams} g
                  </Typography>
                ))}
              </Box>
            )}

            <Button
              variant="outlined"
              onClick={handleRegister}
              disabled={previewMeal.foods.length === 0}
            >
              Registrar comida
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
