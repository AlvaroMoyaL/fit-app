import { Card, CardContent, Typography, Stack, Grid, Box } from "@mui/material";
import { nutritionSurfaceSx } from "./nutritionUi";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function InsightSection({ title, children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.62)",
      }}
    >
        <Typography variant="subtitle2">{title}</Typography>
        {children}
    </Box>
  );
}

export default function NutritionInsights({
  nutritionScore,
  macroAnalysis,
  proteinAnalysis,
  vegetableAnalysis,
  embedded = false,
}) {
  const score = toNumber(nutritionScore?.score);
  const proteinPercent = toNumber(macroAnalysis?.protein?.percent);
  const carbPercent = toNumber(macroAnalysis?.carbs?.percent);
  const fatPercent = toNumber(macroAnalysis?.fats?.percent);
  const proteinConsumed = toNumber(proteinAnalysis?.proteinConsumed);
  const proteinTarget = toNumber(proteinAnalysis?.proteinTarget);
  const missingProtein = toNumber(proteinAnalysis?.missingProtein);
  const vegetableServings = toNumber(vegetableAnalysis?.servings);

  const content = (
    <>
      <Typography variant={embedded ? "subtitle1" : "h6"}>Insights nutricionales</Typography>

      <Grid container spacing={1.4}>
        <Grid item xs={12} md={6}>
          <InsightSection title="Score diario">
            <Typography variant="body2">{`${score} / 100`}</Typography>
          </InsightSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <InsightSection title="Balance de macros">
            <Stack spacing={0.6}>
              <Typography variant="body2">{`Proteínas: ${proteinPercent} %`}</Typography>
              <Typography variant="body2">{`Carbohidratos: ${carbPercent} %`}</Typography>
              <Typography variant="body2">{`Grasas: ${fatPercent} %`}</Typography>
            </Stack>
          </InsightSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <InsightSection title="Proteína">
            <Stack spacing={0.6}>
              <Typography variant="body2">{`Consumidas: ${proteinConsumed} g`}</Typography>
              <Typography variant="body2">{`Objetivo: ${proteinTarget} g`}</Typography>
              <Typography variant="body2">{`Faltan: ${missingProtein} g`}</Typography>
            </Stack>
          </InsightSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <InsightSection title="Vegetales">
            <Stack spacing={0.6}>
              <Typography variant="body2">Porciones hoy</Typography>
              <Typography variant="body2">{vegetableServings}</Typography>
            </Stack>
          </InsightSection>
        </Grid>
      </Grid>
    </>
  );

  if (embedded) {
    return (
      <Box sx={(theme) => ({ ...nutritionSurfaceSx(theme), p: { xs: 1.2, sm: 1.4 }, display: "grid", gap: 1.4 })}>
        {content}
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 2 }}>
        {content}
      </CardContent>
    </Card>
  );
}
