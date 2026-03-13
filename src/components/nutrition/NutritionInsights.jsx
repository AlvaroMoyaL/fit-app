import { Card, CardContent, Typography, Stack, Grid } from "@mui/material";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function InsightSection({ title, children }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 1 }}>
        <Typography variant="subtitle2">{title}</Typography>
        {children}
      </CardContent>
    </Card>
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
            <InsightSection title="Macro Balance">
              <Stack spacing={0.6}>
                <Typography variant="body2">{`Protein: ${proteinPercent} %`}</Typography>
                <Typography variant="body2">{`Carbs: ${carbPercent} %`}</Typography>
                <Typography variant="body2">{`Fat: ${fatPercent} %`}</Typography>
              </Stack>
            </InsightSection>
          </Grid>

          <Grid item xs={12} md={6}>
            <InsightSection title="Protein Intake">
              <Stack spacing={0.6}>
                <Typography variant="body2">{`Protein consumed: ${proteinConsumed} g`}</Typography>
                <Typography variant="body2">{`Target: ${proteinTarget} g`}</Typography>
                <Typography variant="body2">{`Missing: ${missingProtein} g`}</Typography>
              </Stack>
            </InsightSection>
          </Grid>

          <Grid item xs={12} md={6}>
            <InsightSection title="Vegetables">
              <Stack spacing={0.6}>
                <Typography variant="body2">Vegetable servings today:</Typography>
                <Typography variant="body2">{vegetableServings}</Typography>
              </Stack>
            </InsightSection>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
