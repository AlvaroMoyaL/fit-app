import { getAllExercises, getMeta } from "./idb";
import LOCAL_EXERCISES from "../data/exercises.local";

const niveles = [
  "Muy baja",
  "Baja",
  "Media-baja",
  "Media",
  "Media-alta",
  "Alta",
  "Muy alta",
];

const actividad = [
  { label: "Sedentario (poco o nada)", value: 1.2 },
  { label: "Ligero (1-3 días/semana)", value: 1.375 },
  { label: "Moderado (3-5 días/semana)", value: 1.55 },
  { label: "Alto (6-7 días/semana)", value: 1.725 },
  { label: "Muy alto (2 sesiones/día)", value: 1.9 },
];

const PLAN_TEMPLATES = [
  {
    id: "goal",
    label: "Según objetivo",
    desc: "Usa tu objetivo para elegir los grupos principales.",
  },
  {
    id: "full_body",
    label: "Full body",
    desc: "Mezcla tren superior, inferior y core cada día.",
  },
  {
    id: "upper_lower",
    label: "Upper / Lower",
    desc: "Alterna tren superior e inferior según el día.",
  },
  {
    id: "ppl",
    label: "Push / Pull / Legs",
    desc: "Ciclo de empuje, tracción y piernas.",
  },
  {
    id: "cardio_core",
    label: "Cardio + Core",
    desc: "Más cardio y zona media.",
  },
  {
    id: "mobility",
    label: "Movilidad + Core",
    desc: "Rutina suave y de control.",
  },
];

const EQUIPMENT_MODES = {
  week: {
    label: "Semana (sin equipo, espacio pequeño)",
    allowed: new Set(["bodyweight"]),
    noisyBlocked: [
      "burpee",
      "jumping jack",
      "box jump",
      "tuck jump",
      "high knees",
      "sprint",
      "jump",
      "skipping",
      "mountain climber",
    ],
  },
  weekend: {
    label: "Fin de semana (banca + barra + discos + mancuernas)",
    allowed: new Set(["bodyweight", "barbell", "dumbbell", "bench"]),
    noisyBlocked: [],
  },
  gym: {
    label: "Gimnasio (máquinas + accesorios)",
    allowed: new Set([
      "bodyweight",
      "barbell",
      "dumbbell",
      "bench",
      "cable",
      "machine",
      "leverage",
      "assisted",
      "band",
      "kettlebell",
      "smith",
      "ez barbell",
      "rope",
    ]),
    noisyBlocked: [],
  },
};

function normalizeEquipment(equipment) {
  if (!equipment) return "";
  const e = equipment.toLowerCase();
  if (e.includes("barbell")) return "barbell";
  if (e.includes("dumbbell")) return "dumbbell";
  if (e.includes("bench")) return "bench";
  if (e.includes("body weight")) return "bodyweight";
  if (e.includes("cable")) return "cable";
  if (e.includes("machine")) return "machine";
  if (e.includes("leverage")) return "leverage";
  if (e.includes("assisted")) return "assisted";
  if (e.includes("band")) return "band";
  if (e.includes("kettlebell")) return "kettlebell";
  if (e.includes("smith")) return "smith";
  if (e.includes("ez")) return "ez barbell";
  if (e.includes("rope")) return "rope";
  return e;
}

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function bmiCategory(bmi) {
  if (!bmi) return "—";
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidad I";
  if (bmi < 40) return "Obesidad II";
  return "Obesidad III";
}

