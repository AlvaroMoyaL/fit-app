import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { parseFoodText } from "../../utils/foodParser";
import { recipes as baseRecipes } from "../../data/recipes";
import { foodCatalog as baseFoodCatalog } from "../../data/foodCatalog";

export default function QuickFoodInput({
  onAddFoods,
  recipes = baseRecipes,
  foodCatalog = baseFoodCatalog,
}) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  const onSubmit = () => {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      setNote("Escribe al menos una línea.");
      return;
    }

    const foodsToAdd = [];
    lines.forEach((line) => {
      const parsed = parseFoodText(line, recipes, foodCatalog);
      if (Array.isArray(parsed) && parsed.length) {
        foodsToAdd.push(...parsed);
      }
    });

    if (!foodsToAdd.length) {
      setNote("Ninguna línea fue reconocida.");
      return;
    }

    if (typeof onAddFoods === "function") {
      onAddFoods(foodsToAdd);
    }
    setText("");
    setNote("");
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5, p: 1.5, border: "1px solid", borderColor: "divider" }}>
      <Typography variant="subtitle1">Registro rápido de comidas</Typography>
      <TextField
        multiline
        minRows={4}
        label="Comidas por línea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={"Ejemplo:\n2 huevos\npan\ncompleto\nplatano"}
        fullWidth
      />
      <Box>
        <Button type="button" variant="contained" onClick={onSubmit}>
          Agregar
        </Button>
      </Box>
      {note && (
        <Typography variant="body2" color="warning.main">
          {note}
        </Typography>
      )}
    </Box>
  );
}
