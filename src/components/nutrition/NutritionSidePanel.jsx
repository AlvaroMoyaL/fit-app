import { useEffect, useMemo, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getMeals, saveMeals } from "../../utils/nutritionStorage";
import { calculateDailyTotals, getMealsForDate } from "../../utils/nutritionUtils";
import { calculateTDEEDynamic } from "../../utils/metabolism";
import {
  buildNutritionTargetExplanations,
  calculateMicroTargets,
} from "../../utils/nutritionTargets";
import { foodCatalog } from "../../data/foodCatalog";
import { getCustomFoods } from "../../utils/customFoodsStorage";
import NutritionSectionNav from "./NutritionSectionNav";
import {
  getNutritionInformationalMetricState,
  getNutritionMetricState,
  nutritionSurfaceSx,
} from "./nutritionUi";

const SECTION_META = {
  registro: {
    label: "Registro",
    title: "Captura del día",
    description: "Entrada rápida de comidas, edición y revisión del detalle nutricional en un solo flujo.",
    note: "Primero carga la ingesta real; después revisa el estado con datos completos.",
  },
  estado: {
    label: "Estado",
    title: "Lectura del día",
    description: "Balance, alertas y tendencia del día antes de pasar a acciones más tácticas.",
    note: "Úsalo como vista principal para decidir si necesitas corregir calorías o macros.",
  },
  plan: {
    label: "Plan",
    title: "Planificación",
    description: "Construcción de la jornada y coordinación semanal desde una estructura más operativa.",
    note: "Conviene entrar aquí cuando ya validaste tu balance y quieres preparar el siguiente bloque.",
  },
  work: {
    label: "Trabajo",
    title: "Herramientas prácticas",
    description: "Resolución rápida para comer fuera de casa o decidir dentro del contexto laboral.",
    note: "Es una sección táctica: resuelve decisiones concretas sin salir del módulo.",
  },
};

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function HeroMetricCard({ label, valueText, helperText, state, infoText }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: state.background,
        border: `1px solid ${state.border}`,
        display: "grid",
        gap: 0.7,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.35, minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}
          >
            {label}
          </Typography>
          {infoText ? (
            <Tooltip
              title={
                <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                  {infoText}
                </Typography>
              }
              arrow
              enterTouchDelay={0}
            >
              <IconButton
                size="small"
                sx={{
                  p: 0.15,
                  color: "text.secondary",
                  "&:hover": { color: "text.primary" },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    border: "1px solid currentColor",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  i
                </Box>
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
        <Typography variant="caption" sx={{ color: state.accent, fontWeight: 800 }}>
          {state.label}
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ lineHeight: 1 }}>
        {valueText}
      </Typography>
      <Box sx={{ height: 7, borderRadius: 999, bgcolor: state.track, overflow: "hidden" }}>
        <Box
          sx={{
            width: `${Math.max(6, Math.round((state.progress || 0) * 100))}%`,
            height: "100%",
            borderRadius: 999,
            bgcolor: state.fill,
          }}
        />
      </Box>
      {helperText ? (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}

function NutritionQuickCard({ label, value, helper }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 0.45,
        p: 1.1,
        borderRadius: 2.6,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}
      >
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ lineHeight: 1.08 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {helper}
      </Typography>
    </Box>
  );
}

function normalizeFoodKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildFoodLookup(items) {
  const lookup = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const nameKey = normalizeFoodKey(item?.name);
    const brandKey = normalizeFoodKey(item?.brand);
    if (!nameKey) return;
    lookup.set(`${nameKey}::${brandKey}`, item);
    if (!brandKey && !lookup.has(`${nameKey}::`)) lookup.set(`${nameKey}::`, item);
  });
  return lookup;
}

function getMealRatio(meal) {
  if (Number(meal?.grams) > 0) return Number(meal.grams) / 100;
  const quantity = Number(meal?.quantity || 0);
  if (quantity <= 0) return 0;
  return meal?.unit === "ml" ? quantity / 100 : quantity;
}

