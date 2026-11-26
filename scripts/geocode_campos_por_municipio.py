#!/usr/bin/env python3
"""
Geocodifica los campos de `ffcv_public_data/partidos_index.csv` a nivel de
MUNICIPIO (no dirección exacta de calle) — sustituye el enfoque de
`geocode_campos.py` (geocodificar por nombre de instalación contra Nominatim,
0,7% de acierto: 7 de 988) por uno indirecto pero mucho más fiable:

  campo -> equipo local que más juega ahí -> club (API pública de ffcv.es,
  sin login) -> localidad/provincia real del club -> geocodificado igual que
  `geocode_localidades.py` (Nominatim, reutilizando `localidades-geo.json`).

Es una aproximación deliberada: la localidad de un club no es la dirección
exacta de cada uno de sus campos (un club puede tener más de una instalación,
o compartir campo con otro club de la misma localidad), pero para la regla de
"dentro del término municipal = sin dieta" (`docs/tarifas.md`) el nivel de
término municipal es justo lo que hace falta — ver decisión en
`docs/decisiones-producto.md`.

Uso:
    python geocode_campos_por_municipio.py
"""
import csv
import json
import os
import re
import ssl
import time
import urllib.parse
import urllib.request

import certifi

FFCV_API = "https://ffcv.es/competiciones/api/clubes/ajax_clubes.php"
FFCV_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Referer": "https://ffcv.es/competiciones/index.php",
}

PARTIDOS_CSV = "ffcv_public_data/partidos_index.csv"
OUT_CSV = "ffcv_public_data/campos_por_municipio.csv"
LOCALIDADES_JSON = "webapp/data/localidades-geo.json"

NOMINATIM_UA = "ColegialCRM-Geocoder/0.2 (uso interno FFCV, contacto: robertocerdangomez@gmail.com)"
CTX = ssl.create_default_context(cafile=certifi.where())

SUFIJO_EQUIPO_RE = re.compile(r"\s*['‘’]\w+['‘’]\s*$")  # ' A ', 'B', etc. al final


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def nombre_base_equipo(nombre):
    """Quita el sufijo de sub-equipo ('A', 'B'...) para buscar el club real."""
    return SUFIJO_EQUIPO_RE.sub("", nombre).strip()


def campos_con_equipo_local_mas_frecuente(path):
    conteo = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            campo = row["campo"].strip()
            equipo = row["equipo_local"].strip()
            if not campo or not equipo:
                continue
            conteo.setdefault(campo, {}).setdefault(equipo, 0)
            conteo[campo][equipo] += 1
    return {campo: max(equipos, key=equipos.get) for campo, equipos in conteo.items()}


def buscar_club(nombre_query, retries=3):
    params = {"nclub": nombre_query, "NPcd_PageLines": 5, "NPcd_Page": 1}
    url = FFCV_API + "?" + urllib.parse.urlencode(params)
    for intento in range(retries):
        try:
            req = urllib.request.Request(url, headers=FFCV_HEADERS)
            with urllib.request.urlopen(req, timeout=10, context=CTX) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data.get("clubes", [])
        except Exception as e:
            if intento == retries - 1:
                log(f"  error definitivo buscando club {nombre_query!r}: {e}")
                return []
            time.sleep(1.5)
    return []


def mejor_coincidencia(clubes, nombre_base):
    if not clubes:
        return None
    objetivo = nombre_base.lower()
    for c in clubes:
        if c["nombre"].strip().lower() == objetivo:
            return c
    return clubes[0]


def cargar_localidades():
    if os.path.exists(LOCALIDADES_JSON):
        with open(LOCALIDADES_JSON, encoding="utf-8") as f:
            data = json.load(f)
        data.pop("_nota", None)
        return data
    return {}