function calculateMetrics(f) {
  const edad = toNum(f.edad);
  const peso = toNum(f.peso);
  const alturaCm = toNum(f.altura);
  const alturaM = alturaCm / 100;
  const cintura = toNum(f.cintura);
  const cadera = toNum(f.cadera);
  const cuello = toNum(f.cuello);

  const bmi = alturaM ? peso / (alturaM * alturaM) : 0;

  const sexo = f.sexo;
  const bmr =
    sexo === "Hombre"
      ? 10 * peso + 6.25 * alturaCm - 5 * edad + 5
      : 10 * peso + 6.25 * alturaCm - 5 * edad - 161;

  const factor = toNum(f.actividadFactor);
  const tdee = bmr * (factor || 1);

  const whtr = alturaCm ? cintura / alturaCm : 0;
  const whr = cadera ? cintura / cadera : 0;

  let bodyFat = 0;
  if (alturaCm && cintura && cuello && sexo === "Hombre") {
    bodyFat =
      86.010 * Math.log10(cintura - cuello) -
      70.041 * Math.log10(alturaCm) +
      36.76;
  }
  if (alturaCm && cintura && cuello && cadera && sexo === "Mujer") {
    bodyFat =
      163.205 * Math.log10(cintura + cadera - cuello) -
      97.684 * Math.log10(alturaCm) -
      78.387;
  }

  const leanMass = bodyFat ? peso * (1 - bodyFat / 100) : 0;
  const ffmi = alturaM ? leanMass / (alturaM * alturaM) : 0;

  return {
    bmi,
    bmiCat: bmiCategory(bmi),
    bmr,
    tdee,
    whtr,
    whr,
    bodyFat,
    leanMass,
    ffmi,
  };
}

function pickRandom(list, count) {
  const copy = [...list];
  const out = [];
  while (copy.length && out.length < count) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function isTimedExercise(ex) {
  const c = (ex.category || "").toLowerCase();
  const bp = (ex.bodyPart || "").toLowerCase();
  return (
    c.includes("cardio") || c.includes("stretching") || bp.includes("cardio")
  );
}

function difficultyAdj(difficulty) {
  const d = (difficulty || "").toLowerCase();
  if (d.includes("beginner")) return -1;
  if (d.includes("advanced")) return 1;
  return 0;
}

function clamp(min, max, v) {
  return Math.max(min, Math.min(max, v));
}

function makePrescription(ex, levelIndex) {
  const diff = difficultyAdj(ex.difficulty);
  if (isTimedExercise(ex)) {
    const work = clamp(20, 60, 25 + levelIndex * 5 + diff * 5);
    const rest = clamp(10, 40, 20 - levelIndex * 2);
    return { type: "time", workSec: work, restSec: rest };
  }
  const reps = clamp(6, 15, 8 + levelIndex + diff);
  const sets = levelIndex < 2 ? 2 : levelIndex < 4 ? 3 : 4;
  const rest = clamp(30, 90, 70 - levelIndex * 5);
  return { type: "reps", sets, reps, restSec: rest };
}

function filterPoolByMode(pool, mode, quiet) {
  const config = EQUIPMENT_MODES[mode] || EQUIPMENT_MODES.week;
  const allowed = config.allowed;
  const blocked = quiet ? config.noisyBlocked || [] : [];

  const filtered = pool.filter((e) => {
    if (!allowed.has(normalizeEquipment(e.equipment))) return false;
    const name = (e.name || "").toLowerCase();
    return !blocked.some((k) => name.includes(k));
  });

  return filtered.length ? filtered : pool;
}

const BODY_UPPER = new Set([
  "chest",
  "back",
  "shoulders",
  "upper arms",
  "lower arms",
]);
const BODY_LOWER = new Set(["upper legs", "lower legs"]);
const BODY_CORE = new Set(["waist"]);
const BODY_CARDIO = new Set(["cardio"]);

const TARGET_PUSH = new Set([
  "pectorals",
  "delts",
  "triceps",
  "serratus anterior",
]);
const TARGET_PULL = new Set([
  "lats",
  "upper back",
  "biceps",
  "forearms",
  "levator scapulae",
]);
const TARGET_LEGS = new Set(["quads", "hamstrings", "glutes", "calves"]);

function normalizeBodyPart(value) {
  return (value || "").toLowerCase();
}

function normalizeTarget(value) {
  return (value || "").toLowerCase();
}

function filterPoolByBodyParts(pool, parts) {
  if (!parts || parts.size === 0) return pool;
  const filtered = pool.filter((e) => parts.has(normalizeBodyPart(e.bodyPart)));
  return filtered.length ? filtered : pool;
}

function filterPoolByTargets(pool, targets) {
  if (!targets || targets.size === 0) return pool;
  const filtered = pool.filter((e) => targets.has(normalizeTarget(e.target)));
  return filtered.length ? filtered : pool;
}

function filterPoolByTemplate(pool, template, dayIndex) {
  if (!template || template === "goal") {
    return { pool, focus: "Objetivo" };
  }

  if (template === "full_body") {
    const parts = new Set([
      ...BODY_UPPER,
      ...BODY_LOWER,
      ...BODY_CORE,
      ...BODY_CARDIO,
    ]);
    return { pool: filterPoolByBodyParts(pool, parts), focus: "Full body" };
  }

  if (template === "upper_lower") {
    const isUpper = dayIndex % 2 === 0;
    const parts = isUpper ? BODY_UPPER : BODY_LOWER;
    return {
      pool: filterPoolByBodyParts(pool, parts),
      focus: isUpper ? "Upper" : "Lower",
    };
  }

  if (template === "ppl") {
    const phase = dayIndex % 3;
    if (phase === 0) {
      return {
        pool: filterPoolByTargets(pool, TARGET_PUSH),
        focus: "Push",
      };
    }
    if (phase === 1) {
      return {
        pool: filterPoolByTargets(pool, TARGET_PULL),
        focus: "Pull",
      };
    }
    return {
      pool: filterPoolByTargets(pool, TARGET_LEGS),
      focus: "Legs",
    };
  }

  if (template === "cardio_core") {
    const parts = new Set([...BODY_CARDIO, ...BODY_CORE]);
    return { pool: filterPoolByBodyParts(pool, parts), focus: "Cardio + Core" };
  }

  if (template === "mobility") {
    const parts = new Set(["waist", "lower legs", "upper legs", "neck"]);
    return { pool: filterPoolByBodyParts(pool, parts), focus: "Movilidad" };
  }

  return { pool, focus: "Objetivo" };
}

const bodyPartCache = new Map();
const bodyPartPromiseCache = new Map();
let bodyPartActive = 0;
const bodyPartQueue = [];
const POOL_CACHE_KEY = "fit_pool_cache";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runBodyPartQueue() {
  if (bodyPartActive >= 1 || bodyPartQueue.length === 0) return;
  const { task, resolve, reject } = bodyPartQueue.shift();
  bodyPartActive += 1;
  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      bodyPartActive -= 1;
      runBodyPartQueue();
    });
}

