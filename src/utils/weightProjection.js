export function projectWeightChange(dailyBalance) {
  const balance = Number(dailyBalance || 0);
  return {
    week: (balance * 7) / 7700,
    month: (balance * 30) / 7700,
    threeMonths: (balance * 90) / 7700,
  };
}
