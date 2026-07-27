#!/usr/bin/env node
/**
 * Seed único: vuelca las notas sintéticas ya existentes en
 * data/arbitros-200.json a la tabla real `anotaciones` de Supabase, con
 * fuente: 'sintetico' — ver specs/003-persistencia-real/tasks.md T012 y
 * contracts/anotaciones-repo.md "Seed inicial".
 *
 * Uso: node scripts/seed-anotaciones.mjs   (una sola vez; no es idempotente
 * a propósito — no hay forma barata de detectar "ya sembrado" sin añadir
 * más estado, y ejecutarlo dos veces solo duplicaría notas sintéticas, algo
 * visible e inofensivo, no un dato que se pueda confundir con real).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno.");
  console.error("Ejecuta con: node --env-file=.env.local scripts/seed-anotaciones.mjs");
  process.exit(1);
}
const supabase = createClient(url, key);

function fechaISO(ddmmyy) {
  const [dd, mm, yy] = ddmmyy.split("/");
  return `20${yy}-${mm}-${dd}T12:00:00Z`;
}

const arbitros = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "arbitros-200.json"), "utf-8"));

const filas = arbitros.flatMap((a) =>
  (a.notas ?? []).map((n) => ({
    arbitro_id: a.id,
    etiqueta: n.etiqueta,
    texto: n.texto,
    autor: n.autor,
    fuente: "sintetico",
    creado_en: fechaISO(n.fecha),
  }))
);

console.log(`Insertando ${filas.length} notas sintéticas de ${arbitros.length} árbitros...`);

const { error, count } = await supabase.from("anotaciones").insert(filas, { count: "exact" });
if (error) {
  console.error("Fallo al insertar el seed:", error.message);
  process.exit(1);
}
console.log(`Listo: ${count ?? filas.length} filas insertadas en anotaciones.`);
