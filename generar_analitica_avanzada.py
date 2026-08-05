#!/usr/bin/env python3
"""
Genera analitica avanzada de EQUIPOS y de calendario a partir de datos REALES
de ffcv_public_data/ (scraping publico ffcv.es/competiciones, temporada 2025-2026).

Sigue las mismas convenciones que generar_dataset_arbitros.py para que ambos
datasets sean coherentes entre si: mismo LADDER de categorias adultas de
futbol-11 sobre la columna `competicion`, y misma clasificacion de tarjetas
(amarilla = tipo_amonestacion "100"; roja = tipo_amonestacion "101" o
segunda_amarilla "1").

Se guardan dos ficheros:

  webapp/data/equipos-reales.json      -> agregado por equipo (categoria adulta
                                           real, PJ/V/E/D, goles, tarjetas,
                                           top goleadores)
  webapp/data/heatmap-intrasemanal.json -> partidos por dia de la semana x
                                           franja horaria, TODAS las categorias
                                           (no solo el LADDER adulto, para tener
                                           mas densidad de datos en el heatmap)

Fuentes usadas:
  ffcv_public_data/partidos_index.csv   -> calendario, resultado, equipos
  ffcv_public_data/tarjetas_partido.csv -> tarjetas por partido y equipo
  ffcv_public_data/goles_partido.csv    -> goles por partido, equipo y jugador

Limitacion conocida (deliberada, ver docstring de la funcion
calcular_top_goleadores): los goles en propia puerta (tipo_gol == "102") se
EXCLUYEN del ranking de goleadores por jugador porque la direccion de
atribucion (¿se suma al marcador de qué equipo?) no esta confirmada en este
CSV de origen. Los goles a nivel de EQUIPO (golesFavor/golesContra), en
cambio, si los incluyen, porque salen del marcador final (`resultado`), no de
la atribucion por jugador -- ahi no hay ambiguedad.
"""
import json
from datetime import datetime

import pandas as pd

LADDER = ["Tercera Federación", "Lliga Comunitat", "Primera FFCV", "Segona FFCV", "Tercera FFCV"]
AMARILLA = "100"
ROJA_DIRECTA = "101"
GOL_JUGADOR = "100"
GOL_PENALTI = "101"
GOL_PROPIA_PUERTA = "102"  # excluido del ranking de goleadores, ver docstring

FRANJAS = [
    "Mañana (8-12h)",
    "Mediodía (12-15h)",
    "Tarde (15-18h)",
    "Tarde-noche (18-21h)",
    "Noche (21h+)",
    "Otra",
]
DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


def franja_de(hora_str):
    """Clasifica una hora 'HH:MM' en una franja fija. None/vacio/formato raro -> 'Otra'."""
    if not isinstance(hora_str, str) or not hora_str.strip():
        return "Otra"
    try:
        h, m = hora_str.strip().split(":")
        h = int(h)
    except (ValueError, TypeError):
        return "Otra"
    if 8 <= h < 12:
        return "Mañana (8-12h)"
    if 12 <= h < 15:
        return "Mediodía (12-15h)"
    if 15 <= h < 18:
        return "Tarde (15-18h)"
    if 18 <= h < 21:
        return "Tarde-noche (18-21h)"
    if h >= 21:
        return "Noche (21h+)"
    return "Otra"  # antes de las 8:00


def parse_resultado(resultado):
    """'X - Y' -> (X, Y) enteros. Cualquier otra cosa (p.ej. '0' cuando no se
    ha jugado o no se registro resultado) -> None."""
    if not isinstance(resultado, str):
        return None
    partes = resultado.split("-")
    if len(partes) != 2:
        return None
    try:
        local = int(partes[0].strip())
        visitante = int(partes[1].strip())
    except ValueError:
        return None
    return local, visitante


