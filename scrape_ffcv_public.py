#!/usr/bin/env python3
"""
Scraper de la web publica ffcv.es/competiciones (sin login, API JSON publica).

Recorre: competiciones -> grupos -> jornadas -> partidos -> ficha completa de
cada partido (arbitros, tarjetas, goles). Todo HTTP async, sin navegador.

Fase 1 (indice): descubre todos los codacta (partidos) de la temporada.
Fase 2 (detalle): para cada codacta, descarga arbitros/tarjetas/goles.

Genera:
  - partidos_index.csv   (uno por partido: fecha, competicion, grupo, jornada, equipos, resultado, campo, codacta)
  - arbitros_partido.csv (codacta, orden, cod_arbitro, nombre_arbitro, tipo_arbitro)
  - tarjetas_partido.csv (codacta, equipo, cod_jugador, nombre_jugador, minuto, tipo_amonestacion, segunda_amarilla)
  - goles_partido.csv    (codacta, equipo, cod_jugador, nombre_jugador, minuto, tipo_gol)

Reanudable: si se interrumpe, se puede volver a lanzar y salta lo ya hecho.

Uso:
    python scrape_ffcv_public.py --season 21 --concurrency 12
"""

import argparse
import asyncio
import csv
import os
import sys
import time

import httpx

BASE = "https://ffcv.es/competiciones/api"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Referer": "https://ffcv.es/competiciones/index.php",
}

INDEX_FIELDS = [
    "codacta", "temporada", "competicion", "grupo", "jornada", "fecha", "hora",
    "equipo_local", "equipo_visitante", "cod_equipo_local", "cod_equipo_visitante",
    "resultado", "campo", "estado",
]
ARBITROS_FIELDS = ["codacta", "orden", "cod_arbitro", "nombre_arbitro", "tipo_arbitro"]
TARJETAS_FIELDS = ["codacta", "equipo", "cod_jugador", "nombre_jugador", "minuto",
                   "tipo_amonestacion", "segunda_amarilla"]
GOLES_FIELDS = ["codacta", "equipo", "cod_jugador", "nombre_jugador", "minuto", "tipo_gol"]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


class RateLimiter:
    """Limita la tasa GLOBAL de peticiones. Se auto-ajusta a la baja ante 429
    (AIMD: baja multiplicativa al topar el limite, sube poco a poco si va bien)."""

    def __init__(self, rate_per_sec, min_rate=1.0, max_rate=8.0):
        self.rate = rate_per_sec
        self.min_rate = min_rate
        self.max_rate = max_rate
        self._lock = asyncio.Lock()
        self._next_time = 0.0
        self._ok_streak = 0
        self._last_cut = 0.0
        self._cut_cooldown = 6.0  # no volver a bajar el ritmo mas de 1 vez cada 6s

    async def wait(self):
        async with self._lock:
            now = time.monotonic()
            interval = 1.0 / self.rate
            if now < self._next_time:
                await asyncio.sleep(self._next_time - now)
                now = time.monotonic()
            self._next_time = max(now, self._next_time) + interval

    def on_429(self):
        now = time.monotonic()
        if now - self._last_cut < self._cut_cooldown:
            return  # ya bajamos el ritmo hace poco por esta misma rafaga de 429
        self._last_cut = now
        self.rate = max(self.min_rate, self.rate * 0.75)
        self._ok_streak = 0
        log(f"  bajando ritmo a {self.rate:.2f} req/s tras 429")

    def on_ok(self):
        self._ok_streak += 1
        if self._ok_streak >= 40 and self.rate < self.max_rate:
            self.rate = min(self.max_rate, self.rate * 1.15)
            self._ok_streak = 0


RATE_LIMITER = RateLimiter(rate_per_sec=3)


async def get_json(client, url, params, retries=8):
    for attempt in range(retries):
        await RATE_LIMITER.wait()
        try:
            r = await client.get(url, params=params, headers=HEADERS, timeout=20)
            if r.status_code == 429:
                RATE_LIMITER.on_429()
                wait_s = float(r.headers.get("Retry-After", 5 * (attempt + 1)))
                log(f"  429 recibido, esperando {wait_s:.0f}s (intento {attempt + 1}/{retries})")
                await asyncio.sleep(wait_s)
                continue
            r.raise_for_status()
            RATE_LIMITER.on_ok()
            return r.json()
        except Exception as e:
            if attempt == retries - 1:
                log(f"  fallo definitivo GET {url} {params}: {e}")
                return None
            await asyncio.sleep(2 * (attempt + 1))