function enrichMealsWithStoredNutrients(meals, foodLookup) {
  let changed = false;
  const nextMeals = (Array.isArray(meals) ? meals : []).map((meal) => {
    const nameKey = normalizeFoodKey(meal?.name);
    const brandKey = normalizeFoodKey(meal?.brand);
    const source = foodLookup.get(`${nameKey}::${brandKey}`) || foodLookup.get(`${nameKey}::`) || null;
    if (!source) return meal;
    const ratio = getMealRatio(meal);
    if (!ratio) return meal;
    const nextMeal = {
      ...meal,
      sodium: meal?.sodium ?? Number((Number(source?.sodium || 0) * ratio).toFixed(2)),
      sugars: meal?.sugars ?? Number((Number(source?.sugars || 0) * ratio).toFixed(2)),
      fiber: meal?.fiber ?? Number((Number(source?.fiber || 0) * ratio).toFixed(2)),
      saturatedFat:
        meal?.saturatedFat ?? Number((Number(source?.saturatedFat || 0) * ratio).toFixed(2)),
      transFat: meal?.transFat ?? Number((Number(source?.transFat || 0) * ratio).toFixed(2)),
      cholesterol:
        meal?.cholesterol ?? Number((Number(source?.cholesterol || 0) * ratio).toFixed(2)),
    };
    if (
      nextMeal.sodium !== meal?.sodium ||
      nextMeal.sugars !== meal?.sugars ||
      nextMeal.fiber !== meal?.fiber ||
      nextMeal.saturatedFat !== meal?.saturatedFat ||
      nextMeal.transFat !== meal?.transFat ||
      nextMeal.cholesterol !== meal?.cholesterol
    ) {
      changed = true;
    }
    return nextMeal;
  });
  return { changed, meals: nextMeals };
}