def geocodificar_localidad(localidad, provincia):
    query = f"{localidad}, {provincia}, España" if provincia else f"{localidad}, Comunitat Valenciana, España"
    params = {"q": query, "format": "jsonv2", "addressdetails": 1, "limit": 1, "countrycodes": "es"}
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": NOMINATIM_UA})
        with urllib.request.urlopen(req, timeout=10, context=CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log(f"  error geocodificando {localidad!r}: {e}")
        return None
    if not data:
        return None
    hit = data[0]
    addr = hit.get("address", {})
    municipio = addr.get("city") or addr.get("town") or addr.get("village") or localidad
    return {"lat": float(hit["lat"]), "lon": float(hit["lon"]), "cp": addr.get("postcode", ""), "municipio": municipio}


def main():
    campo_equipo = campos_con_equipo_local_mas_frecuente(PARTIDOS_CSV)
    log(f"{len(campo_equipo)} campos con equipo local de referencia.")

    equipos_unicos = sorted(set(campo_equipo.values()))
    log(f"{len(equipos_unicos)} equipos distintos a resolver contra la API de clubes de ffcv.es.")

    equipo_a_club = {}
    for i, equipo in enumerate(equipos_unicos, start=1):
        base = nombre_base_equipo(equipo)
        clubes = buscar_club(base)
        club = mejor_coincidencia(clubes, base)
        equipo_a_club[equipo] = club
        estado = f"{club['nombre']} -> {club['localidad']} ({club['provincia']})" if club else "sin match"
        log(f"  [{i}/{len(equipos_unicos)}] {equipo!r} (buscado {base!r}): {estado}")
        time.sleep(0.35)

    localidades_geo = cargar_localidades()
    localidades_a_resolver = sorted({
        club["localidad"] for club in equipo_a_club.values() if club and club["localidad"] not in localidades_geo
    })
    log(f"{len(localidades_a_resolver)} localidades nuevas que geocodificar (Nominatim, 1.5s entre peticiones).")

    provincia_por_localidad = {
        club["localidad"]: club["provincia"] for club in equipo_a_club.values() if club
    }
    for i, localidad in enumerate(localidades_a_resolver, start=1):
        geo = geocodificar_localidad(localidad, provincia_por_localidad.get(localidad, ""))
        if geo:
            localidades_geo[localidad] = geo
            log(f"  [{i}/{len(localidades_a_resolver)}] {localidad} -> municipio={geo['municipio']}")
        else:
            log(f"  [{i}/{len(localidades_a_resolver)}] {localidad} -> no encontrado")
        time.sleep(1.5)

    localidades_geo["_nota"] = (
        "lat/lon y municipio vienen de Nominatim. `municipio` es el término municipal real "
        "resuelto (relevante para la regla de dieta de tarifas.md), puede diferir del nombre "
        "buscado si es un barrio (ej. Torrefiel -> municipio Valencia). Ampliado por "
        "geocode_campos_por_municipio.py con localidades de clubes, no solo de árbitros."
    )
    with open(LOCALIDADES_JSON, "w", encoding="utf-8") as f:
        json.dump(localidades_geo, f, ensure_ascii=False, indent=2)

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "campo", "equipo_local_referencia", "club_coincidencia", "localidad", "provincia",
            "lat", "lon", "encontrado",
        ])
        writer.writeheader()
        encontrados = 0
        for campo, equipo in sorted(campo_equipo.items()):
            club = equipo_a_club.get(equipo)
            if club:
                geo = localidades_geo.get(club["localidad"], {})
                writer.writerow({
                    "campo": campo,
                    "equipo_local_referencia": equipo,
                    "club_coincidencia": club["nombre"],
                    "localidad": club["localidad"],
                    "provincia": club["provincia"],
                    "lat": geo.get("lat", ""),
                    "lon": geo.get("lon", ""),
                    "encontrado": "si" if geo.get("lat") else "localidad_sin_geocodificar",
                })
                if geo.get("lat"):
                    encontrados += 1
            else:
                writer.writerow({
                    "campo": campo, "equipo_local_referencia": equipo, "club_coincidencia": "",
                    "localidad": "", "provincia": "", "lat": "", "lon": "", "encontrado": "no",
                })

    log(f"Terminado. {encontrados}/{len(campo_equipo)} campos con municipio geocodificado en {OUT_CSV}.")


if __name__ == "__main__":
    main()
