function normalizeMuscle(value, lang = "es") {
  const v = String(value || "").toLowerCase().trim();
  const mapEs = [
    { re: /chest|pectoral/, label: "Pecho" },
    { re: /back|lats?|trap/, label: "Espalda" },
    { re: /shoulder|deltoid/, label: "Hombros" },
    { re: /biceps?/, label: "Biceps" },
    { re: /triceps?/, label: "Triceps" },
    { re: /forearm/, label: "Antebrazos" },
    { re: /quad|hamstring|calf|glute|upper legs?|lower legs?|adductor|abductor|leg/, label: "Pierna" },
    { re: /waist|abs?|oblique|core/, label: "Core" },
    { re: /cardio/, label: "Cardio" },
  ];
  const mapEn = [
    { re: /chest|pectoral/, label: "Chest" },
    { re: /back|lats?|trap/, label: "Back" },
    { re: /shoulder|deltoid/, label: "Shoulders" },
    { re: /biceps?/, label: "Biceps" },
    { re: /triceps?/, label: "Triceps" },
    { re: /forearm/, label: "Forearms" },
    { re: /quad|hamstring|calf|glute|upper legs?|lower legs?|adductor|abductor|leg/, label: "Legs" },
    { re: /waist|abs?|oblique|core/, label: "Core" },
    { re: /cardio/, label: "Cardio" },
  ];
  const map = lang === "en" ? mapEn : mapEs;
  const found = map.find((m) => m.re.test(v));
  return found ? found.label : "";
}

function muscleFromBodyPart(value, lang = "es") {
  const v = String(value || "").toLowerCase().trim();
  const es = {
    chest: "Pecho",
    back: "Espalda",
    shoulders: "Hombros",
    "upper arms": "Brazos",
    "lower arms": "Brazos",
    "upper legs": "Pierna",
    "lower legs": "Pierna",
    waist: "Core",
    cardio: "Cardio",
    neck: "Cuello",
  };
  const en = {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    "upper arms": "Arms",
    "lower arms": "Arms",
    "upper legs": "Legs",
    "lower legs": "Legs",
    waist: "Core",
    cardio: "Cardio",
    neck: "Neck",
  };
  const map = lang === "en" ? en : es;
  return map[v] || "";
}

function isCoreExercise(ex) {
  const body = String(ex?.bodyPart || "").toLowerCase();
  const target = String(ex?.target || "").toLowerCase();
  const category = String(ex?.category || "").toLowerCase();
  return (
    body === "waist" ||
    target === "core" ||
    target === "abs" ||
    target === "obliques" ||
    category === "core"
  );
}

function isStrengthExercise(ex) {
  const category = String(ex?.category || "").toLowerCase();
  if (isCoreExercise(ex)) return false;
  return !["cardio", "mobility", "stretching", "balance"].includes(category);
}

export function buildDayFocusLabel(day, lang = "es", fallback = "") {
  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
  if (!exercises.length) return fallback || (lang === "en" ? "General" : "General");

  const counts = new Map();
  let coreCount = 0;

  exercises.forEach((ex) => {
    if (isCoreExercise(ex)) {
      coreCount += 1;
      return;
    }
    if (!isStrengthExercise(ex)) return;
    const muscle =
      muscleFromBodyPart(ex.bodyPart, lang) ||
      normalizeMuscle(ex.bodyPart, lang) ||
      normalizeMuscle(ex.target, lang) ||
      (lang === "en" ? "Strength" : "Fuerza");
    counts.set(muscle, (counts.get(muscle) || 0) + 1);
  });

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  let base = "";
  if (top.length >= 2) base = `${top[0]} / ${top[1]}`;
  else if (top.length === 1) base = top[0];
  else if (coreCount > 0) base = "Core";
  else base = fallback || (lang === "en" ? "General" : "General");

  if (coreCount > 0 && !/core/i.test(base)) {
    base = `${base} + Core`;
  }

  return base;
}
