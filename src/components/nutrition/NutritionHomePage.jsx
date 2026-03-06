import { useState } from "react";

import { Box, Tabs, Tab, Typography } from "@mui/material";

import NutritionDashboard from "./NutritionDashboard";

import SmartFoodInput from "./SmartFoodInput";
import CookWithWhatIHave from "./CookWithWhatIHave";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import ShoppingList from "./ShoppingList";

export default function NutritionHomePage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="h5">Nutrition</Typography>

      <NutritionDashboard
        dailyCalories={1850}
        targetCalories={2200}
        protein={92}
        carbs={210}
        fat={65}
        nutritionScore={78}
      />

      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        <Tab label="Registrar comida" />
        <Tab label="Qué puedo cocinar" />
        <Tab label="Casino / Restaurante" />
        <Tab label="Lista de compras" />
      </Tabs>

      <Box>
        {tab === 0 && <SmartFoodInput />}
        {tab === 1 && <CookWithWhatIHave />}
        {tab === 2 && <CasinoMealEvaluator />}
        {tab === 3 && <ShoppingList profileId="default" />}
      </Box>
    </Box>
  );
}
