import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  FormControlLabel,
  Switch,
  TextField,
  Divider,
} from "@mui/material";
import { generateWorkMealPlan } from "../../utils/workMealPlanner";

export default function WorkMealPlanner() {
  const [days, setDays] = useState(4);
  const [hasFridge, setHasFridge] = useState(false);
  const [includeBreakfast, setIncludeBreakfast] = useState(true);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [includeDinner, setIncludeDinner] = useState(true);
  const [plan, setPlan] = useState(null);

  const handleGenerate = () => {
    const result = generateWorkMealPlan({
      days: Number(days || 0),
      hasFridge,
      includeBreakfast,
      includeSnacks,
      includeDinner,
    });
    setPlan(result);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Planificador de comidas para trabajo</Typography>

          <TextField
            label="Días de trabajo"
            type="number"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            inputProps={{ min: 1, max: 14, step: 1 }}
            fullWidth
          />

          <FormControlLabel
            control={<Switch checked={hasFridge} onChange={(e) => setHasFridge(e.target.checked)} />}
            label="Tengo refrigerador disponible"
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeBreakfast}
                onChange={(e) => setIncludeBreakfast(e.target.checked)}
              />
            }
            label="Incluir desayuno"
          />
          <FormControlLabel
            control={
              <Switch checked={includeSnacks} onChange={(e) => setIncludeSnacks(e.target.checked)} />
            }
            label="Incluir snacks"
          />
          <FormControlLabel
            control={
              <Switch checked={includeDinner} onChange={(e) => setIncludeDinner(e.target.checked)} />
            }
            label="Incluir cena"
          />

          <Box>
            <Button variant="contained" onClick={handleGenerate}>
              Generar plan
            </Button>
          </Box>

          {plan && Array.isArray(plan.days) && (
            <Stack spacing={1.4}>
              <Divider />
              {plan.days.map((dayItem, index) => (
                <Box key={`work-day-${dayItem.day}-${index}`}>
                  <Typography variant="h6">Día {dayItem.day}</Typography>

                  {dayItem.breakfast && (
                    <Box sx={{ mt: 0.6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Desayuno
                      </Typography>
                      <Typography variant="body1">{dayItem.breakfast.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Saciedad: {dayItem.breakfast.satietyLevel || "—"}
                      </Typography>
                    </Box>
                  )}

                  {dayItem.snack && (
                    <Box sx={{ mt: 0.6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Snack
                      </Typography>
                      <Typography variant="body1">{dayItem.snack.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Saciedad: {dayItem.snack.satietyLevel || "—"}
                      </Typography>
                    </Box>
                  )}

                  {dayItem.dinner && (
                    <Box sx={{ mt: 0.6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Cena
                      </Typography>
                      <Typography variant="body1">{dayItem.dinner.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Saciedad: {dayItem.dinner.satietyLevel || "—"}
                      </Typography>
                    </Box>
                  )}

                  {index < plan.days.length - 1 && <Divider sx={{ mt: 1.2 }} />}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
