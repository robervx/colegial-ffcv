#!/usr/bin/env python3
"""
Genera los "ciclos de asignación" (jornadas) pendientes para el motor de
designación por lote: partidos de ejemplo agrupados por fin de semana,
con equipos y localidades reales, categoría y algunos marcados como
"sensibles" (derbi/conflictividad) para forzar revisión humana.

Modela la cadencia acordada 22 jul 2026:
- Arranque: se asignan las 2 primeras jornadas (findes) de golpe.
- Régimen normal: cada lunes se asigna el fin de semana que empieza la
  semana siguiente (una semana de antelación para que el árbitro se organice).

Salida: webapp/data/ciclos-asignacion.json
"""
import json
import random
import pandas as pd

random.seed(7)

LADDER = ["Tercera Federación", "Lliga Comunitat", "Primera FFCV", "Segona FFCV", "Tercera FFCV"]
NIVEL = {"Tercera FFCV": 0, "Segona FFCV": 1, "Primera FFCV": 2, "Lliga Comunitat": 3, "Tercera Federación": 4}

with open("webapp/data/localidades-geo.json", encoding="utf-8") as f:
    geo = json.load(f)
LOCALIDADES = [k for k in geo.keys() if not k.startswith("_")]

MOTIVOS_SENSIBLE = [
    "Derbi local — mismos aficionados, historial de tensión en la grada",
    "Historial de tarjetas elevado entre estos dos equipos",
    "Partido con incidencias graves la última vez que se enfrentaron",
    "Play-off / partido con mucho en juego para ambos equipos",
]

CICLOS = [
    {"id": "c1", "etiqueta": "Fin de semana 26-27 jul 2026 (arranque, jornada 1 de 2)", "finDeSemana": "26-27 jul 2026", "n": 10},
    {"id": "c2", "etiqueta": "Fin de semana 2-3 ago 2026 (arranque, jornada 2 de 2)", "finDeSemana": "2-3 ago 2026", "n": 10},
    {"id": "c3", "etiqueta": "Fin de semana 9-10 ago 2026 (asignado el lunes 3 ago, régimen normal)", "finDeSemana": "9-10 ago 2026", "n": 12},
]

HORAS = ["10:00", "11:00", "12:00", "16:00", "17:00", "18:00", "19:00", "19:30"]
DIAS = ["Sáb", "Dom"]


def main():
    df = pd.read_csv("partidos_2025_2026.csv")
    liga = df[df["Competicion"].isin(LADDER)]

    salida = []
    contador_global = 0
    for ciclo in CICLOS:
        partidos = []
        for i in range(ciclo["n"]):
            cat = random.choices(LADDER, weights=[3, 8, 15, 25, 49])[0]
            pares = liga[liga["Competicion"] == cat][["Equipo_Local", "Equipo_Visitante"]].drop_duplicates()
            if len(pares) == 0:
                continue
            par = pares.sample(1, random_state=contador_global).iloc[0]
            localidad = random.choice(LOCALIDADES)
            dia = random.choice(DIAS)
            hora = random.choice(HORAS)
            sensible = random.random() < 0.18
            contador_global += 1
            partidos.append({
                "id": f"{ciclo['id']}_p{i+1}",
                "equipoLocal": par["Equipo_Local"],
                "equipoVisitante": par["Equipo_Visitante"],
                "localidad": localidad,
                "categoriaMinima": cat,
                "catNivelMinimo": NIVEL[cat],
                "fecha": f"{dia} {ciclo['finDeSemana'].split(' ')[0]} · {hora}",
                "sensible": sensible,
                "motivoSensible": random.choice(MOTIVOS_SENSIBLE) if sensible else None,
            })
        # aseguramos al menos un partido con "CD Buñol" para poder ver el
        # filtro duro por veto en accion (el arbitro id=1 tiene un veto
        # sintetico fijo contra CD Buñol, ver conExtras() en el componente)
        if partidos:
            partidos[0]["equipoLocal"] = "CD Buñol"
        salida.append({**ciclo, "partidos": partidos})

    with open("webapp/data/ciclos-asignacion.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=2)

    for c in salida:
        print(c["id"], "-", len(c["partidos"]), "partidos,", sum(p["sensible"] for p in c["partidos"]), "sensibles")


if __name__ == "__main__":
    main()
