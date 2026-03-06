import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { addMeal, deleteMeal, saveMeals } from "../../utils/nutritionStorage";
import { getMealsForDate } from "../../utils/nutritionUtils";
import { foodCatalog } from "../../data/foodCatalog";
import { recipes } from "../../data/recipes";
import { getCustomFoods, saveCustomFood } from "../../utils/customFoodsStorage";
import { getCustomRecipes, saveCustomRecipe } from "../../utils/customRecipesStorage";
import RecipeSelector from "./RecipeSelector";
import QuickFoodInput from "./QuickFoodInput";

const DEFAULT_FORM = {
  mealType: "desayuno",
  beverageType: "agua",
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
const DEFAULT_RECIPE_FORM = {
  name: "",
  ingredients: [{ food: null, grams: "100" }],
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
const MEAL_TYPE_ORDER = ["desayuno", "almuerzo", "cena", "snack", "bebida"];
const BEVERAGE_TYPES = ["agua", "cafe_te", "sin_calorias", "calorica", "alcohol"];

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
  if (type === "bebida") return "Bebida";
  return type;
}

function beverageTypeLabel(type) {
  if (type === "agua") return "Agua";
  if (type === "cafe_te") return "Café / Té";
  if (type === "sin_calorias") return "Sin calorías";
  if (type === "calorica") return "Calórica";
  if (type === "alcohol") return "Alcohol";
  return type || "";
}

function getMealContributionValues(meal) {
  return {
    calories: Math.round(Number(meal?.calories || 0)),
    protein: Number(Number(meal?.protein || 0).toFixed(1)),
    carbs: Number(Number(meal?.carbs || 0).toFixed(1)),
    fat: Number(Number(meal?.fat || 0).toFixed(1)),
  };
}

export default function NutritionLog({ profileId, meals, onMealsChange }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [customFoods, setCustomFoods] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState(DEFAULT_CUSTOM_FOOD_FORM);
  const [showCustomRecipeForm, setShowCustomRecipeForm] = useState(false);
  const [customRecipeForm, setCustomRecipeForm] = useState(DEFAULT_RECIPE_FORM);
  const [editingMealId, setEditingMealId] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const mealsTodayByType = useMemo(() => {
    const grouped = new Map();
    mealsToday.forEach((meal) => {
      const key = meal?.mealType || "snack";
      const current = grouped.get(key) || [];
      grouped.set(key, [...current, meal]);
    });
    return MEAL_TYPE_ORDER.map((type) => ({
      type,
      label: mealTypeLabel(type),
      items: grouped.get(type) || [],
    })).filter((block) => block.items.length > 0);
  }, [mealsToday]);
  const foodOptions = useMemo(() => [...foodCatalog, ...customFoods], [customFoods]);
  const recipeOptions = useMemo(() => [...recipes, ...customRecipes], [customRecipes]);

  useEffect(() => {
    if (!profileId) {
      setCustomFoods([]);
      setCustomRecipes([]);
      return;
    }
    setCustomFoods(getCustomFoods(profileId));
    setCustomRecipes(getCustomRecipes(profileId));
  }, [profileId]);

  const onChangeMealType = (event) => {
    const nextMealType = event.target.value;
    setFormData((prev) => ({
      ...prev,
      mealType: nextMealType,
      quantity: nextMealType === "bebida" ? "200" : "1",
    }));
  };

  const onChangeBeverageType = (event) => {
    setFormData((prev) => ({ ...prev, beverageType: event.target.value }));
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
    const ratio = formData.mealType === "bebida" ? quantityNumber / 100 : quantityNumber;
    return {
      calories: scaleNutrient(formData.food.calories, ratio),
      protein: scaleNutrient(formData.food.protein, ratio),
      carbs: scaleNutrient(formData.food.carbs, ratio),
      fat: scaleNutrient(formData.food.fat, ratio),
    };
  }, [formData.food, formData.mealType, quantityNumber]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!profileId) return;
    if (!formData.food) return;

    const quantity = Number(formData.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const ratio = formData.mealType === "bebida" ? quantity / 100 : quantity;
    const unit = formData.mealType === "bebida" ? "ml" : "x100g";

    const meal = {
      id: String(Date.now()),
      date: getTodayDateKey(),
      mealType: formData.mealType,
      beverageType: formData.mealType === "bebida" ? formData.beverageType : "",
      name: formData.food.name,
      quantity,
      unit,
      calories: scaleNutrient(formData.food.calories, ratio),
      protein: scaleNutrient(formData.food.protein, ratio),
      carbs: scaleNutrient(formData.food.carbs, ratio),
      fat: scaleNutrient(formData.food.fat, ratio),
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

  const onChangeCustomRecipeName = (event) => {
    const value = event.target.value;
    setCustomRecipeForm((prev) => ({ ...prev, name: value }));
  };

  const onAddRecipeIngredient = () => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { food: null, grams: "100" }],
    }));
  };

  const onRemoveRecipeIngredient = (index) => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index),
    }));
  };

  const onChangeRecipeIngredientFood = (index, food) => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, idx) =>
        idx === index ? { ...item, food } : item
      ),
    }));
  };

  const onChangeRecipeIngredientGrams = (index, grams) => {
    setCustomRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, idx) =>
        idx === index ? { ...item, grams } : item
      ),
    }));
  };

  const normalizeId = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  const getFoodId = (food) => normalizeId(food?.id || food?.name);

  const foodIndex = useMemo(() => {
    const index = new Map();
    foodOptions.forEach((food) => {
      if (!food) return;
      const idKey = normalizeId(food.id);
      const nameKey = normalizeId(food.name);
      if (idKey) index.set(idKey, food);
      if (nameKey) index.set(nameKey, food);
    });
    return index;
  }, [foodOptions]);

  const addFoodsToLog = (items) => {
    if (!profileId) return;
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return;

    const createdMeals = [];
    const baseId = Date.now();

    safeItems.forEach((item, index) => {
      const food = foodIndex.get(normalizeId(item?.foodId));
      const grams = Number(item?.grams || 0);
      if (!food || grams <= 0) return;

      const ratio = grams / 100;
      const meal = {
        id: `${baseId}-${index}`,
        date: getTodayDateKey(),
        mealType: formData.mealType,
        beverageType: formData.mealType === "bebida" ? formData.beverageType : "",
        name: food.name,
        quantity: Number((formData.mealType === "bebida" ? grams : ratio).toFixed(2)),
        unit: formData.mealType === "bebida" ? "ml" : "x100g",
        grams: Number(grams.toFixed(2)),
        calories: scaleNutrient(food.calories, ratio),
        protein: scaleNutrient(food.protein, ratio),
        carbs: scaleNutrient(food.carbs, ratio),
        fat: scaleNutrient(food.fat, ratio),
      };
      addMeal(profileId, meal);
      createdMeals.push(meal);
    });

    if (!createdMeals.length) return;
    if (typeof onMealsChange === "function") {
      onMealsChange([...(Array.isArray(meals) ? meals : []), ...createdMeals]);
    }
  };

  const onQuickAddFoods = (items) => {
    if (!Array.isArray(items) || !items.length) return;
    addFoodsToLog(items);
  };

  const startEditMeal = (meal) => {
    setEditingMealId(String(meal?.id || ""));
    setEditingQuantity(String(meal?.quantity ?? 1));
  };

  const cancelEditMeal = () => {
    setEditingMealId("");
    setEditingQuantity("");
  };

  const onSaveMealEdit = (meal) => {
    if (!profileId || !meal?.id) return;
    const nextQuantity = Number(editingQuantity || 0);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return;

    const prevQuantity = Number(meal.quantity || 1);
    const factor = prevQuantity > 0 ? nextQuantity / prevQuantity : 1;
    const round2 = (value) => Number((Number(value || 0) * factor).toFixed(2));

    const nextMeals = (Array.isArray(meals) ? meals : []).map((item) => {
      if (String(item?.id) !== String(meal.id)) return item;
      const nextGrams = item?.grams ? Number((Number(item.grams) * factor).toFixed(2)) : item?.grams;
      return {
        ...item,
        quantity: Number(nextQuantity.toFixed(2)),
        grams: nextGrams,
        calories: round2(item.calories),
        protein: round2(item.protein),
        carbs: round2(item.carbs),
        fat: round2(item.fat),
      };
    });

    saveMeals(profileId, nextMeals);
    if (typeof onMealsChange === "function") onMealsChange(nextMeals);
    cancelEditMeal();
  };

  const onDeleteMeal = (mealId) => {
    if (!profileId || !mealId) return;
    const nextMeals = deleteMeal(profileId, mealId);
    if (typeof onMealsChange === "function") onMealsChange(nextMeals);
    if (String(editingMealId) === String(mealId)) cancelEditMeal();
  };

  const onSaveCustomRecipe = () => {
    if (!profileId) return;
    const name = customRecipeForm.name.trim();
    if (!name) return;

    const ingredients = customRecipeForm.ingredients
      .map((item) => {
        const grams = Number(item?.grams || 0);
        if (!item?.food || grams <= 0) return null;
        return { foodId: getFoodId(item.food), grams };
      })
      .filter(Boolean);

    if (!ingredients.length) return;

    const recipe = {
      id: `custom_${normalizeId(name)}`,
      name,
      ingredients,
    };

    const nextRecipes = saveCustomRecipe(profileId, recipe);
    setCustomRecipes(nextRecipes);
    setCustomRecipeForm(DEFAULT_RECIPE_FORM);
    setShowCustomRecipeForm(false);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="h6">Registro de comidas</Typography>
      <RecipeSelector onAddFoods={addFoodsToLog} recipes={recipeOptions} catalog={foodOptions} />
      <QuickFoodInput
        onAddFoods={onQuickAddFoods}
        recipes={recipeOptions}
        foodCatalog={foodOptions}
      />
      <Box>
        <Button
          type="button"
          variant="text"
          onClick={() => setShowCustomRecipeForm((prev) => !prev)}
          disabled={!profileId}
        >
          + Crear receta
        </Button>
      </Box>

      {showCustomRecipeForm && (
        <Box sx={{ display: "grid", gap: 1.5, p: 1.5, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1">Nueva receta personalizada</Typography>
          <TextField
            label="Nombre de la receta"
            value={customRecipeForm.name}
            onChange={onChangeCustomRecipeName}
            fullWidth
          />
          {customRecipeForm.ingredients.map((item, index) => (
            <Stack key={`recipe-ingredient-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Autocomplete
                options={foodOptions}
                value={item.food}
                onChange={(_, value) => onChangeRecipeIngredientFood(index, value)}
                getOptionLabel={(option) => option?.name || ""}
                isOptionEqualToValue={(option, value) =>
                  option?.name === value?.name && option?.category === value?.category
                }
                renderInput={(params) => <TextField {...params} label="Ingrediente" fullWidth />}
                sx={{ flex: 1 }}
              />
              <TextField
                type="number"
                label="Gramos"
                value={item.grams}
                onChange={(event) => onChangeRecipeIngredientGrams(index, event.target.value)}
                inputProps={{ min: 1, step: 1 }}
                sx={{ width: { xs: "100%", sm: 140 } }}
              />
              <Button
                type="button"
                variant="outlined"
                color="error"
                onClick={() => onRemoveRecipeIngredient(index)}
                disabled={customRecipeForm.ingredients.length <= 1}
              >
                Quitar
              </Button>
            </Stack>
          ))}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button type="button" variant="outlined" onClick={onAddRecipeIngredient}>
              Agregar ingrediente
            </Button>
            <Button type="button" variant="contained" onClick={onSaveCustomRecipe}>
              Guardar receta
            </Button>
          </Stack>
        </Box>
      )}
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
            <MenuItem value="bebida">Bebida</MenuItem>
          </Select>
        </FormControl>

        {formData.mealType === "bebida" && (
          <FormControl fullWidth>
            <InputLabel id="beverage-type-label">Tipo de bebida</InputLabel>
            <Select
              labelId="beverage-type-label"
              label="Tipo de bebida"
              value={formData.beverageType}
              onChange={onChangeBeverageType}
            >
              {BEVERAGE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {beverageTypeLabel(type)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

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
          label={formData.mealType === "bebida" ? "Cantidad" : "Cantidad (x100 g)"}
          value={formData.quantity}
          onChange={onChangeQuantity}
          inputProps={{
            min: formData.mealType === "bebida" ? 10 : 0,
            step: formData.mealType === "bebida" ? 10 : 0.1,
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {formData.mealType === "bebida" ? "ml" : "x100 g"}
              </InputAdornment>
            ),
          }}
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
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {mealsTodayByType.map((block) => (
              <Box
                key={block.type}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: 1,
                  backgroundColor: "background.paper",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.6 }}>
                  {block.label}
                </Typography>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 760 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Alimento</TableCell>
                        <TableCell align="right">Calorías</TableCell>
                        <TableCell align="right">Proteínas</TableCell>
                        <TableCell align="right">Carbohidratos</TableCell>
                        <TableCell align="right">Grasas</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                  {block.items.map((meal) => (
                    <TableRow key={meal.id}>
                      {(() => {
                        const contribution = getMealContributionValues(meal);
                        return (
                          <>
                            <TableCell>
                              <Typography variant="body1" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                {meal.name}
                                {meal?.mealType === "bebida" && meal?.beverageType
                                  ? ` · ${beverageTypeLabel(meal.beverageType)}`
                                  : ""}
                                {meal?.quantity && meal?.unit ? ` (${meal.quantity} ${meal.unit})` : ""}
                              </Typography>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.calories} kcal
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.protein} g
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.carbs} g
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              {contribution.fat} g
                            </TableCell>
                            <TableCell align="right">
                              {String(editingMealId) === String(meal.id) ? (
                                <Stack direction="row" spacing={0.7} sx={{ justifyContent: "flex-end" }}>
                                  <TextField
                                    type="number"
                                    label={meal?.unit === "ml" ? "ml" : "Cant."}
                                    size="small"
                                    value={editingQuantity}
                                    onChange={(event) => setEditingQuantity(event.target.value)}
                                    inputProps={{
                                      min: meal?.unit === "ml" ? 10 : 0.1,
                                      step: meal?.unit === "ml" ? 10 : 0.1,
                                    }}
                                    sx={{ width: 95 }}
                                  />
                                  <Button type="button" size="small" variant="contained" onClick={() => onSaveMealEdit(meal)}>
                                    Guardar
                                  </Button>
                                  <Button type="button" size="small" variant="text" onClick={cancelEditMeal}>
                                    Cancelar
                                  </Button>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={0.7} sx={{ justifyContent: "flex-end" }}>
                                  <Button type="button" size="small" variant="text" onClick={() => startEditMeal(meal)}>
                                    Editar
                                  </Button>
                                  <Button
                                    type="button"
                                    size="small"
                                    color="error"
                                    variant="text"
                                    onClick={() => onDeleteMeal(meal.id)}
                                  >
                                    Eliminar
                                  </Button>
                                </Stack>
                              )}
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
