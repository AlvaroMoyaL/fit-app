import { Card, CardContent, Typography, Stack, Grid, Box } from "@mui/material";

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
}) {
  const score = toNumber(nutritionScore?.score);
  const proteinPercent = toNumber(macroAnalysis?.protein?.percent);
  const carbPercent = toNumber(macroAnalysis?.carbs?.percent);
  const fatPercent = toNumber(macroAnalysis?.fats?.percent);
  const proteinConsumed = toNumber(proteinAnalysis?.proteinConsumed);
  const proteinTarget = toNumber(proteinAnalysis?.proteinTarget);
  const missingProtein = toNumber(proteinAnalysis?.missingProtein);
  const vegetableServings = toNumber(vegetableAnalysis?.servings);

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6">Insights nutricionales</Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InsightSection title="Daily Nutrition Score">
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
                <Typography variant="body2">Porciones hoy:</Typography>
                <Typography variant="body2">{vegetableServings}</Typography>
              </Stack>
            </InsightSection>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
