# Tarifas arbitrales FFCV — temporada 2025/26

Fuente: Circular Nº 1 (partidos oficiales de liga, desde 01/07/2025) y Circular Nº 2 (amistosos, desde 01/07/2025), Comité Tècnic d'Àrbitres FFCV. Documentos originales en `C1_2526_TARIFAS_FUTBOL.pdf` / `C2_2526_TARIFAS_FUTBOL_AMISTOSOS.pdf` (no versionados en el repo — son PDFs oficiales del comité, se referencian aquí en la parte que afecta al modelo de datos y al motor de asignación).

Esto es **dato de negocio real**, no supuesto — sustituye cualquier estimación previa de coste en `data-model.md`/`kpis.md`.

## 1. Regla de dieta: término municipal primero, banda de km después

Para todas las categorías de liga oficial:
- **Dentro del término municipal de residencia del árbitro → sin dieta**, siempre, sea cual sea la distancia real dentro del término.
- **Fuera del término municipal → dieta por banda de km**, calculada **entre códigos postales, ida y vuelta** (no línea recta / Haversine). Bandas y horquillas de importe **distintas por grupo de categoría** (Div. Honor Juvenil, 3ª RFEF y "resto de categorías" tienen tres baremos distintos, ver tabla del PDF — no es un único baremo global).
- El importe de la dieta no crece de forma continua con el km: son tramos fijos (ej. resto de categorías: hasta ~150km sin dieta, luego 8€/19€/12€/20€/31€ según tramo — los propios tramos del PDF tienen alguna inconsistencia de redacción que habrá que confirmar con el comité, no asumir el orden tal cual).

**Implicación para el modelo de datos:** el "ahorro por cercanía" que describe el caso de uso (evitar mandar a alguien al otro lado de su propio término) es un ahorro de **bienestar del árbitro**, no de coste para la federación — dentro del término la dieta es cero para cualquier árbitro que se elija, así que no cambia el KPI económico A.3. Hay que separar explícitamente estos dos KPIs en el motor de asignación: **coste federación** (afectado por término + banda de km) vs. **carga del árbitro** (afectada por distancia real, siempre, incluso a coste cero).

## 2. Kilometraje

- **0,26 €/km**, calculado por "el programa de distancias del Comité" — herramienta oficial propia del comité, no un cálculo de línea recta ni de Google Maps. **Cualquier cifra que calculemos nosotros (lat/lon, Haversine, o incluso ruta por carretera de un proveedor externo) es una aproximación**, no la cifra oficial, y así debe etiquetarse en la UI ("estimado").
- Importe mínimo de desplazamiento: **4 €**.
- Exento de retención en su totalidad (a diferencia del recibo de árbitro, que lleva retención mínima del 2% IRPF).
- **En amistosos no se paga kilometraje ni dieta, nunca** (Circular 2). Esto hace que en amistosos el factor de bienestar/cercanía sea el único que importa — el coste federación es siempre cero.

## 3. Recibo base — depende de la categoría del partido, no del árbitro

Tarifa unificada por categoría de competición (import extraído íntegro, ver PDFs para la tabla completa). Ejemplos liga oficial: 3ª RFEF 521€, Lliga Comunitat 405€, Primera FFCV 306€, Segona FFCV 170€, Tercera FFCV 102€, Fútbol-8 35€.

**Regla de ascenso de tarifa:** si un club de categoría inferior a Primera FFCV pide trío arbitral de categoría superior, se factura la tarifa de Primera FFCV (o de Liga Nacional Juvenil Autonómica si es fútbol base/juvenil/femenino/veteranos). **Implicación:** la tarifa aplicada a una `Designacion` puede no coincidir con la categoría nominal del `Partido` — necesita su propio campo, no derivarse solo de `Partido.categoria`.

## 4. Partidos suspendidos y reanudados

No es "todo o nada". El recibo se gradúa según el momento de corte:
- **Suspendido antes del inicio** por causa ajena al árbitro (incomparecencia, meteorología, instalaciones) → se abona desplazamiento (oficiales) / desplazamiento también en amistosos.
- **Suspendido durante la 1ª parte** → un importe intermedio (tabla propia por categoría).
- **Suspendido durante la 2ª parte** → recibo completo.
- **Partido reanudado** en otra fecha → tarifas propias según si se reanuda en 1ª o 2ª parte (tabla propia, distinta de la de suspendidos).

**Implicación:** el `estado` de `Designacion`/`Partido` necesita granularidad real (jugado completo / suspendido-antes / suspendido-1ª / suspendido-2ª / reanudado), no solo "jugado/cancelado", porque cada una factura distinto.

## 5. Gobernanza

"El Comité de Árbitros de la FFCV será quien interprete la aplicación de las dietas, asignaciones por partidos y desplazamientos, posibilitando la reclamación por parte del interesado." — cualquier cifra que Colegial calcule es **orientativa**, el comité tiene la última palabra. Refuerza el principio ya existente en `kpis.md` ("el técnico decide, el sistema informa"): el desglose de coste en la ficha/designación debe leerse como estimación explicable, nunca como la liquidación oficial.

## Ver también
- [data-model.md](./data-model.md) — campos añadidos a `Arbitro`, `Equipo`/sede y `Designacion` a partir de estas reglas
- [kpis.md](./kpis.md) — A.3 (ahorro realizado vs. potencial) debe calcularse con la tarifa de 0,26€/km + bandas de dieta reales, no una cifra inventada
- [decisiones-producto.md](./decisiones-producto.md)