function enqueueBodyPart(task) {
  return new Promise((resolve, reject) => {
    bodyPartQueue.push({ task, resolve, reject });
    runBodyPartQueue();
  });
}

async function fetchByBodyPart(bodyPart) {
  if (bodyPartCache.has(bodyPart)) return bodyPartCache.get(bodyPart);
  if (bodyPartPromiseCache.has(bodyPart)) return bodyPartPromiseCache.get(bodyPart);

  const task = async () => {
    const url = `/edb/exercises/bodyPart/${encodeURIComponent(bodyPart)}`;
    let attempt = 0;
    while (attempt < 3) {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        bodyPartCache.set(bodyPart, data);
        return data;
      }
      if (res.status === 429) {
        await sleep(1500 * Math.pow(2, attempt));
        attempt += 1;
        continue;
      }
      throw new Error(`API error ${res.status}`);
    }
    throw new Error("API rate limit");
  };

  const promise = enqueueBodyPart(task);
  bodyPartPromiseCache.set(bodyPart, promise);
  try {
    return await promise;
  } finally {
    bodyPartPromiseCache.delete(bodyPart);
  }
}

async function fetchGifUrl(exerciseId) {
  return getGifUrlWithLimit(exerciseId);
}

const gifCache = new Map();
const gifPromiseCache = new Map();
const MAX_GIF_CONCURRENCY = 1;
let gifActive = 0;
const gifQueue = [];