export default function NutritionSidePanel({
  profileId,
  profile,
  metricsLog = [],
  activeSection = "estado",
  onChangeSection,
}) {
  const theme = useTheme();
  const [meals, setMeals] = useState([]);
  const todayKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    if (!profileId) {
      setMeals([]);
      return;
    }
    setMeals(getMeals(profileId));
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const lookup = buildFoodLookup([...foodCatalog, ...getCustomFoods(profileId)]);
    const enriched = enrichMealsWithStoredNutrients(meals, lookup);
    if (!enriched.changed) return;
    saveMeals(profileId, enriched.meals);
    setMeals(enriched.meals);
  }, [meals, profileId]);

  const mealsToday = useMemo(() => getMealsForDate(meals, todayKey), [meals, todayKey]);
  const totalsToday = useMemo(() => calculateDailyTotals(mealsToday), [mealsToday]);
  const latestRecordedWeight = useMemo(() => {
    const safeLog = Array.isArray(metricsLog) ? [...metricsLog] : [];
    for (let i = safeLog.length - 1; i >= 0; i -= 1) {
      const value = Number(safeLog[i]?.weight);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }, [metricsLog]);
  const nutritionProfile = useMemo(() => {
    if (!profile) return profile;
    if (!latestRecordedWeight) return profile;
    return { ...profile, weight: latestRecordedWeight, peso: latestRecordedWeight };
  }, [profile, latestRecordedWeight]);
  const metricsForTdee = useMemo(() => {
    const safeLog = Array.isArray(metricsLog) ? metricsLog : [];
    if (!safeLog.length) return {};
    const todayMetric = [...safeLog].reverse().find((entry) => entry?.date === todayKey);
    const source = todayMetric || {};
    return {
      steps: Number(source?.steps || 0),
      activeKcal: Number(source?.activeKcal || 0),
    };
  }, [metricsLog, todayKey]);
  const tdee = useMemo(
    () => calculateTDEEDynamic(nutritionProfile, metricsForTdee),
    [metricsForTdee, nutritionProfile]
  );
  const microTargets = useMemo(
    () => calculateMicroTargets(nutritionProfile, { dailyCalories: tdee }),
    [nutritionProfile, tdee]
  );
  const sugarReference = useMemo(
    () => Number(microTargets.sugars || 0),
    [microTargets.sugars]
  );
  const saturatedFatReference = useMemo(
    () => Number(microTargets.saturatedFat || 0),
    [microTargets.saturatedFat]
  );
  const supportTargetExplanations = useMemo(
    () =>
      buildNutritionTargetExplanations({
        calories: tdee,
        ...microTargets,
        sugars: sugarReference,
        saturatedFat: saturatedFatReference,
      }),
    [microTargets, saturatedFatReference, sugarReference, tdee]
  );
  const fiberState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.fiber, microTargets.fiber, { lowWarnRatio: 0.5, overWarnRatio: 1.35 }),
    [microTargets.fiber, theme, totalsToday.fiber]
  );
  const sodiumState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.sodium, microTargets.sodium, { lowWarnRatio: 0.35, overWarnRatio: 1 }),
    [microTargets.sodium, theme, totalsToday.sodium]
  );
  const sugarsState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.sugars, sugarReference, { lowWarnRatio: 0.35, overWarnRatio: 1.35 }),
    [sugarReference, theme, totalsToday.sugars]
  );
  const saturatedFatState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.saturatedFat, saturatedFatReference, { lowWarnRatio: 0.25, overWarnRatio: 1 }),
    [saturatedFatReference, theme, totalsToday.saturatedFat]
  );
  const cholesterolState = useMemo(
    () => getNutritionInformationalMetricState(theme, totalsToday.cholesterol, microTargets.cholesterol),
    [microTargets.cholesterol, theme, totalsToday.cholesterol]
  );
  const mealsState = useMemo(
    () => getNutritionMetricState(theme, totalsToday.mealsCount, 4, { lowWarnRatio: 0.5, overWarnRatio: 1.5 }),
    [theme, totalsToday.mealsCount]
  );
  const currentWeight = Number(
    latestRecordedWeight || nutritionProfile?.weight || nutritionProfile?.peso || 0
  );
  const calorieDelta = Math.round(Number(totalsToday.calories || 0) - Number(tdee || 0));
  const sectionMeta = SECTION_META[activeSection] || SECTION_META.estado;
  const surfaceSx = (muiTheme) => ({
    ...nutritionSurfaceSx(muiTheme),
    p: 0,
    display: "grid",
    gap: 1.1,
  });

  return (
    <Box
      className="nutrition-side-panel-stack"
      sx={{
        display: "grid",
        gap: 1.4,
        position: { xs: "static", lg: "sticky" },
        top: { lg: 20 },
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box className="workspace-panel" sx={surfaceSx}>
        <Box sx={{ p: 1.2, display: "grid", gap: 0.8 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.12em" }}>
            Flujo del módulo
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.08 }}>
            Navegación y foco
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {sectionMeta.description}
          </Typography>
        </Box>
        <Box sx={{ px: 1.2, display: "grid", gap: 1.1 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.9 }}>
            <NutritionQuickCard
              label="Sección"
              value={sectionMeta.label}
              helper={sectionMeta.title}
            />
            <NutritionQuickCard
              label="Balance"
              value={`${calorieDelta > 0 ? "+" : ""}${calorieDelta} kcal`}
              helper={`ingesta ${Math.round(totalsToday.calories || 0)} vs TDEE ${Math.round(tdee || 0)}`}
            />
            <NutritionQuickCard
              label="Comidas"
              value={`${Math.round(totalsToday.mealsCount || 0)}`}
              helper="bloques registrados hoy"
            />
            <NutritionQuickCard
              label="Peso"
              value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "Sin dato"}
              helper={currentWeight ? "último registro disponible" : "añade peso para afinar TDEE"}
            />
          </Box>
          <NutritionSectionNav
            activeSection={activeSection}
            onChangeSection={onChangeSection}
            note={sectionMeta.note}
            showHeader={false}
            showNote={false}
            compact
          />
          <Typography variant="caption" color="text.secondary">
            {sectionMeta.note}
          </Typography>
        </Box>
      </Box>

      <Box className="workspace-panel" sx={surfaceSx}>
        <Box sx={{ p: 1.2, display: "grid", gap: 0.8 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.12em" }}>
            Soporte nutricional
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.08 }}>
            KPIs de apoyo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Señales secundarias para interpretar calidad, densidad y desviaciones del día.
          </Typography>
          <Box sx={{ display: "grid", gap: 0.4 }}>
            <Typography variant="caption" color="text.secondary">
              TDEE estimado: {Math.round(tdee || 0)} kcal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Calorías registradas: {Math.round(totalsToday.calories || 0)} kcal
            </Typography>
          </Box>
        </Box>
        <Box sx={{ px: 1.2, pb: 1.2, display: "grid", gap: 1.1 }}>
          <HeroMetricCard label="Comidas" valueText={`${Math.round(totalsToday.mealsCount || 0)}`} helperText="bloques lógicos del día" state={mealsState} />
          <HeroMetricCard label="Fibra" valueText={`${Math.round(totalsToday.fiber || 0)} / ${Math.round(microTargets.fiber || 0)} g`} state={fiberState} infoText={supportTargetExplanations.fiber} />
          <HeroMetricCard label="Sodio" valueText={`${Math.round(totalsToday.sodium || 0)} / ${Math.round(microTargets.sodium || 0)} mg`} state={sodiumState} infoText={supportTargetExplanations.sodium} />
          <HeroMetricCard label="Azúcares totales" valueText={`${Math.round(totalsToday.sugars || 0)} / ${Math.round(sugarReference || 0)} g`} state={sugarsState} infoText={supportTargetExplanations.sugars} />
          <HeroMetricCard label="Grasa saturada" valueText={`${Math.round(totalsToday.saturatedFat || 0)} / ${Math.round(saturatedFatReference || 0)} g`} state={saturatedFatState} infoText={supportTargetExplanations.saturatedFat} />
          <HeroMetricCard label="Colesterol" valueText={`${Math.round(totalsToday.cholesterol || 0)} / ${Math.round(microTargets.cholesterol || 0)} mg`} state={cholesterolState} infoText={supportTargetExplanations.cholesterol} />
        </Box>
      </Box>
    </Box>
  );
}
