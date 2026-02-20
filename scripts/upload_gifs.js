/* global process */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const GIF_DIR = process.env.GIF_DIR || "";
const BUCKET = process.env.SUPABASE_GIF_BUCKET || "gifs";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

if (!GIF_DIR) {
  console.error("Falta GIF_DIR (ruta a la carpeta con gifs)");
  process.exit(1);
}

if (!fs.existsSync(GIF_DIR)) {
  console.error("La carpeta no existe:", GIF_DIR);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const files = fs
  .readdirSync(GIF_DIR)
  .filter((f) => f.toLowerCase().endsWith(".gif"));

console.log(`Subiendo ${files.length} gifs desde ${GIF_DIR} al bucket ${BUCKET}...`);

let ok = 0;
let failed = 0;

for (const file of files) {
  const filePath = path.join(GIF_DIR, file);
  const content = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(file, content, {
      contentType: "image/gif",
      upsert: true,
      cacheControl: "public, max-age=31536000",
    });

  if (error) {
    failed += 1;
    console.error("Error subiendo", file, error.message);
  } else {
    ok += 1;
    if (ok % 50 === 0) {
      console.log(`Subidos: ${ok} / ${files.length}`);
    }
  }
}

console.log(`Listo. Subidos: ${ok}. Fallidos: ${failed}.`);