def construir_equipos(idx, tar, gol):
    """Agregado por equipo (cod_equipo) sobre las categorias adultas del LADDER."""
    ladder_df = idx[idx["competicion"].isin(LADDER)].copy()

    parsed = ladder_df["resultado"].apply(parse_resultado)
    ladder_df["gl"] = parsed.apply(lambda p: p[0] if p else None)
    ladder_df["gv"] = parsed.apply(lambda p: p[1] if p else None)
    sin_resultado = int(parsed.isna().sum())
    con_resultado = ladder_df[parsed.notna()].copy()

    # -- nombre mas frecuente por cod_equipo (local + visitante) --
    nombres_local = ladder_df[["cod_equipo_local", "equipo_local"]].rename(
        columns={"cod_equipo_local": "cod_equipo", "equipo_local": "nombre"}
    )
    nombres_visit = ladder_df[["cod_equipo_visitante", "equipo_visitante"]].rename(
        columns={"cod_equipo_visitante": "cod_equipo", "equipo_visitante": "nombre"}
    )
    todos_nombres = pd.concat([nombres_local, nombres_visit], ignore_index=True)
    nombre_por_equipo = todos_nombres.groupby("cod_equipo")["nombre"].agg(
        lambda s: s.value_counts().idxmax()
    )

    # -- categoria y grupo mas frecuentes por cod_equipo --
    apariciones_local = ladder_df[["cod_equipo_local", "competicion", "grupo"]].rename(
        columns={"cod_equipo_local": "cod_equipo"}
    )
    apariciones_visit = ladder_df[["cod_equipo_visitante", "competicion", "grupo"]].rename(
        columns={"cod_equipo_visitante": "cod_equipo"}
    )
    todas_apariciones = pd.concat([apariciones_local, apariciones_visit], ignore_index=True)

    cat_counts = todas_apariciones.groupby(["cod_equipo", "competicion"]).size().reset_index(name="n")
    cat_principal = (
        cat_counts.sort_values("n", ascending=False)
        .drop_duplicates("cod_equipo")
        .set_index("cod_equipo")["competicion"]
    )

    grupo_counts = todas_apariciones.groupby(["cod_equipo", "competicion", "grupo"]).size().reset_index(name="n")
    grupo_por_equipo = {}
    for cod_equipo, cat in cat_principal.items():
        sub = grupo_counts[(grupo_counts["cod_equipo"] == cod_equipo) & (grupo_counts["competicion"] == cat)]
        if len(sub):
            grupo_por_equipo[cod_equipo] = sub.sort_values("n", ascending=False).iloc[0]["grupo"]
        else:
            grupo_por_equipo[cod_equipo] = None

    # -- PJ / V / E / D / goles, solo sobre filas con resultado parseable --
    stats = {}
    for _, row in con_resultado.iterrows():
        gl, gv = row["gl"], row["gv"]
        for cod, gf_, gc_, es_local in (
            (row["cod_equipo_local"], gl, gv, True),
            (row["cod_equipo_visitante"], gv, gl, False),
        ):
            s = stats.setdefault(cod, {"pj": 0, "v": 0, "e": 0, "d": 0, "gf": 0, "gc": 0})
            s["pj"] += 1
            s["gf"] += gf_
            s["gc"] += gc_
            if gf_ > gc_:
                s["v"] += 1
            elif gf_ == gc_:
                s["e"] += 1
            else:
                s["d"] += 1

    # -- tarjetas: cruzar tarjetas_partido (codacta+equipo local/visitante) con
    #    partidos_index (codacta -> cod_equipo_local/cod_equipo_visitante) --
    tar_ladder = tar.merge(
        ladder_df[["codacta", "cod_equipo_local", "cod_equipo_visitante"]], on="codacta", how="inner"
    )
    tar_ladder["cod_equipo"] = tar_ladder.apply(
        lambda r: r["cod_equipo_local"] if r["equipo"] == "local" else r["cod_equipo_visitante"], axis=1
    )
    tar_ladder["es_amarilla"] = tar_ladder["tipo_amonestacion"] == AMARILLA
    tar_ladder["es_roja"] = (tar_ladder["tipo_amonestacion"] == ROJA_DIRECTA) | (tar_ladder["segunda_amarilla"] == "1")
    tarjetas_por_equipo = tar_ladder.groupby("cod_equipo")[["es_amarilla", "es_roja"]].sum()

    # -- goleadores: cruzar goles_partido igual, excluyendo propia puerta (102) --
    gol_ladder = gol.merge(
        ladder_df[["codacta", "cod_equipo_local", "cod_equipo_visitante"]], on="codacta", how="inner"
    )
    gol_ladder["cod_equipo"] = gol_ladder.apply(
        lambda r: r["cod_equipo_local"] if r["equipo"] == "local" else r["cod_equipo_visitante"], axis=1
    )
    gol_ladder_validos = gol_ladder[gol_ladder["tipo_gol"].isin([GOL_JUGADOR, GOL_PENALTI])]
    goleadores_por_equipo = (
        gol_ladder_validos.groupby(["cod_equipo", "cod_jugador", "nombre_jugador"])
        .size()
        .reset_index(name="goles")
    )

    equipos = []
    todos_los_cod_equipo = sorted(nombre_por_equipo.index)  # orden determinista (groupby ya ordena por cod_equipo)
    vacio = {"pj": 0, "v": 0, "e": 0, "d": 0, "gf": 0, "gc": 0}
    for cod_equipo in todos_los_cod_equipo:
        s = stats.get(cod_equipo, vacio)
        nombre = nombre_por_equipo.get(cod_equipo, "Desconocido")
        categoria = cat_principal.get(cod_equipo, "Desconocida")
        grupo = grupo_por_equipo.get(cod_equipo)

        am = int(tarjetas_por_equipo.loc[cod_equipo, "es_amarilla"]) if cod_equipo in tarjetas_por_equipo.index else 0
        ro = int(tarjetas_por_equipo.loc[cod_equipo, "es_roja"]) if cod_equipo in tarjetas_por_equipo.index else 0

        top_goles = (
            goleadores_por_equipo[goleadores_por_equipo["cod_equipo"] == cod_equipo]
            .sort_values("goles", ascending=False)
            .head(3)
        )
        top_goleadores = [
            {"nombre": row["nombre_jugador"], "goles": int(row["goles"])}
            for _, row in top_goles.iterrows()
        ]

        equipos.append({
            "id": cod_equipo,
            "nombre": nombre,
            "categoria": categoria,
            "grupo": grupo,
            "partidosJugados": int(s["pj"]),
            "victorias": int(s["v"]),
            "empates": int(s["e"]),
            "derrotas": int(s["d"]),
            "golesFavor": int(s["gf"]),
            "golesContra": int(s["gc"]),
            "amarillas": am,
            "rojas": ro,
            "top_goleadores": top_goleadores,
        })

    equipos.sort(key=lambda e: (-e["partidosJugados"], e["nombre"]))
    return equipos, sin_resultado


