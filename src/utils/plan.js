import { getAllExercises, getMeta, getGif, upsertGif } from "./idb";
import { supabase } from "./supabaseClient";
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
      "skater",
      "hop",
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

const QUIET_BLOCKED = EQUIPMENT_MODES.week.noisyBlocked;

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

const LEVEL_PROFILES = [
  {
    minSets: 2,
    maxSets: 3,
    repBase: 8,
    repStep: 1,
    workBase: 22,
    workStep: 3,
    restBase: 70,
    restStep: -3,
    dayExerciseCount: 4,
  },
  {
    minSets: 2,
    maxSets: 3,
    repBase: 9,
    repStep: 1,
    workBase: 24,
    workStep: 3,
    restBase: 65,
    restStep: -3,
    dayExerciseCount: 4,
  },
  {
    minSets: 3,
    maxSets: 3,
    repBase: 10,
    repStep: 1,
    workBase: 28,
    workStep: 4,
    restBase: 60,
    restStep: -3,
    dayExerciseCount: 5,
  },
  {
    minSets: 3,
    maxSets: 4,
    repBase: 10,
    repStep: 1,
    workBase: 30,
    workStep: 4,
    restBase: 55,
    restStep: -3,
    dayExerciseCount: 5,
  },
  {
    minSets: 3,
    maxSets: 4,
    repBase: 11,
    repStep: 1,
    workBase: 34,
    workStep: 4,
    restBase: 50,
    restStep: -3,
    dayExerciseCount: 6,
  },
  {
    minSets: 4,
    maxSets: 4,
    repBase: 11,
    repStep: 1,
    workBase: 36,
    workStep: 4,
    restBase: 45,
    restStep: -3,
    dayExerciseCount: 6,
  },
  {
    minSets: 4,
    maxSets: 5,
    repBase: 12,
    repStep: 1,
    workBase: 38,
    workStep: 4,
    restBase: 40,
    restStep: -3,
    dayExerciseCount: 7,
  },
];

function getLevelProfile(levelIndex) {
  return LEVEL_PROFILES[clamp(0, LEVEL_PROFILES.length - 1, levelIndex)];
}

