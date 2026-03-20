import { useState } from "react";
import { Tabs, Tab, Box, Typography } from "@mui/material";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WorkMealPlanner from "./WorkMealPlanner";
import CampMealKit from "./CampMealKit";
import {
  nutritionCompactTabsSx,
  nutritionSurfaceSx,
  nutritionTabLabelDot,
  nutritionTabsRailSx,
} from "./nutritionUi";

export default function WorkNutritionTools() {
  const [tab, setTab] = useState(0);
  const panelSx = (theme) => ({
    ...nutritionSurfaceSx(theme),
    p: 1.2,
  });
  const tabsPanelSx = nutritionTabsRailSx;
  const compactTabsSx = (theme) =>
    nutritionCompactTabsSx(theme, {
      mobileMinHeight: 40,
      desktopMinHeight: 36,
      desktopFontSize: "0.82rem",
    });
  const contentFrameSx = {
    width: "100%",
    maxWidth: "100%",
    mx: 0,
  };

  const handleChange = (_event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ display: "grid", gap: 1.4 }}>
      <Box sx={(theme) => ({ ...panelSx(theme), display: "grid", gap: 0.5 })}>
        <Typography variant="subtitle1">Nutrición en el trabajo</Typography>
        <Typography variant="body2" color="text.secondary">
          Evalúa casino, planifica jornadas y arma tu kit semanal.
        </Typography>
      </Box>
      <Box sx={tabsPanelSx}>
        <Tabs
          value={tab}
          onChange={handleChange}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={compactTabsSx}
        >
          <Tab label={nutritionTabLabelDot("info.main", "Casino")} />
          <Tab label={nutritionTabLabelDot("warning.main", "Plan trabajo")} />
          <Tab label={nutritionTabLabelDot("success.main", "Kit comida")} />
        </Tabs>
      </Box>

      <Box sx={{ mt: 2 }}>
        {tab === 0 && (
          <Box sx={{ ...contentFrameSx, animation: "fadeIn 140ms ease" }}>
            <CasinoMealEvaluator />
          </Box>
        )}
        {tab === 1 && (
          <Box sx={{ ...contentFrameSx, animation: "fadeIn 140ms ease" }}>
            <WorkMealPlanner />
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ ...contentFrameSx, animation: "fadeIn 140ms ease" }}>
            <CampMealKit />
          </Box>
        )}
      </Box>
    </Box>
  );
}
