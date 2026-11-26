#!/usr/bin/env python3
"""
Geocodifica una lista curada de localidades reales de la Comunitat Valenciana
(municipios + barrios de grandes ciudades, que tienen su propio término
municipal "padre" — ej. Torrefiel/Benicalap -> Valencia) para el motor de
designación. Un único proceso, secuencial, 1.5s entre peticiones — nada debe
correr en paralelo contra Nominatim mientras este script vive (así se rompió
la tanda anterior).

Guarda tanto la localidad de búsqueda como el término municipal real
resuelto (campo `municipio`), que es el que se usa para la regla de
"dentro del término municipal = sin dieta" (ver docs/tarifas.md).
"""
import ssl, certifi, urllib.request, urllib.parse, json, time, os

OUT = "webapp/data/localidades-geo.json"
UA = "ColegialCRM-Geocoder/0.2 (uso interno FFCV, contacto: robertocerdangomez@gmail.com)"
CTX = ssl.create_default_context(cafile=certifi.where())

# municipios reales con volumen alto en partidos_2025_2026.csv, ya confirmados los primeros 9
MUNICIPIOS = [
    "Torrent", "Sagunto", "Alzira", "Paterna", "Xàtiva", "Vila-real", "Burjassot", "Silla", "Valencia",
    "Gandia", "Ontinyent", "Requena", "Cullera", "Alaquàs", "Mislata", "Catarroja", "Manises",
    "Alcoi", "Elda", "Villena", "Orihuela", "Vinaròs", "Borriana", "Almassora", "Xirivella",
    "Picassent", "Aldaia", "Xàbia", "Dénia", "Sueca", "Carcaixent", "Castellón de la Plana", "Alicante", "Elche",
]

# barrios de Valencia capital (mucho volumen de partidos ahí) — el "municipio"
# real que debe resolver es Valencia, aunque la busqueda sea del barrio
BARRIOS_VALENCIA = [
    "Torrefiel, Valencia", "Benicalap, Valencia", "Patraix, Valencia", "Russafa, Valencia",
    "Malilla, Valencia", "Campanar, Valencia", "Nou Moles, Valencia", "Algiros, Valencia",
    "Poblats Maritims, Valencia", "Marxalenes, Valencia", "Orriols, Valencia",
]


def cargar_existente():
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            data = json.load(f)
        data.pop("_nota", None)
        return data
    return {}


def buscar(query):
    params = {"q": query, "format": "jsonv2", "addressdetails": 1, "limit": 1, "countrycodes": "es"}
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=10, context=CTX) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    resultado = cargar_existente()
    pendientes = [(m, f"{m}, Comunitat Valenciana, España") for m in MUNICIPIOS if m not in resultado]
    pendientes += [(b.split(",")[0], f"{b}, España") for b in BARRIOS_VALENCIA if b.split(",")[0] not in resultado]

    print(f"ya en el fichero: {len(resultado)}, pendientes: {len(pendientes)}", flush=True)

    for nombre, query in pendientes:
        try:
            data = buscar(query)
        except Exception as e:
            print(nombre, "-> error", e, flush=True)
            time.sleep(2)
            continue
        if data:
            hit = data[0]
            addr = hit.get("address", {})
            municipio = addr.get("city") or addr.get("town") or addr.get("village") or nombre
            resultado[nombre] = {
                "lat": float(hit["lat"]), "lon": float(hit["lon"]),
                "cp": addr.get("postcode", ""), "municipio": municipio,
            }
            print(f"{nombre} -> municipio={municipio}", flush=True)
        else:
            print(nombre, "-> no encontrado", flush=True)
        time.sleep(1.5)

    resultado["_nota"] = (
        "lat/lon y municipio vienen de Nominatim. `municipio` es el término municipal real "
        "resuelto (relevante para la regla de dieta de tarifas.md), puede diferir del nombre "
        "buscado si es un barrio (ej. Torrefiel -> municipio Valencia)."
    )
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print("hecho.", flush=True)


if __name__ == "__main__":
    main()
