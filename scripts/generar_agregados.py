#!/usr/bin/env python3
"""
Genera webapp/data/agregados-reales.json (KPIs del Dashboard) a partir de
ffcv_public_data/ (scraping publico ffcv.es/competiciones, categorias adultas
-- la web publica ya excluye futbol base/juvenil, ver docs/decisiones-producto.md
seccion fechada 23 jul 2026).

total_partidos_temporada sigue viniendo de partidos_2025_2026.csv (scraping
intranet, unico origen que cubre TODAS las categorias incl. base) solo como
referencia de contexto -- el resto de metricas usa el dataset publico.
"""
import json

import pandas as pd

AMARILLA = "100"
ROJA_DIRECTA = "101"


def main():
    idx = pd.read_csv("ffcv_public_data/partidos_index.csv", dtype=str)
    arb = pd.read_csv("ffcv_public_data/arbitros_partido.csv", dtype=str)

    total_temporada = sum(1 for _ in open("partidos_2025_2026.csv", encoding="utf-8")) - 1

    principales = arb[arb["orden"] == "0"]
    carga = principales.groupby("cod_arbitro").size()

    con_arbitro = set(principales["codacta"])
    sin_arbitro = idx[~idx["codacta"].isin(con_arbitro)]

    media = carga.mean()
    desv = carga.std()
    cv = desv / media if media else 0

    top_carga = (
        principales.groupby(["cod_arbitro", "nombre_arbitro"]).size()
        .reset_index(name="partidos")
        .sort_values("partidos", ascending=False)
        .head(8)
    )

    distribucion = (
        idx.groupby("competicion").size()
        .reset_index(name="partidos")
        .sort_values("partidos", ascending=False)
        .head(12)
    )

    agregados = {
        "temporada": "2025/26",
        "fuente": "ffcv_public_data/ (scraping publico ffcv.es/competiciones)",
        "nota": "Datos reales de partidos, arbitros designados y tarjetas de categorias adultas (la web publica no incluye futbol base). Informes/evaluaciones siguen siendo sinteticos hasta tener export del comite.",
        "total_partidos_temporada": int(total_temporada),
        "total_partidos_categoria_adulta": int(len(idx)),
        "total_arbitros_activos_adulta": int(carga.shape[0]),
        "total_equipos": int(pd.concat([idx["equipo_local"], idx["equipo_visitante"]]).nunique()),
        "partidos_sin_arbitro_asignado": int(len(sin_arbitro)),
        "equidad_carga": {
            "media_partidos_por_arbitro": round(float(media), 1),
            "desviacion_estandar": round(float(desv), 1),
            "coeficiente_variacion": round(float(cv), 3),
            "max_partidos": int(carga.max()),
            "min_partidos": int(carga.min()),
        },
        "top_carga_arbitros": [
            {"nombre": row["nombre_arbitro"], "partidos": int(row["partidos"])}
            for _, row in top_carga.iterrows()
        ],
        "distribucion_categorias": [
            {"competicion": row["competicion"], "partidos": int(row["partidos"])}
            for _, row in distribucion.iterrows()
        ],
    }

    with open("webapp/data/agregados-reales.json", "w", encoding="utf-8") as f:
        json.dump(agregados, f, ensure_ascii=False, indent=2)

    print(json.dumps({k: v for k, v in agregados.items() if k not in ("top_carga_arbitros", "distribucion_categorias")}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
