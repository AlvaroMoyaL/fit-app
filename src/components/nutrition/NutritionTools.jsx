import { useState } from "react";

import { Tabs, Tab, Box } from "@mui/material";

import SmartFoodInput from "./SmartFoodInput";
import CookWithWhatIHave from "./CookWithWhatIHave";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WorkMealPlanner from "./WorkMealPlanner";
import CampMealKit from "./CampMealKit";
import ShoppingList from "./ShoppingList";

export default function NutritionTools({ profileId, onMealParsed }) {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, newValue) => setTab(newValue)}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab label="Registrar comida" />
        <Tab label="Qué puedo cocinar" />
        <Tab label="Casino / Restaurante" />
        <Tab label="Plan campamento" />
        <Tab label="Kit campamento" />
        <Tab label="Lista de compras" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: tab === 0 ? "block" : "none" }}>
          <SmartFoodInput profileId={profileId} onMealParsed={onMealParsed || (() => {})} />
        </Box>
        <Box sx={{ display: tab === 1 ? "block" : "none" }}>
          <CookWithWhatIHave />
        </Box>
        <Box sx={{ display: tab === 2 ? "block" : "none" }}>
          <CasinoMealEvaluator />
        </Box>
        <Box sx={{ display: tab === 3 ? "block" : "none" }}>
          <WorkMealPlanner />
        </Box>
        <Box sx={{ display: tab === 4 ? "block" : "none" }}>
          <CampMealKit profileId={profileId} />
        </Box>
        <Box sx={{ display: tab === 5 ? "block" : "none" }}>
          <ShoppingList profileId={profileId} isActive={tab === 5} />
        </Box>
      </Box>
    </Box>
  );
}
