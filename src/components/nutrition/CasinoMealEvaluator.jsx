import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import { evaluateCasinoMeal } from "../../utils/casinoMealEvaluator";

export default function CasinoMealEvaluator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const handleEvaluate = () => {
    const foods = input
      .split(/[\n,]+/)
      .map((food) => food.trim().toLowerCase())
      .filter(Boolean);

    if (!foods.length) {
      setResult(null);
      return;
    }

    const evaluation = evaluateCasinoMeal(foods);
    setResult(evaluation);
  };

  const satietyLabel =
    result?.satietyLevel === "high"
      ? "Alta"
      : result?.satietyLevel === "medium"
      ? "Media"
      : result?.satietyLevel === "low"
      ? "Baja"
      : "Sin datos";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Evaluador de comida de casino</Typography>

          <TextField
            multiline
            minRows={4}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ejemplo:\nrice\nchicken\nsalad`}
            fullWidth
          />

          <Box>
            <Button variant="contained" onClick={handleEvaluate}>
              Evaluar comida
            </Button>
          </Box>

          {result && (
            <Stack spacing={1.2}>
              <Divider />
              <Typography variant="body1">
                Calorías: {Math.round(Number(result.calories || 0))} kcal
              </Typography>
              <Typography variant="body1">
                Proteína: {Math.round(Number(result.protein || 0))} g
              </Typography>
              <Typography variant="body1">
                Carbohidratos: {Math.round(Number(result.carbs || 0))} g
              </Typography>
              <Typography variant="body1">
                Grasas: {Math.round(Number(result.fat || 0))} g
              </Typography>

              <Divider />
              <Typography variant="body1">
                Saciedad: {satietyLabel} (índice: {Number(result.satietyScore || 0).toFixed(1)})
              </Typography>

              <Divider />
              <Typography variant="body1">Evaluación: {result.evaluation}</Typography>
              <Typography variant="body2">Recomendación: {result.recommendation}</Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
