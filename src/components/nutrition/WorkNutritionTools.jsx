import { useState } from "react";
import { Tabs, Tab, Box, Typography } from "@mui/material";
import CasinoMealEvaluator from "./CasinoMealEvaluator";
import WorkMealPlanner from "./WorkMealPlanner";
import CampMealKit from "./CampMealKit";

function tabLabelDot(color, text) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color,
          flex: "0 0 auto",
        }}
      />
      <Box component="span">{text}</Box>
    </Box>
  );
}

export default function WorkNutritionTools() {
  const [tab, setTab] = useState(0);
  const panelSx = {
    p: 1.2,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    bgcolor: "background.paper",
  };
  const tabsPanelSx = {
    p: 0,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    boxSizing: "border-box",
    border: "none",
    borderRadius: 0,
    bgcolor: "transparent",
  };
  const compactTabsSx = {
    minHeight: 36,
    width: "100%",
    "& .MuiTab-root": {
      minHeight: 36,
      minWidth: "auto",
      px: 1.1,
      py: 0.45,
      fontSize: "0.82rem",
      mr: 0.45,
    },
    "& .MuiTabs-flexContainer": {
      gap: 0.3,
    },
  };
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
      <Box sx={{ ...panelSx, display: "grid", gap: 0.5 }}>
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
          <Tab label={tabLabelDot("info.main", "Casino")} />
          <Tab label={tabLabelDot("warning.main", "Plan trabajo")} />
          <Tab label={tabLabelDot("success.main", "Kit comida")} />
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