function runGifQueue() {
  if (gifActive >= MAX_GIF_CONCURRENCY || gifQueue.length === 0) return;
  const { task, resolve, reject } = gifQueue.shift();
  gifActive += 1;
  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      gifActive -= 1;
      setTimeout(runGifQueue, 500);
    });
}

function enqueueGif(task) {
  return new Promise((resolve, reject) => {
    gifQueue.push({ task, resolve, reject });
    runGifQueue();
  });
}

async function getGifUrlWithLimit(exerciseId) {
  if (!exerciseId) return "";
  if (gifCache.has(exerciseId)) return gifCache.get(exerciseId);
  if (gifPromiseCache.has(exerciseId)) return gifPromiseCache.get(exerciseId);

  const promise = enqueueGif(async () => {
    let attempt = 0;
    while (attempt < 3) {
      const res = await fetch(
        `/edb/image?exerciseId=${exerciseId}&resolution=360`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        gifCache.set(exerciseId, url);
        return url;
      }
      if (res.status === 429) {
        await sleep(800 * Math.pow(2, attempt));
        attempt += 1;
        continue;
      }
      throw new Error("No se pudo cargar el gif");
    }
    throw new Error("Rate limit gif");
  });

  gifPromiseCache.set(exerciseId, promise);
  try {
    const url = await promise;
    return url;
  } finally {
    gifPromiseCache.delete(exerciseId);
  }
}

let localPoolPromise = null;
async function getLocalPool() {
  if (localPoolPromise) return localPoolPromise;
  localPoolPromise = (async () => {
    try {
      const complete = await getMeta("exercises_complete");
      if (!complete?.value) return null;
      const all = await getAllExercises();
      return all.length ? all : null;
    } catch {
      return null;
    }
  })();
  return localPoolPromise;
}

async function buildExercises(pool, mode, quiet, count, levelIndex) {
  const filtered = filterPoolByMode(pool, mode, quiet);
  const picked = pickRandom(filtered, count).map((ex) => ({
    id: ex.id,
    name: ex.name || ex.name_es || ex.name_en,
    name_es: ex.name_es,
    name_en: ex.name_en,
    bodyPart: ex.bodyPart,
    target: ex.target,
    secondaryMuscles: ex.secondaryMuscles || [],
    instructions: ex.instructions || [],
    instructions_es: ex.instructions_es,
    instructions_en: ex.instructions_en,
    description: ex.description || "",
    description_es: ex.description_es,
    description_en: ex.description_en,
    difficulty: ex.difficulty || "",
    equipment: ex.equipment || "",
    category: ex.category || "",
  }));

  const withPrescription = picked.map((ex) => ({
    ...ex,
    prescription: makePrescription(ex, levelIndex),
  }));

  const withGifs = await Promise.all(
    withPrescription.map(async (ex) => {
      try {
        const gifUrl = await fetchGifUrl(ex.id);
        return { ...ex, gifUrl };
      } catch {
        return ex;
      }
    })
  );

  return withGifs;
}