async def build_index(client, season, index_path):
    done_codacta = set()
    if os.path.exists(index_path):
        with open(index_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                done_codacta.add(row["codacta"])
        log(f"Indice existente con {len(done_codacta)} partidos, se ampliara si faltan.")

    new_file = not os.path.exists(index_path)
    f = open(index_path, "a", newline="", encoding="utf-8")
    writer = csv.DictWriter(f, fieldnames=INDEX_FIELDS)
    if new_file:
        writer.writeheader()

    comp_data = await get_json(client, f"{BASE}/filtros/competiciones_fetch.php", {"temporada": season})
    competiciones = comp_data.get("competiciones", []) if comp_data else []
    log(f"{len(competiciones)} competiciones encontradas.")

    total_partidos = 0
    for ci, comp in enumerate(competiciones, start=1):
        cod_comp = comp["codigo"]
        nombre_comp = comp["nombre"].strip()
        grupos_data = await get_json(client, f"{BASE}/filtros/grupos_fetch.php", {"cod_competicion": cod_comp})
        grupos = grupos_data.get("grupos", []) if grupos_data else []
        log(f"[{ci}/{len(competiciones)}] {nombre_comp}: {len(grupos)} grupos")

        for grupo in grupos:
            cod_grupo = grupo["codigo"]
            nombre_grupo = grupo["nombre"].strip()
            jornadas_data = await get_json(client, f"{BASE}/filtros/jornadas_fetch.php", {"cod_grupo": cod_grupo})
            jornadas = jornadas_data.get("jornadas", []) if jornadas_data else []

            for jornada in jornadas:
                cod_jornada = jornada["codjornada"]
                res = await get_json(client, f"{BASE}/partidos/resultados_por_grupo_jornada_data.php", {
                    "cod_temporada": season, "cod_competicion": cod_comp, "cod_grupo": cod_grupo,
                    "cod_jornada": cod_jornada, "grupo_nombre": nombre_grupo, "competicion_nombre": nombre_comp,
                })
                partidos = res.get("partidos", []) if res else []
                for p in partidos:
                    codacta = p.get("codacta")
                    if not codacta or codacta in done_codacta:
                        continue
                    done_codacta.add(codacta)
                    writer.writerow({
                        "codacta": codacta,
                        "temporada": season,
                        "competicion": nombre_comp,
                        "grupo": nombre_grupo,
                        "jornada": jornada.get("nombre", cod_jornada),
                        "fecha": p.get("fecha", ""),
                        "hora": p.get("hora", ""),
                        "equipo_local": p.get("local", ""),
                        "equipo_visitante": p.get("visitante", ""),
                        "cod_equipo_local": p.get("cod_equipo_local", ""),
                        "cod_equipo_visitante": p.get("cod_equipo_visitante", ""),
                        "resultado": p.get("resultado", ""),
                        "campo": p.get("campo", ""),
                        "estado": p.get("estado", ""),
                    })
                    total_partidos += 1
        f.flush()

    f.close()
    log(f"Indice completo: {len(done_codacta)} partidos totales ({total_partidos} nuevos en esta pasada).")
    return done_codacta


def load_done_detail(path, key="codacta"):
    done = set()
    if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                done.add(row[key])
    return done


async def fetch_detail(client, codacta, sem):
    async with sem:
        return codacta, await get_json(client, f"{BASE}/partidos/full.php", {"cod_partido": codacta})


async def build_details(client, all_codacta, out_dir, concurrency):
    arb_path = os.path.join(out_dir, "arbitros_partido.csv")
    tar_path = os.path.join(out_dir, "tarjetas_partido.csv")
    gol_path = os.path.join(out_dir, "goles_partido.csv")

    done = load_done_detail(arb_path) | load_done_detail(tar_path)
    # un partido sin arbitros ni tarjetas ni goles podria faltar en ambos; usamos un marcador aparte
    marker_path = os.path.join(out_dir, "_procesados.txt")
    processed = set()
    if os.path.exists(marker_path):
        processed = set(open(marker_path, encoding="utf-8").read().split())

    pending = [c for c in all_codacta if c not in processed]
    log(f"{len(pending)} partidos pendientes de detalle (de {len(all_codacta)} totales).")
    if not pending:
        return

    arb_new = not os.path.exists(arb_path)
    tar_new = not os.path.exists(tar_path)
    gol_new = not os.path.exists(gol_path)
    arb_f = open(arb_path, "a", newline="", encoding="utf-8")
    tar_f = open(tar_path, "a", newline="", encoding="utf-8")
    gol_f = open(gol_path, "a", newline="", encoding="utf-8")
    arb_w = csv.DictWriter(arb_f, fieldnames=ARBITROS_FIELDS)
    tar_w = csv.DictWriter(tar_f, fieldnames=TARJETAS_FIELDS)
    gol_w = csv.DictWriter(gol_f, fieldnames=GOLES_FIELDS)
    if arb_new:
        arb_w.writeheader()
    if tar_new:
        tar_w.writeheader()
    if gol_new:
        gol_w.writeheader()
    marker_f = open(marker_path, "a", encoding="utf-8")

    sem = asyncio.Semaphore(concurrency)
    tasks = [asyncio.create_task(fetch_detail(client, c, sem)) for c in pending]

    count = 0
    t0 = time.time()
    for coro in asyncio.as_completed(tasks):
        codacta, data = await coro
        count += 1
        if data and data.get("ficha"):
            ficha = data["ficha"]
            for i, a in enumerate(ficha.get("arbitros_partido", [])):
                arb_w.writerow({
                    "codacta": codacta, "orden": i,
                    "cod_arbitro": a.get("cod_arbitro", ""),
                    "nombre_arbitro": a.get("nombre_arbitro", ""),
                    "tipo_arbitro": a.get("tipo_arbitro", ""),
                })
            for equipo, key in [("local", "tarjetas_equipo_local"), ("visitante", "tarjetas_equipo_visitante")]:
                for t in ficha.get(key, []):
                    tar_w.writerow({
                        "codacta": codacta, "equipo": equipo,
                        "cod_jugador": t.get("codjugador", ""),
                        "nombre_jugador": t.get("nombre_jugador", ""),
                        "minuto": t.get("minuto", ""),
                        "tipo_amonestacion": t.get("codigo_tipo_amonestacion", ""),
                        "segunda_amarilla": t.get("segunda_amarilla", ""),
                    })
            for equipo, key in [("local", "goles_equipo_local"), ("visitante", "goles_equipo_visitante")]:
                for g in ficha.get(key, []):
                    gol_w.writerow({
                        "codacta": codacta, "equipo": equipo,
                        "cod_jugador": g.get("codjugador", ""),
                        "nombre_jugador": g.get("nombre_jugador", ""),
                        "minuto": g.get("minuto", ""),
                        "tipo_gol": g.get("tipo_gol", ""),
                    })
        marker_f.write(codacta + "\n")

        if count % 200 == 0:
            arb_f.flush(); tar_f.flush(); gol_f.flush(); marker_f.flush()
            elapsed = time.time() - t0
            rate = count / elapsed if elapsed else 0
            remaining = (len(pending) - count) / rate if rate else float("inf")
            log(f"  {count}/{len(pending)} partidos procesados ({rate:.1f}/s, ~{remaining/60:.1f} min restantes)")

    arb_f.flush(); tar_f.flush(); gol_f.flush(); marker_f.flush()
    arb_f.close(); tar_f.close(); gol_f.close(); marker_f.close()
    log(f"Detalle completo: {count} partidos procesados en esta pasada.")


async def main(season, concurrency, out_dir, skip_index):
    os.makedirs(out_dir, exist_ok=True)
    index_path = os.path.join(out_dir, "partidos_index.csv")

    limits = httpx.Limits(max_connections=concurrency * 2, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(limits=limits) as client:
        if skip_index and os.path.exists(index_path):
            all_codacta = set()
            with open(index_path, newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    all_codacta.add(row["codacta"])
            log(f"Saltando reconstruccion de indice, usando {len(all_codacta)} partidos ya indexados.")
        else:
            all_codacta = await build_index(client, season, index_path)
        await build_details(client, all_codacta, out_dir, concurrency)

    log("TERMINADO.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--season", default="21", help="Codigo de temporada (21 = 2025-2026)")
    parser.add_argument("--concurrency", type=int, default=12, help="Peticiones concurrentes")
    parser.add_argument("--skip-index", action="store_true", help="No reconstruir el indice, usar el existente tal cual")
    parser.add_argument("--out-dir", default="ffcv_public_data", help="Directorio de salida")
    args = parser.parse_args()

    try:
        asyncio.run(main(args.season, args.concurrency, args.out_dir, args.skip_index))
    except KeyboardInterrupt:
        log("Interrumpido. Vuelve a lanzar el mismo comando para continuar donde se quedo.")
        sys.exit(1)
