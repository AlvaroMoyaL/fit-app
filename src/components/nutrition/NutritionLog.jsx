import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { addMeal } from "../../utils/nutritionStorage";
import { getMealsForDate } from "../../utils/nutritionUtils";
import { foods } from "../../data/foods";
import { getCustomFoods, saveCustomFood } from "../../utils/customFoodsStorage";

const DEFAULT_FORM = {
  mealType: "desayuno",
  food: null,
  quantity: "1",
};
const DEFAULT_CUSTOM_FOOD_FORM = {
  name: "",
  category: "processed",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};
const FOOD_CATEGORIES = [
  "carbs",
  "protein",
  "fruit",
  "vegetable",
  "dairy",
  "fat",
  "processed",
  "traditional",
];

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mealTypeLabel(type) {
  if (type === "desayuno") return "Desayuno";
  if (type === "almuerzo") return "Almuerzo";
  if (type === "cena") return "Cena";
  if (type === "snack") return "Snack";
  return type;
}

export default function NutritionLog({ profileId, meals, onMealsChange }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [customFoods, setCustomFoods] = useState([]);
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState(DEFAULT_CUSTOM_FOOD_FORM);
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const foodOptions = useMemo(() => [...foods, ...customFoods], [customFoods]);

  useEffect(() => {
    if (!profileId) {
      setCustomFoods([]);
      return;
    }
    setCustomFoods(getCustomFoods(profileId));
  }, [profileId]);

  const onChangeMealType = (event) => {
    setFormData((prev) => ({ ...prev, mealType: event.target.value }));
  };

  const onChangeQuantity = (event) => {
    setFormData((prev) => ({ ...prev, quantity: event.target.value }));
  };

  const onChangeFood = (_, value) => {
    setFormData((prev) => ({ ...prev, food: value }));
  };
  const onChangeCustomFoodField = (field) => (event) => {
    setCustomFoodForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const scaleNutrient = (base, quantity) => Number((Number(base || 0) * quantity).toFixed(2));
  const quantityNumber = Number(formData.quantity || 0);
  const preview = useMemo(() => {
    if (!formData.food || !Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      return null;
    }
    return {
      calories: scaleNutrient(formData.food.calories, quantityNumber),
      protein: scaleNutrient(formData.food.protein, quantityNumber),
      carbs: scaleNutrient(formData.food.carbs, quantityNumber),
      fat: scaleNutrient(formData.food.fat, quantityNumber),
    };
  }, [formData.food, quantityNumber]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!profileId) return;
    if (!formData.food) return;

    const quantity = Number(formData.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const meal = {
      id: String(Date.now()),
      date: getTodayDateKey(),
      mealType: formData.mealType,
      name: formData.food.name,
      quantity,
      calories: scaleNutrient(formData.food.calories, quantity),
      protein: scaleNutrient(formData.food.protein, quantity),
      carbs: scaleNutrient(formData.food.carbs, quantity),
      fat: scaleNutrient(formData.food.fat, quantity),
    };

    addMeal(profileId, meal);
    if (typeof onMealsChange === "function") {
      onMealsChange([...(Array.isArray(meals) ? meals : []), meal]);
    }
    setFormData(DEFAULT_FORM);
  };

  const onSaveCustomFood = () => {
    if (!profileId) return;
    const name = customFoodForm.name.trim();
    if (!name) return;

    const customFood = {
      name,
      category: customFoodForm.category,
      calories: Number(customFoodForm.calories || 0),
      protein: Number(customFoodForm.protein || 0),
      carbs: Number(customFoodForm.carbs || 0),
      fat: Number(customFoodForm.fat || 0),
    };

    const nextCustomFoods = saveCustomFood(profileId, customFood);
    setCustomFoods(nextCustomFoods);
    setFormData((prev) => ({ ...prev, food: customFood }));
    setCustomFoodForm(DEFAULT_CUSTOM_FOOD_FORM);
    setShowCustomFoodForm(false);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="h6">Registro de comidas</Typography>
      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="meal-type-label">Tipo de comida</InputLabel>
          <Select
            labelId="meal-type-label"
            label="Tipo de comida"
            value={formData.mealType}
            onChange={onChangeMealType}
          >
            <MenuItem value="desayuno">Desayuno</MenuItem>
            <MenuItem value="almuerzo">Almuerzo</MenuItem>
            <MenuItem value="cena">Cena</MenuItem>
            <MenuItem value="snack">Snack</MenuItem>
          </Select>
        </FormControl>

        <Autocomplete
          options={foodOptions}
          value={formData.food}
          onChange={onChangeFood}
          getOptionLabel={(option) => option?.name || ""}
          isOptionEqualToValue={(option, value) =>
            option?.name === value?.name && option?.category === value?.category
          }
          renderOption={(props, option) => (
            <li {...props} key={`${option.name}-${option.category}`}>
              {option.name} ({option.category})
            </li>
          )}
          renderInput={(params) => <TextField {...params} label="Alimento" fullWidth />}
        />

        <Box>
          <Button
            type="button"
            variant="text"
            onClick={() => setShowCustomFoodForm((prev) => !prev)}
            disabled={!profileId}
          >
            + Crear alimento
          </Button>
        </Box>

        {showCustomFoodForm && (
          <Box sx={{ display: "grid", gap: 1.5, p: 1.5, border: "1px solid", borderColor: "divider" }}>
            <TextField
              label="Nombre"
              value={customFoodForm.name}
              onChange={onChangeCustomFoodField("name")}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="custom-food-category-label">Categoria</InputLabel>
              <Select
                labelId="custom-food-category-label"
                label="Categoria"
                value={customFoodForm.category}
                onChange={onChangeCustomFoodField("category")}
              >
                {FOOD_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Calorias"
                value={customFoodForm.calories}
                onChange={onChangeCustomFoodField("calories")}
                fullWidth
              />
              <TextField
                type="number"
                label="Proteina"
                value={customFoodForm.protein}
                onChange={onChangeCustomFoodField("protein")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="number"
                label="Carbohidratos"
                value={customFoodForm.carbs}
                onChange={onChangeCustomFoodField("carbs")}
                fullWidth
              />
              <TextField
                type="number"
                label="Grasas"
                value={customFoodForm.fat}
                onChange={onChangeCustomFoodField("fat")}
                fullWidth
              />
            </Stack>
            <Box>
              <Button type="button" variant="outlined" onClick={onSaveCustomFood}>
                Guardar alimento personalizado
              </Button>
            </Box>
          </Box>
        )}

        <TextField
          type="number"
          label="Cantidad"
          value={formData.quantity}
          onChange={onChangeQuantity}
          inputProps={{ min: 0, step: 0.1 }}
          fullWidth
        />

        {preview && (
          <Box sx={{ display: "grid", gap: 0.5 }}>
            <Typography variant="body2">Calorías: {preview.calories} kcal</Typography>
            <Typography variant="body2">Proteína: {preview.protein} g</Typography>
            <Typography variant="body2">Carbohidratos: {preview.carbs} g</Typography>
            <Typography variant="body2">Grasas: {preview.fat} g</Typography>
          </Box>
        )}

        <Box>
          <Button type="submit" variant="contained" disabled={!profileId || !formData.food}>
            Agregar comida
          </Button>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Comidas de hoy
        </Typography>
        {mealsToday.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Sin comidas registradas hoy.
          </Typography>
        ) : (
          <List dense>
            {mealsToday.map((meal) => (
              <ListItem key={meal.id} disableGutters>
                <ListItemText
                  primary={`${mealTypeLabel(meal.mealType)} — ${meal.name}`}
                  secondary={`Cantidad: ${meal.quantity ?? 1}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