async function generatePlan(form, options = {}) {
  const forceLocal = Boolean(options.forceLocal);
  const baseIndex = Math.max(0, niveles.indexOf(form.nivel));
  const levelIndex = Math.max(
    0,
    Math.min(niveles.length - 1, baseIndex + (options.adjustLevelDelta || 0))
  );
  const trainDaysCount = Array.isArray(form.trainDays)
    ? form.trainDays.length
    : 0;
  const days = clamp(1, 7, trainDaysCount || 3);
  const mainCount = 4 + Math.floor(levelIndex / 2);

  const bodyPartsByGoal = {
    Salud: ["cardio", "upper legs", "waist"],
    "Perder grasa": ["cardio", "upper legs", "waist"],
    "Ganar músculo": ["chest", "back", "upper legs", "upper arms", "shoulders"],
    Resistencia: ["cardio", "lower legs", "upper legs"],
    Movilidad: ["waist", "upper legs", "lower legs"],
  };

  const template = form.planTemplate || "goal";
  const partsByTemplate = {
    full_body: [
      "upper legs",
      "lower legs",
      "upper arms",
      "chest",
      "back",
      "shoulders",
      "waist",
      "cardio",
    ],
    upper_lower: [
      "upper arms",
      "chest",
      "back",
      "shoulders",
      "upper legs",
      "lower legs",
      "waist",
    ],
    ppl: [
      "upper arms",
      "chest",
      "back",
      "shoulders",
      "upper legs",
      "lower legs",
    ],
    cardio_core: ["cardio", "waist"],
    mobility: ["waist", "upper legs", "lower legs", "neck"],
  };
  const parts =
    template === "goal"
      ? bodyPartsByGoal[form.objetivo] || bodyPartsByGoal.Salud
      : partsByTemplate[template] || bodyPartsByGoal.Salud;
  let pool = forceLocal ? LOCAL_EXERCISES : await getLocalPool();
  if (!pool || pool.length === 0) {
    const lists = await Promise.all(
      parts.map(async (p) => {
        try {
          return await fetchByBodyPart(p);
        } catch {
          return [];
        }
      })
    );

    pool = lists.flat().map((e) => ({
      id: e.id,
      name: e.name,
      name_es: e.name_es,
      name_en: e.name_en,
      bodyPart: e.bodyPart,
      target: e.target,
      secondaryMuscles: e.secondaryMuscles,
      instructions: e.instructions,
      instructions_es: e.instructions_es,
      instructions_en: e.instructions_en,
      description: e.description,
      description_es: e.description_es,
      description_en: e.description_en,
      difficulty: e.difficulty,
      equipment: e.equipment,
      category: e.category,
    }));
  } else {
    const filtered = pool.filter((e) => parts.includes(e.bodyPart));
    if (filtered.length) pool = filtered;
  }

  if (pool.length === 0) {
    pool = LOCAL_EXERCISES;
  }
  if (pool.length === 0) {
    try {
      const cached = JSON.parse(localStorage.getItem(POOL_CACHE_KEY));
      if (Array.isArray(cached) && cached.length) {
        pool = cached;
      }
    } catch {
      // ignore
    }
  } else {
    try {
      localStorage.setItem(POOL_CACHE_KEY, JSON.stringify(pool));
    } catch {
      // ignore
    }
  }

  const planDays = await Promise.all(
    Array.from({ length: days }).map(async (_, idx) => {
      const mode = "week";
      const quiet = true;
      const { pool: templatePool, focus } = filterPoolByTemplate(
        pool,
        template,
        idx
      );
      const exercises = await buildExercises(
        templatePool,
        mode,
        quiet,
        mainCount,
        levelIndex
      );
      const xp = 50 + levelIndex * 10 + exercises.length * 5;
      return {
        title: `Día ${idx + 1}`,
        mode,
        quiet,
        focus,
        exercises,
        xp,
      };
    })
  );

  const totalXp = planDays.reduce((sum, d) => sum + d.xp, 0);
  const trainDays = Array.isArray(form.trainDays) ? form.trainDays : [];
  const weekLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  let planIndex = 0;
  const weekSchedule = weekLabels.map((label, idx) => {
    if (!trainDays.includes(idx)) return { label, type: "rest" };
    if (planIndex < planDays.length) {
      const day = planDays[planIndex];
      planIndex += 1;
      return { label, type: "train", title: day.title };
    }
    return { label, type: "rest" };
  });

  return {
    createdAt: new Date().toISOString(),
    days: planDays,
    totalXp,
    pool,
    template,
    weekSchedule,
  };
}

export {
  niveles,
  actividad,
  EQUIPMENT_MODES,
  PLAN_TEMPLATES,
  calculateMetrics,
  generatePlan,
  buildExercises,
  fetchGifUrl,
};
