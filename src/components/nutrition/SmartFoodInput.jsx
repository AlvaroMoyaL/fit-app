import { startTransition, useEffect, useMemo, useState } from "react";
import { parseSmartMeal } from "../../utils/smartMealParser";
import { getTopFrequentMeals, saveFrequentMeal } from "../../utils/frequentMeals";
import { foodCatalog } from "../../data/foodCatalog";
import {
  loadWorkFoodInventory,
  saveWorkFoodInventory,
} from "../../utils/workFoodInventoryStorage";
import {
  buildInventoryRequirementsFromMeal,
  consumeInventoryForShoppingList,
} from "../../utils/workFoodInventoryPlanning";

import { Box, TextField, Button, Typography, Paper, Chip, Stack } from "@mui/material";

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
  const [suggestions, setSuggestions] = useState(() => (profileId ? getTopFrequentMeals(profileId) : []));
  const [inventoryState, setInventoryState] = useState(() => loadWorkFoodInventory(profileId));
  const [inventoryFeedback, setInventoryFeedback] = useState("");

  useEffect(() => {
    startTransition(() => {
      setSuggestions(profileId ? getTopFrequentMeals(profileId) : []);
      setInventoryState(loadWorkFoodInventory(profileId));
      setInventoryFeedback("");
    });
  }, [profileId]);

  const inventoryRequirements = useMemo(
    () => buildInventoryRequirementsFromMeal(previewMeal, foodCatalog),
    [previewMeal]
  );
  const inventoryCoverage = useMemo(
    () => consumeInventoryForShoppingList(inventoryRequirements, inventoryState.items),
    [inventoryRequirements, inventoryState.items]
  );
  const canRegisterWithInventory =
    Boolean(profileId) &&
    inventoryRequirements.length > 0 &&
    inventoryCoverage.summary.totalMissingQuantity === 0;

  const handleInterpret = () => {
    const meal = parseSmartMeal(inputText);
    setPreviewMeal(meal);
    setInventoryFeedback("");
  };

  const handleRegister = ({ consumeInventory = false } = {}) => {
    if (!previewMeal || typeof onMealParsed !== "function") return;

    if (consumeInventory) {
      if (!canRegisterWithInventory) {
        const missing = Math.max(0, Number(inventoryCoverage.summary.totalMissingQuantity || 0));
        setInventoryFeedback(
          missing > 0
            ? `Faltan ${missing} unidades para descontar esta comida desde inventario.`
            : "No hay inventario suficiente para descontar esta comida."
        );
        return;
      }

      const nextInventory = saveWorkFoodInventory(profileId, {
        items: inventoryCoverage.inventoryItems,
      }, {
        movements: (Array.isArray(inventoryCoverage.items) ? inventoryCoverage.items : []).flatMap((item) =>
          (Array.isArray(item?.consumedFrom) ? item.consumedFrom : []).map((entry) => ({
            type: "consume",
            source: "registro_inteligente",
            detail: "Descuento desde registro inteligente",
            name: entry.name || item.id,
            location: entry.location,
            quantity: entry.quantity,
            unit: entry.unit || item.unit || "unidad",
          }))
        ),
      });
      setInventoryState(nextInventory);
      setInventoryFeedback("Comida registrada y stock descontado del inventario.");
    } else {
      setInventoryFeedback("");
    }

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
    <Paper sx={{ p: 2.5, width: "100%", boxSizing: "border-box" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Registro inteligente de comidas</Typography>

        {inventoryFeedback ? (
          <Typography variant="body2" color="text.secondary">
            {inventoryFeedback}
          </Typography>
        ) : null}

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

            {profileId && previewMeal.foods.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gap: 0.8,
                  p: 1,
                  borderRadius: 1.7,
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Inventario de trabajo
                </Typography>
                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                  <Chip
                    size="small"
                    color={canRegisterWithInventory ? "success" : "warning"}
                    variant="outlined"
                    label={
                      canRegisterWithInventory
                        ? "Se puede descontar del inventario"
                        : `Faltan ${inventoryCoverage.summary.totalMissingQuantity || 0}`
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${inventoryCoverage.summary.totalConsumedQuantity || 0} cubiertos`}
                  />
                </Stack>
                {inventoryRequirements.length > 0 ? (
                  <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                    {inventoryCoverage.items.map((item) => (
                      <Typography component="li" variant="body2" key={`inventory-${item.id}`}>
                        {item.id} · {item.requiredQuantity} {item.unit}
                        {item.consumedFrom.length
                          ? ` · sale de ${item.consumedFrom
                              .map((entry) => `${entry.quantity} en ${entry.location}`)
                              .join(", ")}`
                          : ""}
                        {item.missingAfterConsumption > 0
                          ? ` · faltan ${item.missingAfterConsumption}`
                          : ""}
                      </Typography>
                    ))}
                  </Box>
                ) : null}
                {inventoryFeedback ? (
                  <Typography variant="body2" color="text.secondary">
                    {inventoryFeedback}
                  </Typography>
                ) : null}
              </Box>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                onClick={() => handleRegister()}
                disabled={previewMeal.foods.length === 0}
              >
                Registrar comida
              </Button>
              {profileId ? (
                <Button
                  variant="contained"
                  onClick={() => handleRegister({ consumeInventory: true })}
                  disabled={previewMeal.foods.length === 0 || !canRegisterWithInventory}
                >
                  Registrar y descontar stock
                </Button>
              ) : null}
            </Stack>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
