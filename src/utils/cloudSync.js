import { supabase } from "./supabaseClient";

const PROFILE_LIST_KEY = "fit_profiles";
const ACTIVE_PROFILE_KEY = "fit_active_profile";
const LOCAL_SYNC_KEY = "fit_last_local_change";

function profileKeys(id) {
  return {
    profile: `fit_profile:${id}`,
    plan: `fit_plan:${id}`,
    progress: `fit_progress:${id}`,
    progressDetails: `fit_progress_details:${id}`,
    history: `fit_history:${id}`,
    metricsLog: `fit_metrics_log:${id}`,
    lang: `fit_lang:${id}`,
  };
}

export function buildCloudPayload() {
  const profilesRaw = localStorage.getItem(PROFILE_LIST_KEY);
  const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];
  const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
  const updatedAt =
    localStorage.getItem(LOCAL_SYNC_KEY) || new Date().toISOString();

  const dataByProfile = {};
  profiles.forEach((p) => {
    const keys = profileKeys(p.id);
    dataByProfile[p.id] = {
      profile: localStorage.getItem(keys.profile),
      plan: localStorage.getItem(keys.plan),
      progress: localStorage.getItem(keys.progress),
      progressDetails: localStorage.getItem(keys.progressDetails),
      history: localStorage.getItem(keys.history),
      metricsLog: localStorage.getItem(keys.metricsLog),
      lang: localStorage.getItem(keys.lang),
    };
  });

  return {
    meta: {
      updatedAt,
      version: 1,
    },
    profiles,
    activeProfileId,
    dataByProfile,
  };
}

export function applyCloudPayload(payload) {
  if (!payload) return;
  const { profiles, activeProfileId, dataByProfile } = payload;
  if (Array.isArray(profiles) && profiles.length) {
    localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
  }
  if (activeProfileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }
  if (dataByProfile && typeof dataByProfile === "object") {
    Object.keys(dataByProfile).forEach((id) => {
      const keys = profileKeys(id);
      const block = dataByProfile[id] || {};
      if (block.profile) localStorage.setItem(keys.profile, block.profile);
      if (block.plan) localStorage.setItem(keys.plan, block.plan);
      if (block.progress) localStorage.setItem(keys.progress, block.progress);
      if (block.progressDetails)
        localStorage.setItem(keys.progressDetails, block.progressDetails);
      if (block.history) localStorage.setItem(keys.history, block.history);
      if (block.metricsLog)
        localStorage.setItem(keys.metricsLog, block.metricsLog);
      if (block.lang) localStorage.setItem(keys.lang, block.lang);
    });
  }
}

export async function uploadCloud() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("No hay sesión activa");
  const payload = buildCloudPayload();
  const { data, error } = await supabase
    .from("fit_cloud")
    .upsert({ user_id: userId, payload }, { onConflict: "user_id" })
    .select();
  if (error) throw error;
  return data;
}

export async function downloadCloud() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("fit_cloud")
    .select("payload")
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}
