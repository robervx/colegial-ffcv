#!/usr/bin/env python3
"""
Genera el dataset de trabajo de 200 arbitros: identidad, carga y disciplina
REALES (de ffcv_public_data/, scraping publico ffcv.es/competiciones) + capa
SINTETICA encima (domicilio, contacto, informes, pruebas fisicas/teoricas,
notas — lo que hoy no existe en ningun sitio real, ver docs/decisiones-producto.md).

Cambio respecto a la version anterior (que usaba partidos_2025_2026.csv, el
scraping de la intranet por nombre de arbitro): ahora se usa
ffcv_public_data/{partidos_index,arbitros_partido,tarjetas_partido}.csv,
publico y sin login, con cod_arbitro como ID estable (no nombre en texto) y
tarjetas reales por partido (no inventadas). Ver docs/decisiones-producto.md
seccion fechada 23 jul 2026.

Se guardan tres ficheros, a proposito separados:
  webapp/data/arbitros-reales.json      -> solo lo verificable hoy
  webapp/data/arbitros-sintetico.json   -> solo lo inventado
  webapp/data/arbitros-200.json         -> merge, con _fuente por campo,
                                            en la forma que ya consume la UI

Categorias: taxonomia REAL de la FFCV para futbol 11 masculino (Tercera
Federacion > Lliga Comunitat > Primera FFCV > Segona FFCV > Tercera FFCV).
"""
import json
import random
import unicodedata

import pandas as pd

random.seed(42)

LADDER = ["Tercera Federación", "Lliga Comunitat", "Primera FFCV", "Segona FFCV", "Tercera FFCV"]
AMARILLA = "100"
ROJA_DIRECTA = "101"

with open("webapp/data/localidades-geo.json", encoding="utf-8") as _f:
    _geo = json.load(_f)
LOCALIDADES = [k for k in _geo.keys() if not k.startswith("_")]

APELLIDOS_EMAIL = str.maketrans({" ": "", "'": ""})


def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def iniciales(nombre_apellidos):
    apellidos, nombre = nombre_apellidos.split(",", 1)
    return (nombre.strip()[0] + apellidos.strip()[0]).upper()


def email_de(nombre_apellidos):
    apellidos, nombre = nombre_apellidos.split(",", 1)
    base = strip_accents(f"{nombre.strip().split()[0]}.{apellidos.strip().split()[0]}").lower()
    base = base.translate(APELLIDOS_EMAIL)
    return f"{base}@arbitrosffcv.es"


def telefono_de(rng):
    return f"6{rng.randint(0, 9)}{rng.randint(0, 9)} {rng.randint(100, 999)} {rng.randint(100, 999)}"


def parse_fecha_index(s):
    # "09/05/2026" -> datetime
    return pd.to_datetime(str(s).strip(), format="%d/%m/%Y", errors="coerce")


def cargar_ffcv_publico():
    idx = pd.read_csv("ffcv_public_data/partidos_index.csv", dtype=str)
    arb = pd.read_csv("ffcv_public_data/arbitros_partido.csv", dtype=str)
    tar = pd.read_csv("ffcv_public_data/tarjetas_partido.csv", dtype=str)

    idx["fecha_parsed"] = idx["fecha"].apply(parse_fecha_index)

    principales = arb[arb["orden"] == "0"].copy()
    principales = principales.merge(idx, on="codacta", how="inner")
    principales = principales[principales["competicion"].isin(LADDER)]

    tarjetas_por_partido = tar.groupby("codacta").apply(
        lambda g: pd.Series({
            "amarillas": (g["tipo_amonestacion"] == AMARILLA).sum(),
            "rojas": ((g["tipo_amonestacion"] == ROJA_DIRECTA) | (g["segunda_amarilla"] == "1")).sum(),
        }),
        include_groups=False,
    ).reset_index()

    principales = principales.merge(tarjetas_por_partido, on="codacta", how="left")
    principales[["amarillas", "rojas"]] = principales[["amarillas", "rojas"]].fillna(0).astype(int)
    return principales


