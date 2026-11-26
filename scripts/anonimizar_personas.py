#!/usr/bin/env python3
"""
Sustituye los nombres reales de personas (arbitros y jugadores) en
ffcv_public_data/*.csv por nombres sinteticos, de forma determinista y
estable por ID (cod_arbitro / cod_jugador).

Por que existe: el dato de partidos/tarjetas/goles de ffcv_public_data/ es
real (scraping publico de ffcv.es/competiciones), pero el nombre de una
persona sigue siendo un dato personal aunque la fuente sea publica. El
repositorio es publico, asi que el nombre no se publica aunque el resto de
la estadistica (partidos, tarjetas, goles, equipos) si se mantenga real.

Los IDs (cod_arbitro, cod_jugador) SI se mantienen reales -- son el
identificador estable que usa el resto del pipeline (generar_dataset_arbitros.py,
generar_agregados.py, generar_analitica_avanzada.py), no son en si mismos
un dato identificativo para quien no tiene acceso al sistema origen.

Uso:
    python3 scripts/anonimizar_personas.py

Reescribe en sitio:
    ffcv_public_data/arbitros_partido.csv   (columna nombre_arbitro)
    ffcv_public_data/goles_partido.csv      (columna nombre_jugador)
    ffcv_public_data/tarjetas_partido.csv   (columna nombre_jugador)

Determinista: el mismo cod_arbitro/cod_jugador produce siempre el mismo
nombre sintetico, incluso si se vuelve a lanzar el scraping real y se
relanza este script -- la identidad sintetica de una persona es estable
en el tiempo.
"""
import random

import pandas as pd

APELLIDOS = [
    "García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández",
    "Ruiz", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutiérrez",
    "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Serrano",
    "Blanco", "Suárez", "Molina", "Morales", "Ortega", "Delgado", "Castro",
    "Ortiz", "Rubio", "Marín", "Sanz", "Iglesias", "Núñez", "Medina", "Garrido",
    "Cortés", "Lozano", "Cano", "Prieto", "Méndez", "Calvo", "Gallego", "Vidal",
    "León", "Herrera", "Peña", "Flores", "Cabrera",
]

NOMBRES = [
    "Daniel", "Rafael", "Pablo", "Carlos", "Javier", "Sergio", "Miguel",
    "Alejandro", "David", "Jorge", "Adrián", "Álvaro", "Iván", "Rubén",
    "Óscar", "Víctor", "Raúl", "Diego", "Marcos", "Hugo", "Mario", "Lucas",
    "Gonzalo", "Samuel", "Enrique", "Noé", "Elías", "Ausiàs", "Vicent",
    "Joan", "María", "Laura", "Marta", "Ana", "Lucía", "Paula", "Sara",
    "Elena", "Irene", "Cristina",
]


def nombre_sintetico(codigo, rng_global_seed="colegial-anonimizar-v1"):
    rng = random.Random(f"{rng_global_seed}-{codigo}")
    a1, a2 = rng.sample(APELLIDOS, 2)
    nombre = rng.choice(NOMBRES)
    return f"{a1} {a2}, {nombre}"


def construir_mapeo(df, col_codigo):
    codigos = sorted(df[col_codigo].dropna().unique())
    return {c: nombre_sintetico(c) for c in codigos}


def main():
    arb = pd.read_csv("ffcv_public_data/arbitros_partido.csv", dtype=str)
    mapeo_arbitros = construir_mapeo(arb, "cod_arbitro")
    arb["nombre_arbitro"] = arb["cod_arbitro"].map(mapeo_arbitros)
    arb.to_csv("ffcv_public_data/arbitros_partido.csv", index=False)
    print(f"arbitros_partido.csv: {len(mapeo_arbitros)} arbitros anonimizados")

    mapeo_jugadores = {}
    for fichero in ("goles_partido.csv", "tarjetas_partido.csv"):
        ruta = f"ffcv_public_data/{fichero}"
        df = pd.read_csv(ruta, dtype=str)
        nuevos = construir_mapeo(df, "cod_jugador")
        mapeo_jugadores.update({k: v for k, v in nuevos.items() if k not in mapeo_jugadores})
        df["nombre_jugador"] = df["cod_jugador"].map(lambda c: mapeo_jugadores[c])
        df.to_csv(ruta, index=False)
        print(f"{fichero}: {len(nuevos)} jugadores anonimizados")


if __name__ == "__main__":
    main()
