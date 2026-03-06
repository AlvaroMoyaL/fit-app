import { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WorkMealPlanner from "./WorkMealPlanner";
import CampMealKit from "./CampMealKit";

export default function WorkNutritionTools() {
  const [tab, setTab] = useState(0);

  const handleChange = (_event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box>
      <Tabs value={tab} onChange={handleChange} variant="scrollable" allowScrollButtonsMobile>
        <Tab label="Comida de casino" />
        <Tab label="Planificador de trabajo" />
        <Tab label="Kit de comida" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {tab === 0 && <CasinoMealEvaluator />}
        {tab === 1 && <WorkMealPlanner />}
        {tab === 2 && <CampMealKit />}
      </Box>
    </Box>
  );
}