def main():
    df = cargar_ffcv_publico()

    nombre_por_arbitro = (
        df.groupby("cod_arbitro")["nombre_arbitro"]
        .agg(lambda s: s.value_counts().idxmax())
    )
    carga = df.groupby("cod_arbitro").size().sort_values(ascending=False)
    cat_principal = (
        df.groupby(["cod_arbitro", "competicion"]).size()
        .reset_index(name="n")
        .sort_values("n", ascending=False)
        .drop_duplicates("cod_arbitro")
        .set_index("cod_arbitro")["competicion"]
    )
    disciplina = df.groupby("cod_arbitro")[["amarillas", "rojas"]].sum()

    n = len(carga)
    top = list(carga.index[: int(n * 0.15)])
    medio = list(carga.index[int(n * 0.15): int(n * 0.6)])
    bajo = list(carga.index[int(n * 0.6):])

    def sample(lst, k):
        return random.sample(lst, min(k, len(lst)))

    seleccion = sample(top, 40) + sample(medio, 110) + sample(bajo, 50)
    seleccion = seleccion[:200]

    reales, sinteticos, merged = [], [], []

    for i, cod_arbitro in enumerate(seleccion, start=1):
        rng = random.Random(f"{cod_arbitro}-{i}")  # determinista por arbitro, no solo por seed global
        nombre = nombre_por_arbitro[cod_arbitro]
        partidos_real = int(carga[cod_arbitro])
        cat = cat_principal.get(cod_arbitro, "Tercera FFCV")
        am_real = int(disciplina.loc[cod_arbitro, "amarillas"])
        ro_real = int(disciplina.loc[cod_arbitro, "rojas"])

        propios = df[df["cod_arbitro"] == cod_arbitro].sort_values("fecha_parsed", ascending=False)
        historial_real = []
        for _, row in propios.head(15).iterrows():
            fecha_dt = row["fecha_parsed"]
            historial_real.append({
                "fecha": fecha_dt.strftime("%d/%m/%y") if pd.notna(fecha_dt) else "?",
                "competicion": row["competicion"],
                "equipoLocal": row["equipo_local"],
                "equipoVisitante": row["equipo_visitante"],
                "resultado": row["resultado"] if pd.notna(row["resultado"]) and row["resultado"] else "s/d",
                "amarillas": int(row["amarillas"]),
                "rojas": int(row["rojas"]),
                "esCategoriaPrincipal": row["competicion"] == cat,
            })

        reales.append({
            "nombre": nombre,
            "cod_arbitro": cod_arbitro,
            "partidos_temporada_25_26_real": partidos_real,
            "categoria_principal_real": cat,
            "amarillas_temporada_25_26_real": am_real,
            "rojas_temporada_25_26_real": ro_real,
            "historial_real": historial_real,
            "fuente": "ffcv_public_data/ (scraping publico ffcv.es/competiciones, temporada 2025-2026)",
        })

        licencia = str(20000 + rng.randint(0, 9999))
        localidad = rng.choice(LOCALIDADES)
        edad = rng.randint(20, 55)
        temporadas = max(1, min(edad - 18, rng.randint(1, 18)))
        indisp = rng.choices([0, 1, 2, 3, 4, 5, 6, 7, 8], weights=[15, 20, 18, 14, 10, 8, 6, 5, 4])[0]

        if temporadas <= 1:
            num_informes = rng.randint(1, 2)
        elif temporadas == 2:
            num_informes = 3
        else:
            num_informes = rng.randint(4, 6)

        base_forma = round(rng.uniform(6.3, 9.2), 1)
        forma = []
        val = base_forma
        for _ in range(6):
            val = max(5.0, min(9.8, val + rng.uniform(-0.4, 0.35)))
            forma.append(round(val, 1))

        fis = round(rng.uniform(6.0, 9.6), 1)
        tec = round(rng.uniform(6.0, 9.2), 1)
        gest = round(rng.uniform(6.0, 9.2), 1)

        # -- contacto (sintetico, ver docs/decisiones-producto.md) --
        telefono = telefono_de(rng)
        email = email_de(nombre)

        # -- ficha fisica: altura fija, peso por evaluacion (no campo unico, ver data-model.md) --
        altura = rng.randint(165, 190)
        peso_base = round(altura * rng.uniform(0.40, 0.46), 1)

        # -- pruebas fisicas y examenes teoricos: 2 por temporada activa, con nota+comentario --
        comentarios_fisica_alta = ["Buena marca en el Yo-Yo, sin observaciones.", "Mejora clara respecto a la convocatoria anterior.", "Cumple sobradamente el mínimo de su categoría."]
        comentarios_fisica_baja = ["Por debajo del mínimo de su categoría, pendiente de repesca.", "Marca justa, se recomienda plan de refuerzo físico.", "Ligero descenso respecto a la convocatoria anterior."]
        comentarios_teorico_alta = ["Examen sólido, sin errores en interpretación de reglas.", "Buen dominio del reglamento, especialmente en fuera de juego."]
        comentarios_teorico_baja = ["Falló varias preguntas de procedimiento disciplinario.", "Convocado a repaso de reglamento antes de la próxima convocatoria."]

        temporadas_con_pruebas = min(temporadas, 3)
        pruebas_fisicas, examenes_teoricos = [], []
        # Pretemporada cae en el año de inicio de la temporada (set), mitad de
        # temporada en el año siguiente (feb) -- p.ej. temporada 2025/26:
        # pretemporada sep-2025, mitad-temporada feb-2026.
        meses_convocatoria = [("09", "Pretemporada", 1), ("02", "Mitad de temporada", 0)]
        for j in range(temporadas_con_pruebas):
            anyo_fin_temporada = 2026 - j
            for mes, etiqueta, offset_anyo_inicio in meses_convocatoria:
                anyo = anyo_fin_temporada - offset_anyo_inicio
                nota_fis = round(rng.uniform(5.5, 9.5), 1)
                peso_conv = round(peso_base + rng.uniform(-1.5, 1.5), 1)
                pruebas_fisicas.append({
                    "fecha": f"{rng.randint(1, 28):02d}/{mes}/{anyo}",
                    "convocatoria": etiqueta,
                    "nota": nota_fis,
                    "peso": peso_conv,
                    "comentario": rng.choice(comentarios_fisica_alta if nota_fis >= 7.5 else comentarios_fisica_baja),
                })
                nota_teo = round(rng.uniform(5.5, 9.8), 1)
                examenes_teoricos.append({
                    "fecha": f"{rng.randint(1, 28):02d}/{mes}/{anyo}",
                    "convocatoria": etiqueta,
                    "nota": nota_teo,
                    "comentario": rng.choice(comentarios_teorico_alta if nota_teo >= 7.5 else comentarios_teorico_baja),
                })
        pruebas_fisicas.sort(key=lambda x: x["fecha"], reverse=True)
        examenes_teoricos.sort(key=lambda x: x["fecha"], reverse=True)

        temporadas_hist = min(temporadas, 3)
        hist = []
        temps_labels = ["2023/24", "2024/25", "2025/26"][-temporadas_hist:]
        for j, temp in enumerate(temps_labels):
            es_actual = temp == "2025/26"
            if es_actual:
                part, am, ro = partidos_real, am_real, ro_real
            else:
                part = max(5, partidos_real + rng.randint(-6, 6))
                am = int(part * rng.uniform(1.6, 3.6))
                ro = max(0, int(am * rng.uniform(0.01, 0.06)))
            media = round(min(9.5, max(5.5, forma[-1] + rng.uniform(-0.5, 0.3))), 1) if es_actual else round(rng.uniform(6.2, 8.8), 1)
            hist.append({"temp": temp, "part": part, "am": am, "ro": ro, "media": media,
                         "fuente_tarjetas": "real" if es_actual else "sintetico"})

        # -- anotaciones: seguimiento del comite + notas especiales de informadores/superiores --
        notas = []
        if rng.random() < 0.35:
            notas.append({
                "fecha": f"{rng.randint(1,28):02d}/0{rng.randint(3,6)}/26",
                "autor": rng.choice(["CTA", "J. Delegado", "Comité"]),
                "etiqueta": "seguimiento",
                "texto": rng.choice([
                    "Seguimiento tras la última jornada, sin incidencias relevantes.",
                    "Buena progresión esta temporada, a valorar para categoría superior.",
                    "Pendiente de confirmar disponibilidad para el tramo final de temporada.",
                ]),
            })
        if rng.random() < 0.30:
            observador = f"Observador {rng.choice(['García', 'Molina', 'Ferrer', 'Aznar'])}"
            notas.append({
                "fecha": f"{rng.randint(1,28):02d}/{rng.choice(['02','03','04','10','11'])}/2{'6' if rng.random()<0.5 else '5'}",
                "autor": observador,
                "etiqueta": rng.choice(["positiva", "mejora"]),
                "texto": rng.choice([
                    "Buena colocación y lectura del fuera de juego durante todo el encuentro.",
                    "Debe mejorar la comunicación con el asistente en jugadas de área.",
                    "Gestionó bien un partido tenso, buena aplicación de la ventaja.",
                    "Se recomienda trabajar la gestión de protestas hacia el banquillo.",
                ]),
            })

        vetos = []
        if rng.random() < 0.08:
            vetos.append({"equipo": "Club sintético FC", "motivo": "Incidente en jornada anterior (dato de ejemplo)"})

        disponible_cat_inferiores = rng.random() < 0.65

        sint = {
            "nombre": nombre, "licencia": licencia, "localidad": localidad, "edad": edad,
            "temporadas": temporadas, "indisp": indisp, "forma": forma, "fis": fis, "tec": tec,
            "gest": gest, "hist": hist, "notas": notas, "vetos": vetos, "numInformes": num_informes,
            "disponibleCategoriasInferiores": disponible_cat_inferiores,
            "telefono": telefono, "email": email, "altura": altura,
            "pruebasFisicas": pruebas_fisicas, "examenesTeoricos": examenes_teoricos,
            "fuente": "sintetico — generado para trabajar UI/motor mientras no hay export real del comite",
        }
        sinteticos.append(sint)

        merged.append({
            "id": i, "n": nombre, "codArbitro": cod_arbitro, "lic": licencia, "cat": cat, "loc": localidad,
            "edad": edad, "temp": temporadas, "foto": iniciales(nombre), "indisp": indisp, "gest": gest,
            "hist": hist, "forma": forma, "fis": fis, "tec": tec, "notas": notas, "vetos": vetos,
            "numInformes": num_informes, "partidosTemporadaReal": partidos_real,
            "amarillasTemporadaReal": am_real, "rojasTemporadaReal": ro_real,
            "disponibleCategoriasInferiores": disponible_cat_inferiores,
            "historialReal": historial_real,
            "telefono": telefono, "email": email, "altura": altura,
            "pruebasFisicas": pruebas_fisicas, "examenesTeoricos": examenes_teoricos,
            "_fuente": {
                "n": "real", "codArbitro": "real", "cat": "real (competicion mas frecuente, ladder futbol-11)",
                "hist_25_26_part": "real", "hist_25_26_am_ro": "real (tarjetas_partido.csv)",
                "historialReal": "real (incl. tarjetas por partido)",
                "resto": "sintetico",
            },
        })

    with open("webapp/data/arbitros-reales.json", "w", encoding="utf-8") as f:
        json.dump(reales, f, ensure_ascii=False, indent=2)
    with open("webapp/data/arbitros-sintetico.json", "w", encoding="utf-8") as f:
        json.dump(sinteticos, f, ensure_ascii=False, indent=2)
    with open("webapp/data/arbitros-200.json", "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"seleccionados: {len(merged)}")
    print("categorias:", pd.Series([m['cat'] for m in merged]).value_counts().to_dict())
    print(f"amarillas reales totales en seleccion: {sum(m['amarillasTemporadaReal'] for m in merged)}")
    print(f"rojas reales totales en seleccion: {sum(m['rojasTemporadaReal'] for m in merged)}")


if __name__ == "__main__":
    main()
