#!/usr/bin/env python3
"""
Geolocaliza los campos/sedes únicos de partidos_2025_2026.csv vía Nominatim
(OpenStreetMap). Respeta la política de uso: 1 petición/segundo, User-Agent
identificado. Reanudable: si el CSV de salida ya existe, salta los campos
ya geolocalizados.

Salida: ffcv_public_data/campos_geolocalizados.csv
  campo, query_usada, lat, lon, codigo_postal, municipio, confianza, encontrado
"""
import csv
import os
import sys
import time
import ssl
import urllib.parse
import urllib.request
import json
import certifi

SSL_CTX = ssl.create_default_context(cafile=certifi.where())

IN_CSV = "partidos_2025_2026.csv"
OUT_CSV = "ffcv_public_data/campos_geolocalizados.csv"
USER_AGENT = "ColegialCRM-Geocoder/0.1 (uso interno FFCV, contacto: robertocerdangomez@gmail.com)"
FIELDS = ["campo", "query_usada", "lat", "lon", "codigo_postal", "municipio", "confianza", "encontrado"]


def load_campos():
    import pandas as pd
    df = pd.read_csv(IN_CSV)
    return sorted(df["Campo"].dropna().unique().tolist())


def load_done():
    done = {}
    if os.path.exists(OUT_CSV):
        with open(OUT_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                done[row["campo"]] = row
    return done


def geocode_one(campo):
    query = f"{campo}, Comunitat Valenciana, España"
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 1,
        "countrycodes": "es",
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"campo": campo, "query_usada": query, "lat": "", "lon": "",
                "codigo_postal": "", "municipio": "", "confianza": "", "encontrado": f"error:{e}"}
    if not data:
        return {"campo": campo, "query_usada": query, "lat": "", "lon": "",
                "codigo_postal": "", "municipio": "", "confianza": "", "encontrado": "no"}
    hit = data[0]
    addr = hit.get("address", {})
    municipio = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or ""
    return {
        "campo": campo,
        "query_usada": query,
        "lat": hit.get("lat", ""),
        "lon": hit.get("lon", ""),
        "codigo_postal": addr.get("postcode", ""),
        "municipio": municipio,
        "confianza": hit.get("importance", ""),
        "encontrado": "si",
    }


def main():
    campos = load_campos()
    done = load_done()
    pendientes = [c for c in campos if c not in done]
    print(f"total: {len(campos)}, ya hechos: {len(done)}, pendientes: {len(pendientes)}", flush=True)

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    write_header = not os.path.exists(OUT_CSV)
    with open(OUT_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        if write_header:
            writer.writeheader()
        for i, campo in enumerate(pendientes, 1):
            row = geocode_one(campo)
            writer.writerow(row)
            f.flush()
            if i % 50 == 0 or i == len(pendientes):
                print(f"[{i}/{len(pendientes)}] {campo[:50]} -> {row['encontrado']}", flush=True)
            time.sleep(1.1)  # política Nominatim: máx 1 req/s

    print("hecho.", flush=True)


if __name__ == "__main__":
    main()
