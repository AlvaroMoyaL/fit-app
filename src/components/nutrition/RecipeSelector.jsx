import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  List,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { recipes as baseRecipes } from "../../data/recipes";
import { foodCatalog } from "../../data/foodCatalog";
import { calculateRecipeMacros, expandRecipe } from "../../utils/recipes";

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function createIngredientDraft(ingredient, catalogIndex) {
  const food = catalogIndex.get(normalizeId(ingredient?.foodId)) || null;
  return {
    food,
    grams: String(Math.round(Number(ingredient?.grams || 0) || 0)),
  };
}

function inferRecipeCategory(recipe) {
  const haystack = `${normalizeId(recipe?.id)} ${normalizeId(recipe?.name)}`;

  if (haystack.includes("burger") || haystack.includes("hamburg")) return "Hamburguesas";
  if (haystack.includes("sandwich") || haystack.includes("wrap") || haystack.includes("completo")) {
    return "Sandwich y wraps";
  }
  if (
    haystack.includes("ensalada") ||
    haystack.includes("tomate") ||
    haystack.includes("lechuga")
  ) {
    return "Ensaladas y frescas";
  }
  if (
    haystack.includes("desayuno") ||
    haystack.includes("huevo") ||
    haystack.includes("avena")
  ) {
    return "Desayunos";
  }
  return "Platos rapidos";
}

export default function RecipeSelector({ onAddFoods, recipes = baseRecipes, catalog = foodCatalog }) {
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [draftIngredients, setDraftIngredients] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Todas");

  const safeRecipes = useMemo(() => (Array.isArray(recipes) ? recipes : []), [recipes]);
  const safeCatalog = useMemo(() => (Array.isArray(catalog) ? catalog : []), [catalog]);

  const catalogIndex = useMemo(() => {
    const index = new Map();
    safeCatalog.forEach((food) => {
      const idKey = normalizeId(food?.id);
      const nameKey = normalizeId(food?.name);
      if (idKey) index.set(idKey, food);
      if (nameKey) index.set(nameKey, food);
    });
    return index;
  }, [safeCatalog]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(safeRecipes.map(inferRecipeCategory)));
    return ["Todas", ...values];
  }, [safeRecipes]);
  const visibleRecipes = useMemo(() => {
    if (activeCategory === "Todas") return safeRecipes;
    return safeRecipes.filter((recipe) => inferRecipeCategory(recipe) === activeCategory);
  }, [activeCategory, safeRecipes]);

  const openRecipeEditor = (recipe) => {
    const expanded = expandRecipe(recipe).map((ingredient) =>
      createIngredientDraft(ingredient, catalogIndex)
    );
    setSelectedRecipeId(recipe?.id || "");
    setDraftIngredients(expanded);
  };

  const closeRecipeEditor = () => {
    setSelectedRecipeId("");
    setDraftIngredients([]);
  };

  const updateIngredientFood = (index, food) => {
    setDraftIngredients((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, food } : item))
    );
  };

  const updateIngredientGrams = (index, grams) => {
    setDraftIngredients((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, grams } : item))
    );
  };

  const removeIngredient = (index) => {
    setDraftIngredients((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const addIngredientRow = () => {
    setDraftIngredients((prev) => [...prev, { food: null, grams: "30" }]);
  };

  const addDraftRecipeToMeal = () => {
    const items = draftIngredients
      .map((item) => {
        const grams = Number(item?.grams || 0);
        if (!item?.food || !Number.isFinite(grams) || grams <= 0) return null;
        return {
          foodId: item.food.id || normalizeId(item.food.name),
          grams: Number(grams.toFixed(2)),
        };
      })
      .filter(Boolean);

    if (!items.length) return;

    if (typeof onAddFoods === "function") {
      onAddFoods(items);
    }
    closeRecipeEditor();
  };

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="h6">Recetas rápidas</Typography>
      <Typography variant="body2" color="text.secondary">
        Elige una preparación y, si quieres, ajusta sus ingredientes antes de agregarla.
      </Typography>
      <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap" }}>
        {categories.map((category) => (
          <Chip
            key={category}
            label={category}
            onClick={() => setActiveCategory(category)}
            color={activeCategory === category ? "primary" : "default"}
            variant={activeCategory === category ? "filled" : "outlined"}
            size="small"
          />
        ))}
      </Box>
      <List disablePadding sx={{ display: "grid", gap: 1 }}>
        {visibleRecipes.map((recipe, index) => {
          const macros = calculateRecipeMacros(recipe, safeCatalog);
          const expanded = expandRecipe(recipe).map((ingredient) => {
            const food = catalogIndex.get(normalizeId(ingredient?.foodId));
            return {
              label: food?.name || ingredient?.foodId || "Ingrediente",
              grams: Math.round(Number(ingredient?.grams || 0)),
            };
          });
          const isSelected = String(recipe?.id) === String(selectedRecipeId);

          return (
            <Box key={recipe.id}>
              <Box
                sx={{
                  p: 1.4,
                  display: "grid",
                  gap: 1,
                  borderRadius: 2.5,
                  bgcolor: isSelected ? "rgba(15,118,110,0.08)" : "rgba(255,255,255,0.62)",
                  border: "1px solid",
                  borderColor: isSelected ? "rgba(15,118,110,0.28)" : "divider",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                >
                  <Box sx={{ display: "grid", gap: 0.35 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {recipe.name}
                    </Typography>
                    <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" color="text.secondary">
                        {`${Math.round(macros.calories)} kcal`}
                      </Typography>
                      <Chip
                        size="small"
                        label={inferRecipeCategory(recipe)}
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                  <Button
                    variant={isSelected ? "contained" : "outlined"}
                    size="small"
                    onClick={() => openRecipeEditor(recipe)}
                  >
                    {isSelected ? "Editando" : "Personalizar"}
                  </Button>
                </Stack>

                {expanded.length ? (
                  <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap" }}>
                    {expanded.map((ingredient, ingredientIndex) => (
                      <Chip
                        key={`${recipe.id}-ingredient-${ingredientIndex}`}
                        size="small"
                        label={`${ingredient.label} ${ingredient.grams} g`}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                ) : null}

                {isSelected ? (
                  <Box
                    sx={{
                      mt: 0.6,
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "grid",
                      gap: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Ingredientes del plato
                    </Typography>

                    {draftIngredients.map((item, ingredientIndex) => (
                      <Stack
                        key={`${recipe.id}-draft-${ingredientIndex}`}
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                      >
                        <Autocomplete
                          options={safeCatalog}
                          value={item.food}
                          onChange={(_, value) => updateIngredientFood(ingredientIndex, value)}
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
                          onChange={(event) => updateIngredientGrams(ingredientIndex, event.target.value)}
                          inputProps={{ min: 1, step: 1 }}
                          sx={{ width: { xs: "100%", sm: 120 } }}
                        />
                        <Button
                          variant="text"
                          color="error"
                          onClick={() => removeIngredient(ingredientIndex)}
                        >
                          Quitar
                        </Button>
                      </Stack>
                    ))}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button variant="outlined" onClick={addIngredientRow}>
                        Agregar ingrediente
                      </Button>
                      <Button variant="contained" onClick={addDraftRecipeToMeal}>
                        Agregar al plato
                      </Button>
                      <Button variant="text" onClick={closeRecipeEditor}>
                        Cancelar
                      </Button>
                    </Stack>
                  </Box>
                ) : null}
              </Box>
              {index < visibleRecipes.length - 1 && <Divider component="li" sx={{ mt: 1 }} />}
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
