function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calculateBMR(profile) {
  const age = toNumber(profile?.age ?? profile?.edad);
  const weight = toNumber(profile?.weight ?? profile?.peso);
  const height = toNumber(profile?.height ?? profile?.altura);
  const sexRaw = String(profile?.sex ?? profile?.sexo ?? "").toLowerCase();
  const isFemale = sexRaw === "mujer" || sexRaw === "female";

  if (!age || !weight || !height) return 0;

  if (isFemale) {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export function calculateTDEE(profile) {
  const bmr = calculateBMR(profile);
  if (!bmr) return 0;
  return bmr * 1.4;
}

export function calculateCalorieBalance(caloriesConsumed, tdee) {
  const consumed = toNumber(caloriesConsumed);
  const dailyTdee = toNumber(tdee);
  const balance = consumed - dailyTdee;

  if (balance < -200) {
    return { balance, status: "deficit" };
  }
  if (balance > 200) {
    return { balance, status: "surplus" };
  }
  return { balance, status: "maintenance" };
}