def construir_heatmap(idx):
    """Partidos por dia de la semana x franja horaria, TODAS las categorias."""
    df = idx.copy()
    df["fecha_dt"] = pd.to_datetime(df["fecha"], format="%d/%m/%Y", errors="coerce")
    df["dia_semana"] = df["fecha_dt"].apply(lambda d: DIAS[d.weekday()] if pd.notna(d) else None)
    df["franja"] = df["hora"].apply(franja_de)

    total_partidos = len(df)

    conteo = {}
    for dia in DIAS:
        for franja in FRANJAS:
            conteo[(dia, franja)] = 0

    sin_dia_valido = 0
    for _, row in df.iterrows():
        dia = row["dia_semana"]
        if dia is None:
            sin_dia_valido += 1
            continue
        conteo[(dia, row["franja"])] += 1

    celdas = [
        {"dia": dia, "franja": franja, "partidos": conteo[(dia, franja)]}
        for dia in DIAS
        for franja in FRANJAS
    ]

    return celdas, total_partidos, sin_dia_valido


def main():
    idx = pd.read_csv("ffcv_public_data/partidos_index.csv", dtype=str)
    tar = pd.read_csv("ffcv_public_data/tarjetas_partido.csv", dtype=str)
    gol = pd.read_csv("ffcv_public_data/goles_partido.csv", dtype=str)

    hoy_iso = datetime.now().date().isoformat()

    equipos, sin_resultado = construir_equipos(idx, tar, gol)
    salida_equipos = {
        "fuente": "ffcv_public_data/ (scraping público FFCV, temporada 25/26)",
        "generado": hoy_iso,
        "categorias_incluidas": LADDER,
        "nota_limitacion": (
            "goles en propia puerta (tipo_gol=102) excluidos del ranking de "
            "goleadores por ambigüedad de atribución en el CSV de origen; "
            "goles/resultado a nivel de equipo sí los incluye porque vienen "
            "del marcador final, no de la atribución por jugador"
        ),
        "equipos": equipos,
    }
    with open("webapp/data/equipos-reales.json", "w", encoding="utf-8") as f:
        json.dump(salida_equipos, f, ensure_ascii=False, indent=2)

    celdas, total_partidos, sin_dia_valido = construir_heatmap(idx)
    salida_heatmap = {
        "fuente": "ffcv_public_data/partidos_index.csv, todas las categorías, temporada 25/26",
        "generado": hoy_iso,
        "total_partidos": total_partidos,
        "dias": DIAS,
        "franjas": FRANJAS,
        "celdas": celdas,
    }
    with open("webapp/data/heatmap-intrasemanal.json", "w", encoding="utf-8") as f:
        json.dump(salida_heatmap, f, ensure_ascii=False, indent=2)

    # -- resumen para consola --
    suma_celdas = sum(c["partidos"] for c in celdas)
    print(f"equipos: {len(equipos)}")
    print(f"partidos sin resultado parseable (descartados del cálculo de PJ): {sin_resultado}")
    print("top 5 equipos por partidos jugados:")
    for e in equipos[:5]:
        print(f"  {e['nombre']} ({e['categoria']}): {e['partidosJugados']} PJ, "
              f"{e['victorias']}V {e['empates']}E {e['derrotas']}D, "
              f"{e['golesFavor']}-{e['golesContra']}")
    print(f"total_partidos (heatmap, todas las categorías): {total_partidos}")
    print(f"suma de celdas del heatmap: {suma_celdas}")
    print(f"filas sin fecha parseable en el heatmap (agrupadas en ninguna celda de día): {sin_dia_valido}")


if __name__ == "__main__":
    main()