function makePrescription(ex, levelIndex) {
  const diff = difficultyAdj(ex.difficulty);
  const level = getLevelProfile(levelIndex);
  if (isTimedExercise(ex)) {
    const work = clamp(
      20,
      70,
      level.workBase + levelIndex * level.workStep + diff * 4
    );
    const rest = clamp(10, 60, level.restBase + levelIndex * level.restStep);
    return { type: "time", workSec: work, restSec: rest };
  }
  const reps = clamp(6, 18, level.repBase + levelIndex * level.repStep + diff);
  const sets = clamp(level.minSets, level.maxSets, level.minSets + Math.floor(levelIndex / 2));
  const rest = clamp(20, 90, level.restBase + levelIndex * level.restStep);
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

function filterPoolByEquipmentList(pool, equipmentList, quiet) {
  if (!Array.isArray(equipmentList) || equipmentList.length === 0) return pool;
  const allowed = new Set(equipmentList.map((item) => normalizeEquipment(item)));
  const blocked = quiet ? QUIET_BLOCKED : [];
  const filtered = pool.filter((e) => {
    if (!allowed.has(normalizeEquipment(e.equipment))) return false;
    const name = (e.name || "").toLowerCase();
    return !blocked.some((k) => name.includes(k));
  });
  return filtered.length ? filtered : pool;
}

function filterPoolByLevel(pool, levelIndex) {
  if (levelIndex >= 4) return pool;
  const hardKeywords = [
    "pistol",
    "handstand",
    "muscle up",
    "snatch",
    "clean",
    "jerk",
    "kipping",
    "olympic",
    "power clean",
    "power snatch",
    "split jerk",
    "thruster",
    "box jump",
    "tuck jump",
    "plyo",
    "burpee",
    "sprint",
    "depth jump",
    "jump",
    "pull-up",
    "pull up",
    "chin-up",
    "chin up",
    "dip",
    "pike push",
    "bear crawl",
    "handstand push",
    "muscle-up",
    "snatch balance",
    "clean and jerk",
    "hang clean",
    "hang snatch",
    "push press",
    "overhead squat",
  ];
  const filtered = pool.filter((e) => {
    const diff = (e.difficulty || "").toLowerCase();
    if (diff.includes("advanced")) return false;
    if (levelIndex <= 1 && diff.includes("intermediate")) return false;
    const name = (e.name || "").toLowerCase();
    if (name.includes("advanced")) return false;
    if (hardKeywords.some((k) => name.includes(k))) return false;
    const equipment = normalizeEquipment(e.equipment);
    if (levelIndex <= 1 && (equipment === "barbell" || equipment === "kettlebell")) {
      return false;
    }
    const category = (e.category || "").toLowerCase();
    if (levelIndex <= 2 && (category.includes("olympic") || category.includes("power"))) {
      return false;
    }
    return true;
  });
  return filtered.length ? filtered : pool;
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => {
    const id = String(item?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function pickWithExclusions(list, count, excludedIds) {
  const filtered = list.filter((it) => !excludedIds.has(String(it.id || "")));
  return pickRandom(filtered, count);
}

function isCoreExercise(ex) {
  const body = normalizeBodyPart(ex?.bodyPart);
  const target = normalizeTarget(ex?.target);
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

function buildDayBlueprint(template, dayIndex, goal) {
  const strengthCycle = [
    {
      focus: "Pecho + Espalda",
      strengthBodyParts: ["chest", "back"],
    },
    {
      focus: "Piernas",
      strengthBodyParts: ["upper legs", "lower legs"],
    },
    {
      focus: "Hombros + Brazos",
      strengthBodyParts: ["shoulders", "upper arms", "lower arms"],
    },
  ];
  const cycle = strengthCycle[dayIndex % strengthCycle.length];

  if (template === "upper_lower") {
    const isUpper = dayIndex % 2 === 0;
    return isUpper
      ? {
          focus: "Upper",
          bodyParts: [...BODY_UPPER],
          strengthBodyParts: [...BODY_UPPER],
          dailyCount: 6,
          split: { strength: 3, core: 3 },
          primaryCount: 3,
          secondaryCount: 1,
        }
      : {
          focus: "Lower",
          bodyParts: [...BODY_LOWER],
          strengthBodyParts: [...BODY_LOWER],
          dailyCount: 6,
          split: { strength: 3, core: 3 },
          primaryCount: 3,
          secondaryCount: 1,
        };
  }
  if (template === "ppl") {
    const phase = dayIndex % 3;
    if (phase === 0) {
      return {
        focus: "Push",
        targets: [...TARGET_PUSH],
        strengthTargets: [...TARGET_PUSH],
        dailyCount: 6,
        split: { strength: 3, core: 3 },
        primaryCount: 3,
        secondaryCount: 1,
      };
    }
    if (phase === 1) {
      return {
        focus: "Pull",
        targets: [...TARGET_PULL],
        strengthTargets: [...TARGET_PULL],
        dailyCount: 6,
        split: { strength: 3, core: 3 },
        primaryCount: 3,
        secondaryCount: 1,
      };
    }
    return {
      focus: "Legs",
      targets: [...TARGET_LEGS],
      strengthTargets: [...TARGET_LEGS],
      dailyCount: 6,
      split: { strength: 3, core: 3 },
      primaryCount: 3,
      secondaryCount: 1,
    };
  }
  if (template === "cardio_core") {
    return {
      focus: "Cardio + Core",
      bodyParts: [...BODY_CARDIO, ...BODY_CORE],
      categories: ["cardio", "mobility", "stretching", "core"],
      primaryCount: 3,
      secondaryCount: 2,
    };
  }
  if (template === "mobility") {
    return {
      focus: "Movilidad",
      categories: ["mobility", "stretching", "cardio"],
      bodyParts: ["waist", "upper legs", "lower legs", "back", "neck"],
      primaryCount: 4,
      secondaryCount: 1,
    };
  }
  if (template === "full_body") {
    return {
      focus: `${cycle.focus} + Core`,
      bodyParts: [
        "upper legs",
        "lower legs",
        "upper arms",
        "chest",
        "back",
        "shoulders",
        "waist",
      ],
      strengthBodyParts: cycle.strengthBodyParts,
      dailyCount: 6,
      split: { strength: 3, core: 3 },
      primaryCount: 4,
      secondaryCount: 2,
    };
  }
  if (template === "goal") {
    if (goal === "Movilidad") {
      return {
        focus: "Movilidad + Core",
        categories: ["mobility", "stretching", "cardio", "core"],
        bodyParts: ["waist", "upper legs", "lower legs", "back", "neck"],
        primaryCount: 4,
        secondaryCount: 2,
      };
    }
    return {
      focus: `${cycle.focus} + Core`,
      strengthBodyParts: cycle.strengthBodyParts,
      dailyCount: 6,
      split: { strength: 3, core: 3 },
      primaryCount: 3,
      secondaryCount: 2,
    };
  }

  return {
    focus: `${cycle.focus} + Core`,
    strengthBodyParts: cycle.strengthBodyParts,
    dailyCount: 6,
    split: { strength: 3, core: 3 },
    primaryCount: 3,
    secondaryCount: 2,
  };
}

function filterByBlueprint(pool, blueprint) {
  let primaryPool = pool;
  if (Array.isArray(blueprint.bodyParts) && blueprint.bodyParts.length) {
    primaryPool = filterPoolByBodyParts(primaryPool, new Set(blueprint.bodyParts));
  }
  if (Array.isArray(blueprint.targets) && blueprint.targets.length) {
    primaryPool = filterPoolByTargets(primaryPool, new Set(blueprint.targets));
  }
  if (Array.isArray(blueprint.categories) && blueprint.categories.length) {
    const allowed = new Set(blueprint.categories.map((x) => x.toLowerCase()));
    const byCat = primaryPool.filter((e) =>
      allowed.has(String(e.category || "").toLowerCase())
    );
    primaryPool = byCat.length ? byCat : primaryPool;
  }
  return uniqueById(primaryPool);
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

const gifCache = new Map();
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_GIF_BUCKET = import.meta.env.VITE_SUPABASE_GIF_BUCKET || "gifs";
const LOCAL_GIF_ID_MAP = {
  l001: "3533", // Squat
  l002: "1460", // Lunge
  l003: "3013", // Glute bridge
  l004: "1373", // Standing calf raise
  l005: "0662", // Push-up
  l006: "0464", // Plank variant
  l007: "0276", // Dead bug (closest core pattern)
  l008: "0274", // Crunch
  l009: "0293", // Dumbbell bent over row
  l010: "0025", // Barbell bench press
  l011: "0405", // Dumbbell seated shoulder press
  l012: "0294", // Dumbbell biceps curl
  l013: "0129", // Bench dip
  l014: "0085", // Romanian deadlift
  l015: "0027", // Barbell bent over row
  l016: "0289", // Dumbbell bench press (closest floor press intent)
  l017: "3221", // March-like cardio
  l018: "3220", // Side-step-like cardio
  l019: "1419", // Hip stretch (bodyweight mobility)
  l020: "0690", // Seated lower back stretch
};

function getGifIdCandidates(exerciseId) {
  if (!exerciseId) return [];
  const original = String(exerciseId);
  const out = [];
  if (/^\d+$/.test(original)) {
    const normalized = String(Number(original));
    if (normalized) out.push(normalized);
  }
  if (!out.includes(original)) out.push(original);
  return out;
}

function getSupabaseGifUrls(exerciseId) {
  if (!SUPABASE_URL || !exerciseId) return [];
  const ids = getGifIdCandidates(exerciseId);
  if (ids.length === 0) return [];
  const base = SUPABASE_URL.replace(/\/$/, "");
  return ids.map(
    (idStr) => `${base}/storage/v1/object/public/${SUPABASE_GIF_BUCKET}/${idStr}.gif`
  );
}
async function getCachedGifUrl(exerciseId) {
  if (!exerciseId) return "";
  const cached = await getGif(exerciseId);
  if (!cached?.blob) return "";
  const url = URL.createObjectURL(cached.blob);
  gifCache.set(exerciseId, url);
  return url;
}

async function getGifUrlWithLimit(exerciseId) {
  if (!exerciseId) return "";
  if (gifCache.has(exerciseId)) return gifCache.get(exerciseId);
  const cachedUrl = await getCachedGifUrl(exerciseId);
  if (cachedUrl) return cachedUrl;
  if (supabase) {
    const ids = getGifIdCandidates(exerciseId);
    for (const candidateId of ids) {
      try {
        const { data, error } = await supabase.storage
          .from(SUPABASE_GIF_BUCKET)
          .download(`${candidateId}.gif`);
        if (error || !data) continue;
        await upsertGif(exerciseId, data);
        const url = URL.createObjectURL(data);
        gifCache.set(exerciseId, url);
        return url;
      } catch {
        // try next candidate
      }
    }
  }
  const publicUrls = getSupabaseGifUrls(exerciseId);
  for (const url of publicUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      await upsertGif(exerciseId, blob);
      const localUrl = URL.createObjectURL(blob);
      gifCache.set(exerciseId, localUrl);
      return localUrl;
    } catch {
      // ignore and try next candidate
    }
  }
  return "";
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

const exerciseLookupPromise = { current: null };

function normalizeName(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function getExerciseLookups() {
  if (exerciseLookupPromise.current) return exerciseLookupPromise.current;
  exerciseLookupPromise.current = (async () => {
    const all = await getAllExercises();
    const byName = new Map();
    const byBodyTarget = new Map();
    const byBodyPart = new Map();
    all.forEach((e) => {
      if (!e?.id) return;
      const keys = [e.name, e.name_es, e.name_en].map(normalizeName).filter(Boolean);
      keys.forEach((k) => {
        if (!byName.has(k)) byName.set(k, e.id);
      });
      const bp = normalizeName(e.bodyPart);
      const target = normalizeName(e.target);
      if (bp && target) {
        const btKey = `${bp}|${target}`;
        const list = byBodyTarget.get(btKey) || [];
        list.push(e.id);
        byBodyTarget.set(btKey, list);
      }
      if (bp) {
        const list = byBodyPart.get(bp) || [];
        list.push(e.id);
        byBodyPart.set(bp, list);
      }
    });
    return { byName, byBodyTarget, byBodyPart };
  })();
  return exerciseLookupPromise.current;
}

function pickDeterministicId(list, seed) {
  if (!Array.isArray(list) || list.length === 0) return "";
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const idx = h % list.length;
  return String(list[idx]);
}

function parseGifRequest(input) {
  if (!input) return { id: "", names: [] };
  if (typeof input === "object") {
    return {
      id: input.id || "",
      names: [input.name, input.name_es, input.name_en].filter(Boolean),
      bodyPart: input.bodyPart || "",
      target: input.target || "",
    };
  }
  return { id: input, names: [], bodyPart: "", target: "" };
}

async function resolveGifId(input) {
  const { id, names, bodyPart, target } = parseGifRequest(input);
  const idStr = String(id || "");
  if (/^\d+$/.test(idStr)) return idStr;
  if (LOCAL_GIF_ID_MAP[idStr]) return LOCAL_GIF_ID_MAP[idStr];
  const lookups = await getExerciseLookups();
  const seed = `${id}|${names.join("|")}|${bodyPart}|${target}`;
  for (const raw of names) {
    const key = normalizeName(raw);
    if (!key) continue;
    const match = lookups.byName.get(key);
    if (match) return String(match);
  }
  const bp = normalizeName(bodyPart);
  const tg = normalizeName(target);
  if (bp && tg) {
    const byBoth = lookups.byBodyTarget.get(`${bp}|${tg}`);
    const picked = pickDeterministicId(byBoth, seed);
    if (picked) return picked;
  }
  if (bp) {
    const byPart = lookups.byBodyPart.get(bp);
    const picked = pickDeterministicId(byPart, seed);
    if (picked) return picked;
  }
  return idStr;
}

async function fetchGifUrl(input) {
  const { id: originalId } = parseGifRequest(input);
  const resolvedId = await resolveGifId(input);
  const url = await getGifUrlWithLimit(resolvedId);
  if (!url) return "";
  if (originalId && String(originalId) !== String(resolvedId)) {
    gifCache.set(originalId, url);
  }
  return url;
}

async function fetchGifMeta(input) {
  const { id: originalId } = parseGifRequest(input);
  const exactId = String(originalId || "");

  if (/^\d+$/.test(exactId)) {
    const exactUrl = await getGifUrlWithLimit(exactId);
    if (exactUrl) {
      return { url: exactUrl, resolvedId: exactId, source: "exact" };
    }
  }

  const resolvedId = await resolveGifId(input);
  const url = resolvedId ? await getGifUrlWithLimit(resolvedId) : "";
  if (url && originalId && String(originalId) !== String(resolvedId)) {
    gifCache.set(originalId, url);
  }
  return {
    url,
    resolvedId: resolvedId || "",
    source: resolvedId && String(resolvedId) !== exactId ? "fallback" : "exact",
  };
}

async function buildExercises(pool, mode, quiet, count, levelIndex, equipmentList, options = {}) {
  const byMode = filterPoolByMode(pool, mode, quiet);
  const byEquipment = filterPoolByEquipmentList(pool, equipmentList, quiet);
  const basePool = equipmentList && equipmentList.length ? byEquipment : byMode;
  const filtered = filterPoolByLevel(basePool, levelIndex);
  const blueprint = options.blueprint || null;
  const excludedIds = new Set((options.excludedIds || []).map((x) => String(x)));
  const uniqueFiltered = uniqueById(filtered);

  let selected = [];
  if (blueprint) {
    const primaryPool = filterByBlueprint(uniqueFiltered, blueprint);
    const split = blueprint.split || null;
    if (split) {
      const uniqueBase = uniqueById(basePool);
      const strengthTarget = Math.min(count, Math.max(0, split.strength || 0));
      const coreTarget = Math.min(
        Math.max(0, count - strengthTarget),
        Math.max(0, split.core || 0)
      );
      let strengthPool = primaryPool.filter(isStrengthExercise);
      if (Array.isArray(blueprint.strengthBodyParts) && blueprint.strengthBodyParts.length) {
        const focused = filterPoolByBodyParts(
          strengthPool,
          new Set(blueprint.strengthBodyParts.map((x) => normalizeBodyPart(x)))
        );
        strengthPool = focused.length ? focused : strengthPool;
      }
      if (Array.isArray(blueprint.strengthTargets) && blueprint.strengthTargets.length) {
        const focused = filterPoolByTargets(
          strengthPool,
          new Set(blueprint.strengthTargets.map((x) => normalizeTarget(x)))
        );
        strengthPool = focused.length ? focused : strengthPool;
      }
      if (!strengthPool.length) {
        strengthPool = uniqueFiltered.filter(isStrengthExercise);
      }
      let corePool = primaryPool.filter(isCoreExercise);
      if (!corePool.length) corePool = uniqueFiltered.filter(isCoreExercise);
      if (!corePool.length) corePool = uniqueBase.filter(isCoreExercise);

      let pickedStrength = pickWithExclusions(strengthPool, strengthTarget, excludedIds);
      if (pickedStrength.length < strengthTarget) {
        const fallbackStrength = pickWithExclusions(
          uniqueFiltered.filter(isStrengthExercise),
          strengthTarget - pickedStrength.length,
          new Set([
            ...excludedIds,
            ...pickedStrength.map((ex) => String(ex.id || "")),
          ])
        );
        pickedStrength = [...pickedStrength, ...fallbackStrength];
      }
      pickedStrength.forEach((ex) => excludedIds.add(String(ex.id || "")));

      let pickedCore = pickWithExclusions(corePool, coreTarget, excludedIds);
      if (pickedCore.length < coreTarget) {
        const fallbackCore = pickWithExclusions(
          uniqueFiltered.filter(isCoreExercise),
          coreTarget - pickedCore.length,
          new Set([
            ...excludedIds,
            ...pickedCore.map((ex) => String(ex.id || "")),
          ])
        );
        pickedCore = [...pickedCore, ...fallbackCore];
      }
      pickedCore.forEach((ex) => excludedIds.add(String(ex.id || "")));
      selected = [...pickedStrength.slice(0, strengthTarget), ...pickedCore.slice(0, coreTarget)];

      if (selected.length < count) {
        const rest = pickWithExclusions(uniqueFiltered, count - selected.length, excludedIds);
        selected = [...selected, ...rest];
      }
      selected = selected.slice(0, count);
      // For split-based plans keep strict structure and avoid extra rebalancing.
      const picked = selected.map((ex) => ({
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
        instanceId:
          ex.instanceId || `${ex.id || ex.name}-${Math.random().toString(36).slice(2, 8)}`,
        prescription: makePrescription(ex, levelIndex),
      }));

      return withPrescription.map((ex) => ({ ...ex, gifUrl: "" }));
    }

    const remainingAfterSplit = Math.max(0, count - selected.length);
    const primaryCount = Math.min(
      remainingAfterSplit,
      blueprint.primaryCount || Math.ceil(count * 0.6)
    );
    const primary = pickWithExclusions(primaryPool, primaryCount, excludedIds);
    primary.forEach((ex) => excludedIds.add(String(ex.id || "")));
    const remaining = Math.max(0, count - selected.length - primary.length);
    const secondaryPool =
      uniqueFiltered.filter((e) => !primary.some((p) => String(p.id) === String(e.id))) ||
      uniqueFiltered;
    const secondary = pickWithExclusions(
      secondaryPool,
      Math.min(remaining, blueprint.secondaryCount || remaining),
      excludedIds
    );
    secondary.forEach((ex) => excludedIds.add(String(ex.id || "")));
    const restCount = Math.max(
      0,
      count - selected.length - primary.length - secondary.length
    );
    const rest = pickWithExclusions(uniqueFiltered, restCount, excludedIds);
    selected = [...selected, ...primary, ...secondary, ...rest];
  } else {
    selected = pickWithExclusions(uniqueFiltered, count, excludedIds);
  }

  const picked = selected.map((ex) => ({
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
    instanceId: ex.instanceId || `${ex.id || ex.name}-${Math.random().toString(36).slice(2, 8)}`,
    prescription: makePrescription(ex, levelIndex),
  }));

  return withPrescription.map((ex) => ({ ...ex, gifUrl: "" }));
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
  const levelProfile = getLevelProfile(levelIndex);
  const mainCount = levelProfile.dayExerciseCount;

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
      const { pool: templatePool } = filterPoolByTemplate(
        pool,
        template,
        idx
      );
      const blueprint = buildDayBlueprint(template, idx, form.objetivo);
      const dayCount = blueprint.dailyCount || mainCount;
      const exercises = await buildExercises(
        templatePool,
        mode,
        quiet,
        dayCount,
        levelIndex,
        [],
        { blueprint }
      );
      const xp = 50 + levelIndex * 10 + exercises.length * 5;
      return {
        title: `Día ${idx + 1}`,
        mode,
        quiet,
        focus: blueprint.focus || "Objetivo",
        equipmentList: [],
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
  fetchGifMeta,
  fetchGifUrl,
};
