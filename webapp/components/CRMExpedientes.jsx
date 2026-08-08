"use client";
import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  Users, Search, ChevronRight, TrendingUp, TrendingDown, Minus,
  FileText, Calendar, AlertCircle, Lock, Sparkles,
  MessageSquarePlus, Wallet, Bot, Check, AlertTriangle, Send,
  Route, Info, Phone, Mail, Dumbbell, BookOpen,
  MailCheck, UserCog, Trophy, Swords, Goal,
  Gauge, Settings, ChevronsLeft, ChevronsRight, ListChecks,
} from "lucide-react";
import agregadosReales from "../data/agregados-reales.json";
import localidadesGeo from "../data/localidades-geo.json";
import arbitros200 from "../data/arbitros-200.json";
import ciclosAsignacion from "../data/ciclos-asignacion.json";
import equiposRealesData from "../data/equipos-reales.json";
import heatmapIntrasemanalData from "../data/heatmap-intrasemanal.json";
import { asignarJornada } from "../lib/asignarJornada";
import { CATEGORIAS } from "../lib/categorias";
import { conDisponibilidad } from "../lib/disponibilidad";
import { coberturaPorCategoria } from "../lib/coberturaCategoria";
import { obtenerAnotaciones, guardarAnotacion, contarAnotaciones } from "../lib/anotacionesRepo";
import { decidir as decidirDesignacion, conDecisionVigente } from "../lib/designacionesRepo";
import { useVigentesPorCiclo, useVigentesPorCiclos, registrarDecision } from "../lib/designacionesStore";
import {
  obtenerLog as obtenerLogDisponibilidad,
  declararDisponibilidad,
  obtenerVigentesPorCiclo as obtenerVigentesDisponibilidadPorCiclo,
} from "../lib/disponibilidadRepo";
import { calcularPatronImplicacion } from "../lib/patronImplicacion";
import { validarAntelacionFestivo } from "../lib/reglaFestivo";
import {
  registrarDecision as registrarDecisionComite,
  obtenerDecision as obtenerDecisionComite,
  listarDecisiones,
  revisarImpacto,
  derivarEstadoRevision,
  registrarFaseCampana,
  confirmarCorteAscenso,
} from "../lib/decisionesRepo";
import { resolverObjetivoArbitros } from "../lib/resolverObjetivoDecision";
import { construirSnapshot } from "../lib/snapshotArbitro";
import { clasificarCandidatos, calcularCorte } from "../lib/clasificacionAscenso";

/* ================================================================
   COLEGIAL · CRM de expedientes arbitrales — versión 1 ampliada
   v1 activa: expedientes, histórico, semáforo, radar, comentarios.
   v2/v3 como vistas previas bloqueadas (disclaimer visible).
================================================================ */

/* Dirección "Cuarto árbitro" extendida a toda la app (8 ago 2026, ver
   decisiones-producto.md) — antes solo vivía en el Cuadro de Mando (objeto
   DARK, más abajo). `primary` cambia de rol: antes era superficie Y texto a
   la vez (navy, funcionaba porque el resto de la app era clara); ahora un
   fondo oscuro no puede llevar el mismo tono para texto/iconos que para
   superficies sólidas (texto oscuro sobre fondo oscuro sería invisible), así
   que se separan: `primary` = acento claro (texto/iconos/enlaces, la mayoría
   de sus usos), `deep` = superficie estructural oscura (sidebar, botones
   sólidos, la minoría de usos que pintaban fondo). */
const THEMES = {
  ffcv: { nombre: "Federació de Futbol Comunitat Valenciana", corto: "FFCV", siglas: "FFCV",
    primary: "#7fd4ff", deep: "#0d1f16", accent: "#F59B1E", tint: "rgba(127,212,255,.12)", accentTint: "rgba(245,155,30,.14)" },
  fcf: { nombre: "Federació Catalana de Futbol", corto: "FCF", siglas: "FCF",
    primary: "#1B3F94", deep: "#132D6B", accent: "#D8232A", tint: "#ECEFF9", accentTint: "#FBEAEA" },
  rfaf: { nombre: "Real Federación Andaluza de Fútbol", corto: "RFAF", siglas: "RFAF",
    primary: "#0B6B4F", deep: "#07503B", accent: "#F0B323", tint: "#E9F4F0", accentTint: "#FDF4E0" },
};

/* N (neutros) recalibrados a la paleta oscura — mismo objeto, mismos nombres
   de campo, así que todo lo que ya usaba N.card/N.paper/N.ink en cualquier
   página hereda el cambio sin tocar esa página. verde/ambar/rojo alineados
   con los valores ya validados por contraste en VIZ.estado (más abajo) y en
   el Cuadro de Mando — antes eran tonos distintos y más apagados, pensados
   para fondo claro. */
const N = {
  paper: "#0d1f16", card: "#244530", ink: "#f8fbf8", ink70: "#cbdace",
  ink40: "#93ab9b", rule: "rgba(237,247,240,.17)",
  verde: "#34e19b", verdeT: "rgba(52,225,155,.14)", ambar: "#ffc24b", ambarT: "rgba(255,194,75,.14)",
  rojo: "#ff5c5c", rojoT: "rgba(255,92,92,.16)", ta: "#ffc24b", tr: "#ff5c5c",
  /* texto legible sobre ambarT ahora que ese fondo es oscuro-translúcido en vez
     de un ámbar sólido claro — antes N.ambarInk (marrón oscuro, pensado para
     fondo claro, ver BannerV2 y los avisos de "vista previa" repartidos por
     la app). */
  ambarInk: "#F2C879",
};

/* Paleta de dataviz (skill "dataviz"): categórica validada (CVD-safe, orden fijo,
   no ciclar), secuencial azul para magnitud/heatmaps, estados fijos good/warning/
   serious/critical (nunca reutilizados como "serie 4"). Sustituye N.verde/ambar/rojo
   en gráficos e indicadores de estado — mismo criterio en toda la app, 30 jul 2026. */
const VIZ = {
  serie: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  secuencialAzul: ["#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"],
  /* recalibrado para fondo oscuro (8 ago 2026) — mismo significado good/warning/
     serious/critical, más luminancia porque un fondo oscuro exige colores más
     claros para el mismo contraste percibido que sobre blanco (mismos valores
     ya validados en el Cuadro de Mando, antes solo en el objeto DARK local). */
  estado: { good: "#34e19b", goodT: "rgba(52,225,155,.14)", warning: "#ffc24b", warningT: "rgba(255,194,75,.14)", serious: "#ff9466", seriousT: "rgba(255,148,102,.14)", critical: "#ff5c5c", criticalT: "rgba(255,92,92,.16)" },
  /* Paleta pastel-viva (aprobada por Roberto 31 jul 2026, ver decisiones-producto.md) —
     para gráficos donde el color distingue CATEGORÍA (identidad), nunca donde distingue
     ESTADO. El semáforo de riesgo/estado de forma (VIZ.estado) no se toca ni se mezcla
     con esta paleta — son dos lenguajes de color distintos a propósito. */
  pastel: ["#4E9BE0", "#FF8F65", "#2FC3AE", "#9C8CF0", "#F17FB0", "#F2B233", "#52C46B"],
  pastelSoft: ["#E3F1FC", "#FFEEE6", "#E1F9F5", "#EFEBFE", "#FDEBF3", "#FEF3DE", "#E8F8EB"],
};

/* Paleta oscura "Cuarto árbitro" — nació solo para el Cuadro de Mando (4 ago
   2026, docs/decisiones-producto.md §30-32) y se extendió a toda la app el
   8 ago 2026 (N/THEMES ya usan estos mismos tonos arriba). Este objeto DARK
   se queda como está por los componentes bespoke del propio Cuadro de Mando
   (GaugeSemicircular, DarkPanel, DarkStat) que necesitan más matices que los
   4-5 tokens de N — pero ya no es "solo esta página", es la misma paleta que
   N.paper/N.card en el resto de la app. Los 4 colores de estado son la misma
   recalibración de VIZ.estado para fondo oscuro (más luminancia que sobre
   blanco, para el mismo contraste percibido). */
const DARK = {
  pitchDeep: "#0d1f16", pitch: "#17301f", surface: "#244530", surfaceRaised: "#2d5439",
  line06: "rgba(237,247,240,.10)", line12: "rgba(237,247,240,.17)", line16: "rgba(237,247,240,.21)",
  line24: "rgba(237,247,240,.32)", lineStrong: "rgba(237,247,240,.52)",
  ink: "#f8fbf8", ink70: "#cbdace", ink40: "#93ab9b",
  accent: "#7fd4ff", accentDeep: "#3f9fd1", synth: "#e3b34d",
  good: "#34e19b", goodT: "rgba(52,225,155,.14)",
  warning: "#ffc24b", warningT: "rgba(255,194,75,.14)",
  serious: "#ff9466", seriousT: "rgba(255,148,102,.14)",
  critical: "#ff5c5c", criticalT: "rgba(255,92,92,.16)",
};

/* --------- dataset de trabajo: 200 árbitros ---------
   Identidad + carga real de partidos_2025_2026.csv (designaciones públicas FFCV),
   resto (informes, notas, vetos, disponibilidad) sintético hasta tener export
   real del comité. Ver docs/decisiones-producto.md §6 y generar_dataset_arbitros.py.
   gest = gestión de partido, radar; indisp = fines de semana no disponibles. */
const ARBITROS = arbitros200;
/* Equipos reales: generar_analitica_avanzada.py sobre ffcv_public_data/ (25.256 partidos
   reales, categorías adultas), 30 jul 2026 — ver decisiones-producto.md §25. Nada sintético. */
const EQUIPOS = equiposRealesData.equipos;
const HEATMAP_INTRASEMANAL = heatmapIntrasemanalData;

/* --------- semáforo: media móvil 5 + tendencia --------- */
function estadoForma(forma, { ventana = 5, alto = 8.0, bajo = 7.0 } = {}) {
  const ult = forma.slice(-ventana);
  const media = ult.reduce((a, b) => a + b, 0) / ult.length;
  const nX = ult.length;
  const sumX = ult.reduce((a, _, i) => a + i, 0);
  const sumY = ult.reduce((a, b) => a + b, 0);
  const sumXY = ult.reduce((a, b, i) => a + i * b, 0);
  const sumXX = ult.reduce((a, _, i) => a + i * i, 0);
  const pend = (nX * sumXY - sumX * sumY) / (nX * sumXX - sumX * sumX || 1);
  let color, etiqueta;
  if (media >= alto && pend >= -0.05) { color = "verde"; etiqueta = "En forma"; }
  else if (media < bajo || pend <= -0.15) { color = "rojo"; etiqueta = "Necesita seguimiento"; }
  else { color = "ambar"; etiqueta = "Irregular"; }
  return { media, pend, color, etiqueta };
}

/* --------- radar de habilidades: 5 dimensiones del informe --------- */
function radarSkills(a) {
  const ultima = a.hist[a.hist.length - 1];
  const taPj = ultima.am / ultima.part;
  const disciplina = Math.max(4, Math.min(10, 10 - (taPj - 2.5) * 1.6 - ultima.ro * 0.15));
  return [
    { skill: "Físico", v: a.fis },
    { skill: "Técnica", v: a.tec },
    { skill: "Gestión", v: a.gest },
    { skill: "Disciplinaria", v: +disciplina.toFixed(1) },
    { skill: "Informes", v: ultima.media },
  ];
}

const nf = (x) => x.toLocaleString("es-ES");

/* --------- plantillas de email (mailto: — nunca envío automático real, ver docs/decisiones-producto.md) ---------
   El comité revisa y pulsa enviar desde su propio cliente de correo; aquí solo se compone el borrador. */
const PLANTILLAS_EMAIL = {
  comentarioInforme: {
    etiqueta: "Comentar informe",
    asunto: (a) => `Comentario sobre tu último informe · ${a.n.split(",")[0]}`,
    cuerpo: (a) => `Hola ${a.n.split(",")[1]?.trim() || a.n},\n\nQueríamos comentarte algo sobre tu última evaluación (media actual: ${a.hist[a.hist.length - 1].media.toFixed(1)}).\n\n[Escribe aquí el comentario concreto]\n\nUn saludo,\nComité Técnico de Árbitros`,
  },
  felicitacion: {
    etiqueta: "Felicitar",
    asunto: (a) => `Enhorabuena por tu progresión esta temporada · ${a.n.split(",")[0]}`,
    cuerpo: (a) => `Hola ${a.n.split(",")[1]?.trim() || a.n},\n\nQueríamos felicitarte por tu buen rendimiento esta temporada (media actual: ${a.hist[a.hist.length - 1].media.toFixed(1)}, ${a.partidosTemporadaReal} partidos dirigidos). Sigue así.\n\nUn saludo,\nComité Técnico de Árbitros`,
  },
  puntosDeMejora: {
    etiqueta: "Pedir puntos de mejora",
    asunto: (a) => `Puntos a trabajar de cara a los próximos partidos · ${a.n.split(",")[0]}`,
    cuerpo: (a) => `Hola ${a.n.split(",")[1]?.trim() || a.n},\n\nRevisando tus últimos informes nos gustaría comentarte algunos puntos de mejora:\n\n[Escribe aquí los puntos concretos]\n\nQuedamos a tu disposición para hablarlo con más calma.\n\nUn saludo,\nComité Técnico de Árbitros`,
  },
};
function mailtoHref(email, asunto, cuerpo) {
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
const ETIQUETA_NOTA = {
  seguimiento: { label: "Seguimiento", bg: N.paper, fg: N.ink40 },
  positiva: { label: "Positiva", bg: N.verdeT, fg: N.verde },
  mejora: { label: "A mejorar", bg: N.ambarT, fg: N.ambar },
  disciplinaria: { label: "Disciplinaria", bg: N.rojoT, fg: N.rojo },
};

/* specs/002-disponibilidad-arbitro */
const TIPO_DISPONIBILIDAD = {
  disponible: { label: "Disponible" },
  no_disponible: { label: "No disponible" },
  solo_categoria_propia: { label: "Solo categoría propia" },
  festivo_solicitado: { label: "Festivo solicitado" },
};
const MOTIVO_INDISPONIBILIDAD = {
  lesion: { label: "Lesión" },
  baja: { label: "Baja" },
  urgencia: { label: "Urgencia" },
};

/* ------------------------------- piezas ------------------------------- */
function Eyebrow({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: N.ink40 }}>{children}</div>;
}
function Panel({ title, children, right }) {
  return (
    <section className="rounded-md border overflow-hidden" style={{ background: N.card, borderColor: N.rule }}>
      <div className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-2" style={{ borderColor: N.rule, background: "rgba(255,255,255,.03)" }}>
        <Eyebrow>{title}</Eyebrow>{right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function coloresForma(color) {
  return {
    verde: { bg: VIZ.estado.goodT, fg: VIZ.estado.good, dot: VIZ.estado.good },
    ambar: { bg: VIZ.estado.warningT, fg: VIZ.estado.warning, dot: VIZ.estado.warning },
    rojo: { bg: VIZ.estado.criticalT, fg: VIZ.estado.critical, dot: VIZ.estado.critical },
  }[color];
}
function Semaforo({ estado, size = "sm" }) {
  const c = coloresForma(estado.color);
  const Icon = estado.pend > 0.05 ? TrendingUp : estado.pend < -0.05 ? TrendingDown : Minus;
  const dims = size === "lg" ? "text-sm px-3 py-1.5" : "text-[11px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${dims}`} style={{ background: c.bg, color: c.fg }}>
      <span className="rounded-full" style={{ width: size === "lg" ? 9 : 7, height: size === "lg" ? 9 : 7, background: c.dot }} />
      {estado.etiqueta}
      <Icon size={size === "lg" ? 15 : 12} />
    </span>
  );
}
/* coloresCobertura/BadgeCobertura (variante clara) se retiraron el 6 ago 2026 al
   quedar sin uso — su único consumidor era el Cuadro de Mando, que ahora pinta su
   propia píldora de estado con la paleta oscura DARK.* (ver Dashboard() más abajo).
   Si otra página necesita el badge de cobertura en claro, reconstruirlo desde
   coloresForma()/Semaforo (mismo patrón) en vez de revivir esta versión sin uso. */
function Avatar({ txt, T, size = 40 }) {
  return (
    <div className="rounded-full flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, background: T.tint, color: T.primary, fontSize: size * 0.36 }}>{txt}</div>
  );
}
/* Logo real de la FFCV (docs/assets/logo.png -> public/logo-ffcv.png). Fallback a
   siglas sobre accent si algun dia hay mas de un tenant sin logo subido (single-tenant
   FFCV hoy, ver docs/decisiones-producto.md §1). */
function Escudo({ T, size = 38, logoSrc = "/logo-ffcv.png" }) {
  if (logoSrc) {
    return (
      <div className="rounded flex items-center justify-center shrink-0 overflow-hidden bg-white"
        style={{ width: size, height: size, padding: size * 0.08 }}>
        <Image src={logoSrc} alt={`Escudo ${T.corto}`} width={size} height={size} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="rounded flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, background: T.accent, color: T.deep, fontSize: size * 0.26 }}>{T.siglas}</div>
  );
}
function totales(a) {
  return a.hist.reduce((acc, h) => ({ part: acc.part + h.part, am: acc.am + h.am, ro: acc.ro + h.ro }), { part: 0, am: 0, ro: 0 });
}
/* banner de vista previa para funciones futuras */
function BannerV2({ T, version = "Versión 2", texto }) {
  return (
    <div className="rounded-md border-2 border-dashed p-4 flex items-start gap-3 mb-5" style={{ borderColor: T.accent, background: T.accentTint }}>
      <Lock size={18} className="mt-0.5 shrink-0" style={{ color: N.ambar }} />
      <div>
        <div className="text-sm font-semibold" style={{ color: N.ambarInk }}>Vista previa · {version}</div>
        <p className="text-xs mt-0.5" style={{ color: N.ambarInk }}>
          {texto || "Esta función no está activa en la versión inicial. Antes hay que poblar la base de datos de expedientes: todo lo que ves aquí se construye sobre ella."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- dashboard ------------------------------- */
/* chip (índice opcional): color de identidad (VIZ.pastel) para el icono cuando el KPI
   no representa un estado — nunca se usa a la vez que `tone`. `tone` (semáforo real/
   estado de forma/riesgo) siempre gana: un KPI de estado no lleva un color de marca
   encima, llevaría dos lenguajes de color a la vez y confundiría cuál es cuál. */
function KpiCard({ eyebrow, valor, sub, T, tone, chip, icon: Icon }) {
  const col = tone === "warn" ? VIZ.estado.warning : tone === "bad" ? VIZ.estado.critical : T.primary;
  const iconColor = tone === "warn" ? VIZ.estado.warning : tone === "bad" ? VIZ.estado.critical
    : chip != null ? VIZ.pastel[chip % VIZ.pastel.length] : N.ink40;
  const chipBg = tone === "warn" ? VIZ.estado.warningT : tone === "bad" ? VIZ.estado.criticalT
    : chip != null ? VIZ.pastelSoft[chip % VIZ.pastelSoft.length] : "transparent";
  return (
    <div className="rounded-md border p-4" style={{ background: N.card, borderColor: N.rule }}>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        {Icon && (
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: chipBg }}>
            <Icon size={13} style={{ color: iconColor }} />
          </div>
        )}
      </div>
      <div className="font-mono text-3xl" style={{ color: col }}>{valor}</div>
      {sub && <div className="text-xs mt-1" style={{ color: N.ink70 }}>{sub}</div>}
    </div>
  );
}

/* Heatmap intrasemanal: dataviz skill — magnitud = secuencial, un solo hue (azul),
   claro→oscuro, con etiqueta directa en cada celda (rejilla pequeña, 7×6) y leyenda
   de escala. Dato real: generar_analitica_avanzada.py sobre los 25.256 partidos de
   ffcv_public_data/ (30 jul 2026). */
/* compacto=true: días en columnas (abreviados a 1 letra) y franjas en filas —
   cabe en una sola columna del grid del Cuadro de Mando (Roberto, 30 jul 2026)
   en vez de las 6 columnas anchas de la versión completa. Mismo dato, mismo
   componente, solo cambia la orientación de la rejilla. */
function HeatmapIntrasemanal({ data, compacto = false, dark = false }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.celdas.map((c) => c.partidos));
  const franjaCorta = (f) => f.replace(/\s*\(.*\)/, "");
  const diaCorto = (d) => d.slice(0, 1);
  /* variante oscura solo para el Cuadro de Mando (dark=true) — el resto de
     usos de este componente (si los hubiera en el futuro) siguen claros por
     defecto, no se toca el comportamiento existente. */
  const colTexto = dark ? DARK.ink40 : N.ink40;
  const colTextoFuerte = dark ? DARK.ink70 : N.ink70;
  const colorPara = (v) => {
    if (v === 0) return dark ? DARK.surface : N.paper;
    const idx = Math.min(VIZ.secuencialAzul.length - 1, Math.floor((v / max) * VIZ.secuencialAzul.length));
    return VIZ.secuencialAzul[idx];
  };
  const filas = compacto ? data.franjas : data.dias;
  const columnas = compacto ? data.dias : data.franjas;
  const valorDe = (fila, col) => {
    const [dia, franja] = compacto ? [col, fila] : [fila, col];
    return data.celdas.find((c) => c.dia === dia && c.franja === franja)?.partidos ?? 0;
  };
  const etiquetaHover = (fila, col) => compacto ? { dia: col, franja: fila } : { dia: fila, franja: col };
  const cellW = compacto ? 30 : 58;
  const cellH = compacto ? 24 : 34;

  return (
    <div>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "separate", borderSpacing: 3 }}>
          <thead>
            <tr>
              <th></th>
              {columnas.map((c) => (
                <th key={c} className="text-[9px] font-medium px-1 pb-1 whitespace-nowrap" style={{ color: colTexto }}>
                  {compacto ? diaCorto(c) : franjaCorta(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila}>
                <td className="text-[10px] pr-2 text-right whitespace-nowrap" style={{ color: colTextoFuerte }}>
                  {compacto ? franjaCorta(fila) : fila}
                </td>
                {columnas.map((col) => {
                  const v = valorDe(fila, col);
                  const claro = v / max > 0.55;
                  return (
                    <td key={col} onMouseEnter={() => setHover(etiquetaHover(fila, col))} onMouseLeave={() => setHover(null)}
                      className="rounded text-center align-middle cursor-default" style={{ width: cellW, height: cellH, background: colorPara(v) }}>
                      <span className="text-[10px] font-mono tabular-nums" style={{ color: claro ? "#FFF" : colTextoFuerte }}>{v}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`flex ${compacto ? "flex-col items-start" : "items-center justify-between"} mt-3 flex-wrap gap-2`}>
        <div className="text-xs" style={{ color: colTextoFuerte }}>
          {hover ? <><b>{hover.dia}</b> · {hover.franja}: <span className="font-mono">{hover.v}</span> partidos</> : "Pasa el ratón por una celda para ver el detalle"}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: colTexto }}>menos</span>
          {VIZ.secuencialAzul.map((c, i) => <span key={i} className="rounded-sm" style={{ width: 14, height: 8, background: c }} />)}
          <span className="text-[10px]" style={{ color: colTexto }}>más</span>
        </div>
      </div>
    </div>
  );
}

/* ---- dial semicircular de escala fija (spec 001 §30/FR-010-012) ----
   Un anillo cerrado sin escala fija hace mala comparación de segmentos
   reñidos (el ojo compara mal ángulos/áreas sin ancla externa); el dial
   semicircular con marcas 0/mitad/escala da una regla de referencia fija,
   igual que un gráfico de barras vence a uno circular con valores reñidos.
   Todo el texto (número hero, dos líneas de contexto, marcas de escala) vive
   DENTRO del propio <svg>, en las mismas coordenadas polares que el arco —
   nunca superpuesto con márgenes CSS calculados sin poder verlos renderizados
   (lección de la ronda de revisión visual, decisiones-producto.md §32). */
function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function arcoDial(cx, cy, r, a0, a1) {
  const p0 = polarPoint(cx, cy, r, a0);
  const p1 = polarPoint(cx, cy, r, a1);
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`;
}
function GaugeSemicircular({ segments, scale = 200, heroValue, heroColor, heroMain, heroSubTag, heroSubTagColor, heroSub }) {
  const cx = 170, cy = 196, r = 140, sw = 26, gap = 1.6;
  const angleFor = (v) => 180 - (v / scale) * 180;
  /* sumas acumuladas calculadas de forma declarativa (sin reasignar ninguna
     variable durante el render) — el propio Next.js de este proyecto lo exige
     como error de lint, no aviso, ver webapp/AGENTS.md. */
  const totalesAcumulados = segments.map((_, i) => segments.slice(0, i + 1).reduce((s, x) => s + x.value, 0));
  const arcos = segments.map((seg, i) => {
    const v0 = i === 0 ? 0 : totalesAcumulados[i - 1];
    const v1 = totalesAcumulados[i];
    const a0 = angleFor(v0) - (v0 > 0 ? gap / 2 : 0);
    const a1 = angleFor(v1) + (v1 < scale ? gap / 2 : 0);
    return { d: arcoDial(cx, cy, r, a0, a1), color: seg.color, key: seg.key };
  });
  const ticks = [0, scale / 2, scale].map((v) => {
    const rad = (angleFor(v) * Math.PI) / 180;
    const pInner = { x: cx + (r + sw / 2 + 2) * Math.cos(rad), y: cy - (r + sw / 2 + 2) * Math.sin(rad) };
    const pOuter = { x: cx + (r + sw / 2 + 8) * Math.cos(rad), y: cy - (r + sw / 2 + 8) * Math.sin(rad) };
    const pLabel = { x: cx + (r + sw / 2 + 13) * Math.cos(rad), y: cy - (r + sw / 2 + 13) * Math.sin(rad) };
    const anchor = v === 0 ? "end" : v === scale ? "start" : "middle";
    return { v, pInner, pOuter, pLabel, anchor };
  });

  return (
    <svg viewBox="0 0 340 210" style={{ width: "100%", maxWidth: 300, display: "block", margin: "0 auto", overflow: "visible" }}>
      <path d={arcoDial(cx, cy, r, 180, 0)} fill="none" stroke="rgba(237,247,240,.07)" strokeWidth={sw} />
      {arcos.map((a) => (
        <path key={a.key} d={a.d} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round" />
      ))}
      {ticks.map((t) => (
        <React.Fragment key={t.v}>
          <line x1={t.pInner.x} y1={t.pInner.y} x2={t.pOuter.x} y2={t.pOuter.y} stroke="rgba(244,248,245,.4)" strokeWidth="1.5" />
          <text x={t.pLabel.x} y={t.pLabel.y} textAnchor={t.anchor} dominantBaseline="middle" fill="rgba(244,248,245,.55)" fontSize="13" fontFamily="var(--font-geist-mono), monospace">{t.v}</text>
        </React.Fragment>
      ))}
      {heroValue !== undefined && (
        <>
          <text x={cx} y={136} textAnchor="middle" fontWeight="700" fontSize="52" fill={heroColor || "#f8fbf8"}
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Narrow', sans-serif", filter: `drop-shadow(0 0 6px ${heroColor || "#f8fbf8"}77)` }}>
            {heroValue}
          </text>
          {heroMain && <text x={cx} y={161} textAnchor="middle" fontSize="15" fill="#cbdace">{heroMain}</text>}
          {heroSub && (
            <text x={cx} y={183} textAnchor="middle" fontSize="12" fill="#93ab9b">
              {heroSubTag && <tspan fill={heroSubTagColor || "#93ab9b"} fontWeight="700">{heroSubTag} · </tspan>}
              {heroSub}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

/* ---- piezas oscuras SOLO para el Cuadro de Mando — no se exportan ni se
   usan en ninguna otra página, para no afectar al resto de la app. ---- */
function DarkPanel({ title, sub, right, children, accent }) {
  return (
    <section style={{ background: DARK.surface, borderTop: `2px solid ${accent || DARK.line24}` }}>
      <div className="flex items-start justify-between gap-2.5 px-5 py-4 flex-wrap">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: DARK.ink }}>{title}</div>
          {sub && <div className="text-[11.5px] mt-0.5" style={{ color: DARK.ink40 }}>{sub}</div>}
        </div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}
function DarkTag({ real }) {
  return (
    <span className="text-[11.5px] font-semibold inline-flex items-center gap-1" style={{ color: real ? DARK.accent : DARK.synth }}>
      <span className="rounded-full" style={{ width: 6, height: 6, background: real ? DARK.accent : DARK.synth }} />
      {real ? "real" : "sintético"}
    </span>
  );
}
function DarkStat({ eyebrow, valor, sub, valorColor }) {
  return (
    <div>
      <div className="text-[11.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: DARK.ink40 }}>{eyebrow}</div>
      <div className="font-mono text-[28px] font-semibold leading-none mt-1" style={{ color: valorColor || DARK.ink }}>{valor}</div>
      {sub && <div className="text-[12.5px] mt-1.5 leading-snug" style={{ color: DARK.ink40 }}>{sub}</div>}
    </div>
  );
}

/* Sin T: esta página adopta siempre la paleta oscura DARK.* (dirección "Cuarto
   árbitro", decisiones-producto.md §30-32) — no depende del tenant/tema como el
   resto de la app. */
function Dashboard({ irArbitros }) {
  const cv = agregadosReales.equidad_carga.coeficiente_variacion;
  const cvTono = cv >= 0.8 ? "bad" : cv >= 0.5 ? "warn" : "ok";
  const cvTexto = cv >= 0.8 ? "muy desigual" : cv >= 0.5 ? "desigual" : "equilibrada";

  const cicloActivo = ciclosAsignacion[0];
  const [vigentesDisponibilidad, setVigentesDisponibilidad] = useState(null);
  const [disponibilidadEstado, setDisponibilidadEstado] = useState("cargando"); // cargando | listo | error

  useEffect(() => {
    let cancelado = false;
    obtenerVigentesDisponibilidadPorCiclo(cicloActivo.id).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setVigentesDisponibilidad(resultado.vigentesPorArbitro);
        setDisponibilidadEstado("listo");
      } else {
        setDisponibilidadEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [cicloActivo.id]);

  const cobertura = useMemo(
    () => coberturaPorCategoria(ARBITROS, cicloActivo, disponibilidadEstado === "listo" ? vigentesDisponibilidad : null),
    [cicloActivo, vigentesDisponibilidad, disponibilidadEstado]
  );
  const categoriasConPartidos = cobertura.porCategoria.filter((c) => c.partidosADesignar > 0);
  const categoriasEnRiesgo = categoriasConPartidos.filter((c) => c.estado === "riesgo");

  /* Partidos de la jornada activa, por categoría — todas desplegadas a la vez
     (Roberto, 30 jul 2026: "una tabla o gráfico chulo, por categoría todo
     desplegado"), sustituye el selector que colapsaba a un único número. */
  const partidosJornadaPorCategoria = useMemo(() => {
    const acc = {};
    for (const p of cicloActivo.partidos) acc[p.categoriaMinima] = (acc[p.categoriaMinima] || 0) + 1;
    return Object.entries(acc).map(([categoria, partidos]) => ({ categoria, partidos })).sort((a, b) => b.partidos - a.partidos);
  }, [cicloActivo]);

  const alertasForma = useMemo(() => {
    const todas = ARBITROS.map((a) => ({ a, est: estadoForma(a.forma) })).filter((x) => x.est.color !== "verde");
    const peso = { rojo: 0, ambar: 1 };
    return todas.sort((x, y) => peso[x.est.color] - peso[y.est.color]).slice(0, 6);
  }, []);

  /* Distribución de estado de forma sobre los 200 expedientes de trabajo —
     base de "ratio de irregulares"/"ratio en seguimiento". Umbrales de
     estadoForma() (alto=8.0, bajo=7.0) son un punto de partida propio, no
     validado con el comité — ver Glosario y gobernanza. */
  const formaCounts = useMemo(() => {
    const acc = { verde: 0, ambar: 0, rojo: 0 };
    for (const a of ARBITROS) acc[estadoForma(a.forma).color]++;
    return acc;
  }, []);
  const totalAlertas = formaCounts.ambar + formaCounts.rojo;

  /* Árbitros de baja este ciclo, por motivo declarado — dato real (declaraciones_disponibilidad,
     specs/002-disponibilidad-arbitro), no un cálculo aparte del ya usado en Cobertura por categoría. */
  const bajasPorMotivo = useMemo(() => {
    if (disponibilidadEstado !== "listo" || !vigentesDisponibilidad) return null;
    const acc = { lesion: 0, baja: 0, urgencia: 0, festivo: 0, total: 0 };
    for (const decl of vigentesDisponibilidad.values()) {
      if (decl?.tipo === "no_disponible") {
        acc.total++;
        if (decl.motivo in acc) acc[decl.motivo]++;
      } else if (decl?.tipo === "festivo_solicitado") {
        acc.total++;
        acc.festivo++;
      }
    }
    return acc;
  }, [vigentesDisponibilidad, disponibilidadEstado]);
  const disponiblesEsteCiclo = bajasPorMotivo ? ARBITROS.length - bajasPorMotivo.total : null;

  /* Ratio de informes por árbitro — media simple sobre numInformes (real, acumulado
     de temporada, no hay desglose por jornada todavía). */
  const informesStats = useMemo(() => {
    const nums = ARBITROS.map((a) => a.numInformes || 0);
    return { media: nums.reduce((a, b) => a + b, 0) / nums.length, min: Math.min(...nums), max: Math.max(...nums), total: nums.reduce((a, b) => a + b, 0) };
  }, []);

  /* "Ratio de valoraciones" — interpretado como cuántos árbitros tienen ya
     score B.1 fiable según las bandas de shrinkage bayesiano de kpis.md
     (4+ informes = 100% propio; 3 = 70/30; 0-2 = 50/50, poco fiable), no
     "cuántas notas hay". Dato real, cálculo derivado de una tabla ya acordada. */
  const bandasFiabilidad = useMemo(() => {
    let fiable = 0, media = 0, baja = 0;
    for (const a of ARBITROS) {
      const n = a.numInformes || 0;
      if (n >= 4) fiable++; else if (n === 3) media++; else baja++;
    }
    return { fiable, media, baja, total: ARBITROS.length };
  }, []);

  /* "Ratio de árbitros mejorando" — sintético a propósito (depende de forma[]
     y de las anotaciones, ninguna de las dos real): anotación etiqueta "mejora"
     Y pendiente de forma positiva a la vez, no solo una de las dos señales. */
  const ratioMejorando = useMemo(() => ARBITROS.filter((a) =>
    (a.notas || []).some((nt) => nt.etiqueta === "mejora") && estadoForma(a.forma).pend > 0
  ).length, []);

  /* "Incidencias más frecuentes": no existe todavía un registro real de incidencias
     independiente — proxy más cercano hoy son las etiquetas de anotaciones de
     seguimiento (sintéticas, ver arbitros-200.json). Etiquetado sin disimulo. */
  const etiquetasNotas = useMemo(() => {
    const acc = {};
    for (const a of ARBITROS) for (const nt of a.notas || []) acc[nt.etiqueta] = (acc[nt.etiqueta] || 0) + 1;
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, []);
  const maxEtiqueta = Math.max(1, ...etiquetasNotas.map(([, n]) => n));

  const disponibilidadTexto = disponibilidadEstado === "cargando" ? "cargando disponibilidad…" : "disponibilidad no disponible";
  const disponibilidadGaugeSegments = disponibilidadEstado === "listo" && bajasPorMotivo ? [
    { key: "disp", value: disponiblesEsteCiclo, color: DARK.good },
    { key: "baja", value: bajasPorMotivo.baja, color: DARK.warning },
    { key: "lesion", value: bajasPorMotivo.lesion, color: DARK.serious },
    { key: "urgencia", value: bajasPorMotivo.urgencia, color: DARK.critical },
    { key: "festivo", value: bajasPorMotivo.festivo, color: DARK.ink40 },
  ] : [];

  return (
    <div className="rounded-lg overflow-hidden" style={{
      background: "radial-gradient(ellipse 1100px 620px at 50% -6%, #123322 0%, transparent 60%), "
        + `radial-gradient(ellipse 1400px 900px at 50% 10%, ${DARK.pitch} 0%, ${DARK.pitchDeep} 72%)`,
    }}>
      <div className="p-5 sm:p-7 space-y-6">

        {/* ---- Comité en un vistazo: los dos gauges (US4/P2, FR-010/011/012) — primero,
             Roberto pidió priorizar gauges+KPIs sobre Cobertura (8 ago 2026). SC-001 de la
             spec (verla en <10s sin filtrar) se sigue cumpliendo: sin scroll ni filtro, no
             exige ser el primer elemento del layout. ---- */}
        <div>
          <div className="text-[13px] font-semibold" style={{ color: DARK.ink }}>Comité en un vistazo</div>
          <div className="text-[12px] mb-3" style={{ color: DARK.ink40 }}>Dos preguntas de negocio distintas — rendimiento y disponibilidad operativa — nunca combinadas en un solo indicador.</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DarkPanel title="Estado de forma del comité" right={<DarkTag real={false} />}>
              <div className="rounded-md py-5 px-2" style={{
                background: `radial-gradient(120% 160% at 50% 118%, rgba(255,92,92,.16) 0%, rgba(255,92,92,0) 45%), radial-gradient(130% 150% at 50% 105%, ${DARK.surfaceRaised} 0%, ${DARK.surface} 60%)`,
              }}>
                <GaugeSemicircular
                  scale={ARBITROS.length}
                  segments={[
                    { key: "verde", value: formaCounts.verde, color: DARK.good },
                    { key: "ambar", value: formaCounts.ambar, color: DARK.warning },
                    { key: "rojo", value: formaCounts.rojo, color: DARK.critical },
                  ]}
                  heroValue={formaCounts.rojo}
                  heroColor={DARK.critical}
                  heroMain="en seguimiento ahora mismo"
                  heroSubTag="sintético"
                  heroSubTagColor={DARK.synth}
                  heroSub={`de ${ARBITROS.length} expedientes`}
                />
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1 text-[12.5px]" style={{ color: DARK.ink70 }}>
                  <span className="inline-flex items-center gap-1.5"><span className="rounded-full" style={{ width: 8, height: 8, background: DARK.good }} />En forma <b className="font-mono" style={{ color: DARK.ink }}>{formaCounts.verde}</b></span>
                  <span className="inline-flex items-center gap-1.5"><span className="rounded-full" style={{ width: 8, height: 8, background: DARK.warning }} />Irregular <b className="font-mono" style={{ color: DARK.ink }}>{formaCounts.ambar}</b></span>
                  <span className="inline-flex items-center gap-1.5"><span className="rounded-full" style={{ width: 8, height: 8, background: DARK.critical }} />Seguimiento <b className="font-mono" style={{ color: DARK.ink }}>{formaCounts.rojo}</b></span>
                </div>
              </div>
              <p className="text-[11.5px] mt-3 pt-3 border-t" style={{ color: DARK.ink40, borderColor: DARK.line12 }}>
                Semáforo <code>estadoForma()</code> — media móvil de 5 informes + tendencia, umbral propio (7.0 / 8.0). No es la alerta B.4 de <code>kpis.md</code> (caída ≥1,5 pts / sobrecarga &gt;130% / inactividad &gt;4 semanas): si preguntan “¿esto salta por sobrecarga?”, la respuesta es no.
              </p>
            </DarkPanel>

            <DarkPanel title="Disponibilidad del comité" right={<DarkTag real />}>
              {disponibilidadEstado !== "listo" ? (
                <p className="text-xs py-8 text-center" style={{ color: DARK.ink40 }}>{disponibilidadTexto}</p>
              ) : (
                <div className="rounded-md py-5 px-2" style={{
                  background: `radial-gradient(120% 160% at 50% 118%, rgba(52,225,155,.14) 0%, rgba(52,225,155,0) 45%), radial-gradient(130% 150% at 50% 105%, ${DARK.surfaceRaised} 0%, ${DARK.surface} 60%)`,
                }}>
                  <GaugeSemicircular
                    scale={ARBITROS.length}
                    segments={disponibilidadGaugeSegments}
                    heroValue={disponiblesEsteCiclo}
                    heroColor={DARK.good}
                    heroMain="disponibles este ciclo"
                    heroSubTag="real"
                    heroSubTagColor={DARK.accent}
                    heroSub={`de ${ARBITROS.length} expedientes`}
                  />
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DARK.line16}` }}>
                    <div className="flex justify-between text-[11px] mb-2" style={{ color: DARK.ink40 }}>
                      <span>Desglose de los {bajasPorMotivo.total} no disponibles, por motivo real</span>
                    </div>
                    <div className="flex h-3.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.08)" }}>
                      {[
                        { v: bajasPorMotivo.baja, c: VIZ.pastel[1] },
                        { v: bajasPorMotivo.lesion, c: VIZ.pastel[3] },
                        { v: bajasPorMotivo.urgencia, c: VIZ.pastel[4] },
                        { v: bajasPorMotivo.festivo, c: VIZ.pastel[5] },
                      ].map((s, i) => bajasPorMotivo.total > 0 && s.v > 0 ? (
                        <div key={i} style={{ width: `${(s.v / bajasPorMotivo.total) * 100}%`, background: s.c }} />
                      ) : null)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[11.5px]" style={{ color: DARK.ink70 }}>
                      <span className="inline-flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 8, height: 8, background: VIZ.pastel[1] }} />Baja <b className="font-mono" style={{ color: DARK.ink }}>{bajasPorMotivo.baja}</b></span>
                      <span className="inline-flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 8, height: 8, background: VIZ.pastel[3] }} />Lesión <b className="font-mono" style={{ color: DARK.ink }}>{bajasPorMotivo.lesion}</b></span>
                      <span className="inline-flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 8, height: 8, background: VIZ.pastel[4] }} />Urgencia <b className="font-mono" style={{ color: DARK.ink }}>{bajasPorMotivo.urgencia}</b></span>
                      <span className="inline-flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 8, height: 8, background: VIZ.pastel[5] }} />Festivo <b className="font-mono" style={{ color: DARK.ink }}>{bajasPorMotivo.festivo}</b></span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[11.5px] mt-3 pt-3 border-t" style={{ color: DARK.ink40, borderColor: DARK.line12 }}>
                Declaraciones vigentes del ciclo activo (<code>specs/002-disponibilidad-arbitro</code>). Los motivos se colorean con la paleta de identidad, no con el semáforo — no hay un motivo “peor” que otro, solo distinto.
              </p>
            </DarkPanel>
          </div>
        </div>

        {/* ---- KPIs: dos universos, etiquetados explícitamente para no leerse como el mismo dato ---- */}
        <div>
          <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
            <div className="text-[13px] font-bold" style={{ color: DARK.ink }}>Panorama FFCV</div>
            <div className="text-[11.5px]" style={{ color: DARK.ink40 }}>temporada completa · {nf(agregadosReales.total_arbitros_activos_adulta)} activos — universo distinto a la plantilla de trabajo de abajo</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { eyebrow: "Árbitros activos", valor: nf(agregadosReales.total_arbitros_activos_adulta), sub: `${nf(agregadosReales.total_arbitros_activos_adulta)} en toda la FFCV · temporada completa — real` },
              { eyebrow: "Partidos temporada", valor: nf(agregadosReales.total_partidos_categoria_adulta), sub: `de ${nf(agregadosReales.total_partidos_temporada)} incl. fútbol base — real` },
              { eyebrow: "Equipos con dato real", valor: nf(EQUIPOS.length), sub: "categoría adulta, ver página Equipos · real" },
              { eyebrow: "Equidad de carga (CV)", valor: cv.toFixed(2), sub: `carga ${cvTexto} entre árbitros — real`, valorColor: cvTono === "bad" ? DARK.critical : cvTono === "warn" ? DARK.warning : DARK.good },
            ].map((s) => (
              <div key={s.eyebrow} className="p-4" style={{ background: DARK.surface, borderTop: `2px solid ${DARK.line24}` }}>
                <DarkStat {...s} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
            <div className="text-[13px] font-bold" style={{ color: DARK.ink }}>Plantilla operativa de este comité</div>
            <div className="text-[11.5px]" style={{ color: DARK.ink40 }}>{ARBITROS.length} expedientes de trabajo activos este ciclo — no es un recorte de “Panorama FFCV”, es el otro universo</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4" style={{ background: DARK.surface, borderTop: `2px solid ${DARK.line24}` }}>
              <DarkStat eyebrow="Informes por árbitro" valor={informesStats.media.toFixed(1)} sub={`rango ${informesStats.min}-${informesStats.max}, ${nf(informesStats.total)} en total · real`} />
            </div>
            <div className="p-4" style={{ background: DARK.surface, borderTop: `2px solid ${DARK.line24}` }}>
              <DarkStat eyebrow="Score B.1 fiable (4+ informes)" valor={`${bandasFiabilidad.fiable}/${bandasFiabilidad.total}`} sub="árbitros con ranking fiable (shrinkage 100% propio) · real" />
            </div>
            <div className="p-4" style={{ background: DARK.surface, borderTop: `2px solid ${DARK.line24}` }}>
              <DarkStat eyebrow="Mejorando esta temporada" valor={`${ratioMejorando}/${ARBITROS.length}`} sub="anotación de mejora + tendencia positiva · sintético" />
            </div>
          </div>
        </div>

        {/* ---- Cobertura por categoría (US1/P1) — sigue siendo la razón de ser del
             dashboard y SC-001 exige verla sin filtrar, pero ya no es el primer
             elemento: Roberto priorizó los gauges y KPIs por delante (8 ago 2026). ---- */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <div className="text-[15px] font-semibold" style={{ color: DARK.ink }}>Cobertura por categoría · {cicloActivo.finDeSemana}</div>
            {disponibilidadEstado !== "listo" ? (
              <span className="text-[12px]" style={{ color: DARK.ink40 }}>{disponibilidadTexto}</span>
            ) : categoriasEnRiesgo.length > 0 ? (
              <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: DARK.critical }}>
                <AlertTriangle size={12} /> {categoriasEnRiesgo.length} en riesgo
              </span>
            ) : (
              <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: DARK.good }}>
                <Check size={12} /> sin alertas de cobertura
              </span>
            )}
          </div>
          <DarkPanel accent={categoriasEnRiesgo.length > 0 ? DARK.critical : DARK.line24}>
            {disponibilidadEstado === "cargando" ? (
              <p className="text-xs" style={{ color: DARK.ink40 }}>Cargando disponibilidad real del ciclo…</p>
            ) : disponibilidadEstado === "error" ? (
              <p className="text-xs rounded px-3 py-2" style={{ color: DARK.critical, background: DARK.criticalT }}>
                No se pudo cargar la disponibilidad real de este ciclo. Comprueba la conexión y recarga — no se muestra cobertura con datos incompletos.
              </p>
            ) : (
              <>
                {cobertura.datasetDisponibilidadVacio && (
                  <p className="text-xs mb-3 rounded border px-3 py-2" style={{ color: DARK.critical, borderColor: DARK.criticalT, background: DARK.criticalT }}>
                    No hay dataset de disponibilidad cargado — los 0 disponibles de abajo no significan cobertura completa, significan que falta el dato.
                  </p>
                )}
                {categoriasConPartidos.length === 0 ? (
                  <p className="text-xs" style={{ color: DARK.ink40 }}>Ninguna categoría tiene partidos programados este fin de semana.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={Math.max(140, categoriasConPartidos.length * 48)}>
                      <BarChart data={categoriasConPartidos} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={DARK.line12} horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: DARK.ink40 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="categoria" width={110} tick={{ fontSize: 11, fill: DARK.ink70 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${DARK.line24}`, fontSize: 12, background: DARK.surfaceRaised, color: DARK.ink }}
                          formatter={(v, name) => [v, name === "totalDisponibles" ? "Disponibles" : "A designar"]} />
                        <Legend wrapperStyle={{ fontSize: 11, color: DARK.ink70 }} formatter={(value) => value === "totalDisponibles" ? "Disponibles" : "A designar"} />
                        <Bar dataKey="partidosADesignar" fill={DARK.line24} radius={[0, 3, 3, 0]} barSize={11} />
                        <Bar dataKey="totalDisponibles" radius={[0, 3, 3, 0]} barSize={11}>
                          {categoriasConPartidos.map((c) => (
                            <Cell key={c.categoria} fill={c.estado === "riesgo" ? DARK.critical : c.estado === "ajustado" ? DARK.warning : DARK.good} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-3">
                      {categoriasConPartidos.map((c) => (
                        <div key={c.categoria} className="flex items-center justify-between text-[11.5px]" style={{ color: DARK.ink40 }}>
                          <span>{c.categoria}: {c.disponiblesCategoriaPropia} propia + {c.disponiblesCategoriaInferior} inferior</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full font-medium text-[11px] px-2 py-0.5 shrink-0" style={{
                            background: c.estado === "riesgo" ? DARK.criticalT : c.estado === "ajustado" ? DARK.warningT : DARK.goodT,
                            color: c.estado === "riesgo" ? DARK.critical : c.estado === "ajustado" ? DARK.warning : DARK.good,
                          }}>
                            <span className="rounded-full" style={{ width: 6, height: 6, background: "currentColor" }} />
                            {c.estado === "riesgo" ? "En riesgo" : c.estado === "ajustado" ? "Ajustado, sin margen" : "Cobertura holgada"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <p className="text-[11.5px] mt-3 pt-3 border-t" style={{ color: DARK.ink40, borderColor: DARK.line12 }}>
              “En riesgo” = disponibles &lt; partidos a designar. “Ajustado” = exactamente igual, sin margen. Los árbitros que también pitan categorías inferiores pueden aparecer disponibles en más de una categoría a la vez — si dos categorías comparten el mismo pool y ambas están en riesgo, ese pool no cubre a las dos a la vez.
            </p>
          </DarkPanel>
        </div>

        {/* ---- rejilla de apoyo ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <DarkPanel title="Partidos de la jornada por categoría" sub={cicloActivo.finDeSemana} right={<span className="text-[11.5px]" style={{ color: DARK.ink40 }}>{cicloActivo.partidos.length} partidos · real</span>}>
              <ResponsiveContainer width="100%" height={Math.max(140, partidosJornadaPorCategoria.length * 44)}>
                <BarChart data={partidosJornadaPorCategoria} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={DARK.line12} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: DARK.ink40 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="categoria" width={110} tick={{ fontSize: 11, fill: DARK.ink70 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${DARK.line24}`, fontSize: 12, background: DARK.surfaceRaised, color: DARK.ink }} formatter={(v) => [v, "Partidos"]} />
                  <Bar dataKey="partidos" radius={[0, 3, 3, 0]}>
                    {partidosJornadaPorCategoria.map((c, i) => <Cell key={c.categoria} fill={VIZ.pastel[i % VIZ.pastel.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DarkPanel>

            <DarkPanel title="Categorías con más volumen" sub="todas las competiciones FFCV (incl. juvenil/veteranos/futsal) — universo distinto a las 5 categorías adultas de la plantilla" right={<DarkTag real />}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agregadosReales.distribucion_categorias.slice(0, 8)} margin={{ top: 4, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={DARK.line12} vertical={false} />
                  <XAxis dataKey="competicion" tick={{ fontSize: 10, fill: DARK.ink40 }} axisLine={{ stroke: DARK.line16 }} tickLine={false} angle={-30} textAnchor="end" interval={0} height={70} />
                  <YAxis tick={{ fontSize: 11, fill: DARK.ink40 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${DARK.line24}`, fontSize: 12, background: DARK.surfaceRaised, color: DARK.ink }} formatter={(v) => [v, "Partidos"]} />
                  <Bar dataKey="partidos" radius={[3, 3, 0, 0]}>
                    {agregadosReales.distribucion_categorias.slice(0, 8).map((c, i) => <Cell key={c.competicion} fill={VIZ.pastel[i % VIZ.pastel.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DarkPanel>
          </div>

          <div className="space-y-5">
            <DarkPanel title="Carga de partidos por franja horaria" right={<span className="text-[11.5px]" style={{ color: DARK.ink40 }}>{nf(HEATMAP_INTRASEMANAL.total_partidos)} · real</span>}>
              <HeatmapIntrasemanal data={HEATMAP_INTRASEMANAL} compacto dark />
              <p className="text-[11.5px] mt-3 pt-3 border-t" style={{ color: DARK.ink40, borderColor: DARK.line12 }}>
                Cuándo se juega (todas las categorías), no disponibilidad individual — anticipa en qué franjas hace falta más cobertura.
              </p>
            </DarkPanel>

            <DarkPanel title="Alertas de forma" sub={`${totalAlertas} de ${ARBITROS.length} · no es el indicador B.4 de kpis.md — es el semáforo estadoForma() con umbral propio 7.0/8.0, ya visible en el gauge de arriba`} right={<DarkTag real={false} />}>
              {alertasForma.length === 0 ? (
                <p className="text-xs" style={{ color: DARK.ink40 }}>Sin alertas activas.</p>
              ) : (
                <div className="space-y-2.5">
                  {alertasForma.map(({ a, est }) => (
                    <div key={a.id} className="flex items-center justify-between rounded p-2.5" style={{ background: DARK.line06 }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: DARK.ink }}>{a.n}</div>
                        <div className="text-xs" style={{ color: DARK.ink40 }}>{a.cat} · {a.loc}</div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full font-medium text-[11px] px-2.5 py-1" style={{
                        background: est.color === "rojo" ? DARK.criticalT : est.color === "ambar" ? DARK.warningT : DARK.goodT,
                        color: est.color === "rojo" ? DARK.critical : est.color === "ambar" ? DARK.warning : DARK.good,
                      }}>
                        <span className="rounded-full" style={{ width: 6, height: 6, background: "currentColor" }} />
                        {est.etiqueta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11.5px] mt-3 pt-3 border-t" style={{ color: DARK.ink40, borderColor: DARK.line12 }}>
                Basado en el semáforo de forma sobre los {ARBITROS.length} expedientes de trabajo — sintético hasta tener informes reales del comité.
              </p>
              <button onClick={irArbitros} className="mt-3 text-xs font-medium flex items-center gap-1" style={{ color: DARK.accent }}>
                Ver en Árbitros <ChevronRight size={13} />
              </button>
            </DarkPanel>

            <DarkPanel title="Incidencias más frecuentes" sub="proxy sobre etiquetas de anotaciones de seguimiento" right={<DarkTag real={false} />}>
              <div className="space-y-2">
                {etiquetasNotas.map(([etiqueta, n], i) => (
                  <div key={etiqueta} className="flex items-center gap-2.5">
                    <span className="text-xs w-24 shrink-0 capitalize" style={{ color: DARK.ink70 }}>{etiqueta}</span>
                    <div className="flex-1 rounded-full h-2" style={{ background: DARK.line06 }}>
                      <div className="h-2 rounded-full" style={{ width: `${(n / maxEtiqueta) * 100}%`, background: VIZ.pastel[i % VIZ.pastel.length] }} />
                    </div>
                    <span className="text-xs font-mono tabular-nums w-6 text-right" style={{ color: DARK.ink }}>{n}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] mt-3 pt-3 border-t" style={{ color: DARK.ink40, borderColor: DARK.line12 }}>
                No hay todavía un registro de incidencias independiente. «Disciplinaria» no aparece porque hoy no hay ninguna anotación con esa etiqueta en los {ARBITROS.length} expedientes, no es un error.
              </p>
            </DarkPanel>

            <DarkPanel title="Insights" sub="vista previa — no se recorta" accent={DARK.accentDeep} right={
              <span className="text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: DARK.accent, background: "rgba(127,212,255,.10)", border: `1px solid rgba(127,212,255,.28)` }}>
                Vista previa
              </span>
            }>
              <p className="text-[11.5px] italic mb-3.5" style={{ color: DARK.ink40 }}>Hoy: síntesis honesta de los datos ya calculados en los paneles de arriba. Próximamente: patrones que la IA cruce entre KPIs y que a simple vista no se ven.</p>
              <div className="space-y-3 text-sm" style={{ color: DARK.ink70 }}>
                <p>
                  <span className="font-semibold" style={{ color: DARK.ink }}>Reparto de carga muy desigual: </span>
                  el árbitro con más partidos dirige {agregadosReales.equidad_carga.max_partidos}, el de menos solo {agregadosReales.equidad_carga.min_partidos}. Media {agregadosReales.equidad_carga.media_partidos_por_arbitro} partidos/árbitro. <span className="text-[11px] font-semibold" style={{ color: DARK.accent }}>· real</span>
                </p>
                <p>
                  <span className="font-semibold" style={{ color: DARK.ink }}>{formaCounts.rojo} de {ARBITROS.length} árbitros</span> están en «necesita seguimiento» por caída de nota o tendencia descendente en sus últimos informes — umbral propio, todavía sin validar con el comité. <span className="text-[11px] font-semibold" style={{ color: DARK.synth }}>· sintético</span>
                </p>
              </div>
            </DarkPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- listado ------------------------------- */
/* virtualización de filas: la tabla de Árbitros va a 200 hoy y ~1800 si se
   amplía el dataset a la escala real del colegio (Sprint 3, docs/sprints.md)
   — solo se monta el DOM de las filas visibles + margen de scroll. */
const FILA_ALTURA = 64;
const FILA_OVERSCAN = 8;
const LISTADO_ALTURA_VISIBLE = 640;

function Listado({ T, onPick }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [cat, setCat] = useState("Todas");
  const [mediaMin, setMediaMin] = useState("Todas");
  const [scrollTop, setScrollTop] = useState(0);

  const filas = useMemo(() => ARBITROS
    .map((a) => ({ a, est: estadoForma(a.forma), tot: totales(a), ultima: a.hist[a.hist.length - 1] }))
    .filter(({ a, est, ultima }) => {
      const okq = (a.n + a.cat + a.loc + a.lic).toLowerCase().includes(q.toLowerCase());
      const okf = filtro === "todos" || est.color === filtro;
      const okc = cat === "Todas" || a.cat === cat;
      const okm = mediaMin === "Todas" || ultima.media >= parseFloat(mediaMin);
      return okq && okf && okc && okm;
    }), [q, filtro, cat, mediaMin]);

  /* reset del scroll al cambiar filtros: patrón "ajustar estado durante el
     render" (evita el efecto con setState síncrono que marca react-hooks) —
     la key en el contenedor de scroll fuerza además el reset del scrollTop nativo. */
  const filtroKey = `${q}|${filtro}|${cat}|${mediaMin}`;
  const [ultimoFiltroKey, setUltimoFiltroKey] = useState(filtroKey);
  let scrollTopEfectivo = scrollTop;
  if (filtroKey !== ultimoFiltroKey) {
    setUltimoFiltroKey(filtroKey);
    setScrollTop(0);
    scrollTopEfectivo = 0;
  }

  const filasVisiblesCount = Math.ceil(LISTADO_ALTURA_VISIBLE / FILA_ALTURA) + FILA_OVERSCAN * 2;
  const inicio = Math.max(0, Math.min(
    Math.floor(scrollTopEfectivo / FILA_ALTURA) - FILA_OVERSCAN,
    Math.max(0, filas.length - 1),
  ));
  const fin = Math.min(filas.length, inicio + filasVisiblesCount);
  const filasVisibles = filas.slice(inicio, fin);
  const espacioArriba = inicio * FILA_ALTURA;
  const espacioAbajo = (filas.length - fin) * FILA_ALTURA;

  const conteo = useMemo(() => {
    const c = { verde: 0, ambar: 0, rojo: 0 };
    ARBITROS.forEach((a) => c[estadoForma(a.forma).color]++);
    return c;
  }, []);

  const selectStyle = { borderColor: N.rule, color: N.ink70, background: N.card };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-md border p-4" style={{ background: N.card, borderColor: N.rule }}>
          <div className="flex items-center justify-between mb-2"><Eyebrow>Árbitros</Eyebrow><Users size={13} style={{ color: N.ink40 }} /></div>
          <div className="font-mono text-3xl" style={{ color: T.primary }}>{ARBITROS.length}</div>
          <div className="text-xs mt-1" style={{ color: N.ink70 }}>con histórico cargado</div>
        </div>
        {[["verde", "En forma", conteo.verde], ["ambar", "Irregulares", conteo.ambar], ["rojo", "En seguimiento", conteo.rojo]].map(([col, lbl, val]) => {
          const c = coloresForma(col);
          return (
            <button key={col} onClick={() => setFiltro(filtro === col ? "todos" : col)}
              className="rounded-md border p-4 text-left transition-all"
              style={{ background: filtro === col ? c.bg : N.card, borderColor: filtro === col ? c.dot : N.rule }}>
              <div className="flex items-center justify-between mb-2">
                <Eyebrow>{lbl}</Eyebrow>
                <span className="rounded-full" style={{ width: 9, height: 9, background: c.dot }} />
              </div>
              <div className="font-mono text-3xl" style={{ color: c.fg }}>{val}</div>
              <div className="text-xs mt-1" style={{ color: N.ink70 }}>{filtro === col ? "filtrando ·" : "toca para filtrar"}</div>
            </button>
          );
        })}
      </div>

      <Panel title={`Árbitros · ${filas.length} de ${ARBITROS.length}`}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={cat} onChange={(e) => setCat(e.target.value)}
              className="text-xs rounded border px-2 py-1.5 outline-none" style={selectStyle}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={mediaMin} onChange={(e) => setMediaMin(e.target.value)}
              className="text-xs rounded border px-2 py-1.5 outline-none" style={selectStyle}>
              <option value="Todas">Media: todas</option>
              <option value="8">Media ≥ 8,0</option>
              <option value="7">Media ≥ 7,0</option>
            </select>
            <div className="flex items-center gap-2 rounded border px-2 py-1" style={{ borderColor: N.rule, background: N.card }}>
              <Search size={13} style={{ color: N.ink40 }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o licencia"
                className="text-xs outline-none w-36 bg-transparent" style={{ color: N.ink }} />
            </div>
          </div>
        }>
        <div key={filtroKey} className="overflow-auto -m-5" style={{ maxHeight: LISTADO_ALTURA_VISIBLE }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10" style={{ background: N.card }}>
              <tr>
                {["Colegiado", "Categoría", "Estado de forma", "Media 25/26", "PJ (total)", "Indisp.", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-semibold border-b"
                    style={{ color: N.ink40, borderColor: N.rule }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {espacioArriba > 0 && <tr aria-hidden="true"><td colSpan={7} style={{ height: espacioArriba, padding: 0, border: 0 }} /></tr>}
              {filasVisibles.map(({ a, est, tot, ultima }) => (
                <tr key={a.id} onClick={() => onPick(a)} style={{ borderColor: N.rule, height: FILA_ALTURA }}
                  className="cursor-pointer border-b hover:bg-[rgba(255,255,255,.04)] transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar txt={a.foto} T={T} size={36} />
                      <div>
                        <div className="font-medium" style={{ color: N.ink }}>{a.n}</div>
                        <div className="text-xs" style={{ color: N.ink40 }}>{a.loc} · Lic. {a.lic}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: N.ink70 }}>{a.cat}</td>
                  <td className="px-3 py-3"><Semaforo estado={est} /></td>
                  <td className="px-3 py-3 font-mono tabular-nums text-sm font-semibold"
                    style={{ color: ultima.media >= 8 ? N.verde : ultima.media < 7 ? N.rojo : N.ink }}>{ultima.media.toFixed(1)}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-xs" style={{ color: N.ink70 }}>{tot.part}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-xs" style={{ color: a.indisp >= 5 ? N.ambar : N.ink70 }}>{a.indisp}</td>
                  <td className="px-3 py-3"><ChevronRight size={14} style={{ color: N.ink40 }} /></td>
                </tr>
              ))}
              {espacioAbajo > 0 && <tr aria-hidden="true"><td colSpan={7} style={{ height: espacioAbajo, padding: 0, border: 0 }} /></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-xs px-1" style={{ color: N.ink40 }}>
        El estado de forma es la media móvil de los últimos 5 informes con su tendencia: orientación para el técnico,
        no una etiqueta que decida designaciones. La indisponibilidad es información de gestión y no puntúa.
      </p>
    </div>
  );
}

const VENTANAS = [
  { id: 5, label: "Últimos 5" },
  { id: 10, label: "Últimos 10" },
  { id: null, label: "Todos" },
];

/* --------- historial real de partidos dirigidos (ffcv_public_data/) ---------
   Filtro por categoria pitada + ventana movil de partidos (kpis.md C.2): el
   historial ya viene ordenado de mas reciente a mas antiguo, asi que "ultimos
   N" es simplemente slice(0, N) sobre el filtrado por categoria. */
function HistorialPartidos({ a, T }) {
  const [soloCategoria, setSoloCategoria] = useState(true);
  const [ventana, setVentana] = useState(10);
  const [verTodos, setVerTodos] = useState(false);
  const historial = a.historialReal || [];
  const filtrado = soloCategoria ? historial.filter((h) => h.esCategoriaPrincipal) : historial;
  const enVentana = ventana ? filtrado.slice(0, ventana) : filtrado;
  const mostrados = verTodos ? enVentana : enVentana.slice(0, 6);

  const resumen = enVentana.reduce((acc, h) => ({ am: acc.am + (h.amarillas || 0), ro: acc.ro + (h.rojas || 0) }), { am: 0, ro: 0 });
  const taPj = enVentana.length ? (resumen.am / enVentana.length).toFixed(1) : "—";

  return (
    <Panel title={`Historial de partidos · ${filtrado.length} · ${a.cat}`}
      right={<span className="text-[11px] flex items-center gap-1" style={{ color: N.ambar }}><Info size={11} /> real</span>}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSoloCategoria(true)} className="text-[11px] rounded px-2.5 py-1 font-medium"
            style={{ background: soloCategoria ? T.tint : "transparent", color: soloCategoria ? T.primary : N.ink40, border: `1px solid ${soloCategoria ? T.primary : N.rule}` }}>
            Solo {a.cat}
          </button>
          <button onClick={() => setSoloCategoria(false)} className="text-[11px] rounded px-2.5 py-1 font-medium"
            style={{ background: !soloCategoria ? T.tint : "transparent", color: !soloCategoria ? T.primary : N.ink40, border: `1px solid ${!soloCategoria ? T.primary : N.rule}` }}>
            Todas las categorías
          </button>
        </div>
        <div className="flex items-center gap-1">
          {VENTANAS.map((v) => (
            <button key={v.label} onClick={() => setVentana(v.id)} className="text-[11px] rounded px-2.5 py-1 font-medium"
              style={{ background: ventana === v.id ? T.primary : "transparent", color: ventana === v.id ? "#FFF" : N.ink40, border: `1px solid ${ventana === v.id ? T.primary : N.rule}` }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {enVentana.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 rounded p-3" style={{ background: N.paper }}>
          {[["Partidos en ventana", enVentana.length, N.ink], ["Amarillas", resumen.am, "#E8C33C"], ["Rojas", resumen.ro, N.rojo]].map(([l, v, col]) => (
            <div key={l}>
              <div className="text-[9px] uppercase tracking-[0.1em] mb-0.5" style={{ color: N.ink40 }}>{l}</div>
              <div className="font-mono text-lg font-semibold tabular-nums" style={{ color: col }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {mostrados.length === 0 ? (
        <p className="text-xs" style={{ color: N.ink40 }}>Sin partidos registrados con este filtro.</p>
      ) : (
        <div className="space-y-1.5">
          {mostrados.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b" style={{ borderColor: N.rule }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs shrink-0" style={{ color: N.ink40 }}>{h.fecha}</span>
                <span className="truncate" style={{ color: N.ink }}>{h.equipoLocal} – {h.equipoVisitante}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!h.esCategoriaPrincipal && <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: N.paper, color: N.ink40 }}>{h.competicion}</span>}
                {(h.amarillas > 0 || h.rojas > 0) && (
                  <span className="font-mono text-[11px] flex items-center gap-1.5">
                    {h.amarillas > 0 && <span style={{ color: "#E8C33C" }}>{h.amarillas}TA</span>}
                    {h.rojas > 0 && <span style={{ color: N.rojo }}>{h.rojas}TR</span>}
                  </span>
                )}
                <span className="font-mono text-xs" style={{ color: N.ink70 }}>{h.resultado}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {enVentana.length > 6 && (
        <button onClick={() => setVerTodos(!verTodos)} className="text-xs font-medium mt-3" style={{ color: T.primary }}>
          {verTodos ? "Ver menos" : `Ver los ${enVentana.length}`}
        </button>
      )}
      <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
        Designaciones y tarjetas públicas reales de la FFCV (temporada 2025/26). TA/PJ en la ventana actual: {taPj}. No incluye
        nota del informe — ese dato sigue sin existir hasta tener export real del comité.
      </p>
    </Panel>
  );
}

/* ------------------------------- ficha ------------------------------- */
function Ficha({ T, a, back }) {
  const est = estadoForma(a.forma);
  const tot = totales(a);
  const c = coloresForma(est.color);
  const formaData = a.forma.map((nota, i) => ({ p: `-${a.forma.length - i}`, nota }));
  const histData = a.hist.map((h) => ({ temp: h.temp.slice(2), media: h.media }));
  const skills = radarSkills(a);
  const mejor = [...skills].sort((x, y) => y.v - x.v)[0];
  const peor = [...skills].sort((x, y) => x.v - y.v)[0];

  const [notas, setNotas] = useState([]);
  const [notasEstado, setNotasEstado] = useState("cargando"); // cargando | listo | error
  const [nueva, setNueva] = useState("");
  const [etiquetaNueva, setEtiquetaNueva] = useState("seguimiento");
  const [sugerenciaEmail, setSugerenciaEmail] = useState(null); // plantilla sugerida tras añadir nota positiva/mejora
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [errorNota, setErrorNota] = useState(null);

  // specs/002-disponibilidad-arbitro: "ver como" sin autenticación real (FR-012) — estado
  // local de esta ficha, no persiste entre visitas ni entre árbitros.
  const [rolVista, setRolVista] = useState("comite");
  const [logDisponibilidad, setLogDisponibilidad] = useState([]);
  const [logDispEstado, setLogDispEstado] = useState("cargando"); // cargando | listo | error
  const [patron, setPatron] = useState(null);
  const [cicloDeclaracion, setCicloDeclaracion] = useState(ciclosAsignacion[0].id);
  const [tipoDisponibilidad, setTipoDisponibilidad] = useState("disponible");
  const [motivoIndisponibilidad, setMotivoIndisponibilidad] = useState("lesion");
  const [bajaJustificada, setBajaJustificada] = useState(true);
  const [guardandoDisponibilidad, setGuardandoDisponibilidad] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState(null);
  const [archivoJustificante, setArchivoJustificante] = useState(null);
  const [guardandoJustificante, setGuardandoJustificante] = useState(false);

  useEffect(() => {
    // key={a.id} en el punto de uso remonta Ficha al cambiar de árbitro, así
    // que aquí no hace falta resetear notasEstado a mano — ya nace "cargando".
    let cancelado = false;
    obtenerAnotaciones(a.id).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setNotas(resultado.anotaciones);
        setNotasEstado("listo");
      } else {
        setNotasEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [a.id]);

  useEffect(() => {
    let cancelado = false;
    obtenerLogDisponibilidad(a.id).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setLogDisponibilidad(resultado.log);
        setPatron(calcularPatronImplicacion(resultado.log));
        setLogDispEstado("listo");
      } else {
        setLogDispEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [a.id]);

  const cicloSeleccionado = ciclosAsignacion.find((c) => c.id === cicloDeclaracion);
  const antelacionFestivo =
    tipoDisponibilidad === "festivo_solicitado" && cicloSeleccionado?.fechaInicioISO
      ? validarAntelacionFestivo(new Date().toISOString(), cicloSeleccionado.fechaInicioISO)
      : null;

  const declarar = async () => {
    if (guardandoDisponibilidad || (antelacionFestivo && !antelacionFestivo.valido)) return;
    setGuardandoDisponibilidad(true);
    setErrorDisponibilidad(null);
    const resultado = await declararDisponibilidad({
      arbitroId: a.id,
      cicloId: cicloDeclaracion,
      autor: rolVista,
      tipo: tipoDisponibilidad,
      motivo: tipoDisponibilidad === "no_disponible" ? motivoIndisponibilidad : null,
      justificada: tipoDisponibilidad === "no_disponible" && motivoIndisponibilidad === "baja" ? bajaJustificada : null,
    });
    setGuardandoDisponibilidad(false);
    if (!resultado.ok) {
      setErrorDisponibilidad(resultado.motivoRechazo);
      return;
    }
    const nuevoLog = [...logDisponibilidad, resultado.declaracion];
    setLogDisponibilidad(nuevoLog);
    setPatron(calcularPatronImplicacion(nuevoLog));
  };

  /* Vigente del ciclo seleccionado en el propio formulario de declaración —
     derivado del log ya cargado (obtenerLog ordena por fecha ascendente),
     no una llamada aparte. */
  const vigenteCicloDeclaracion = logDisponibilidad.filter((d) => d.cicloId === cicloDeclaracion).at(-1) ?? null;
  const bajaSinJustificarBloqueando = vigenteCicloDeclaracion?.tipo === "no_disponible"
    && vigenteCicloDeclaracion?.motivo === "baja" && vigenteCicloDeclaracion?.justificada === false;

  /* Adjuntar justificante (30 jul 2026, Roberto): una baja médica sin justificar
     bloquea de verdad al árbitro en el motor de designación (ver filtroDuro,
     motorAsignacion.js) — esto crea una NUEVA declaración justificada:true para
     el mismo ciclo (declaraciones_disponibilidad es append-only, "vigente" =
     la más reciente, nunca se sobrescribe una fila existente). El PDF en sí
     todavía no se sube a ningún sitio (no hay bucket de Supabase Storage
     creado) — esta acción sí registra de verdad la justificación, el
     almacenamiento del archivo queda pendiente como paso siguiente. */
  const justificarBaja = async () => {
    if (!archivoJustificante || guardandoJustificante) return;
    setGuardandoJustificante(true);
    const resultado = await declararDisponibilidad({
      arbitroId: a.id, cicloId: cicloDeclaracion, autor: rolVista,
      tipo: "no_disponible", motivo: "baja", justificada: true,
    });
    setGuardandoJustificante(false);
    if (!resultado.ok) { setErrorDisponibilidad(resultado.motivoRechazo); return; }
    const nuevoLog = [...logDisponibilidad, resultado.declaracion];
    setLogDisponibilidad(nuevoLog);
    setPatron(calcularPatronImplicacion(nuevoLog));
    setArchivoJustificante(null);
  };

  const addNota = async () => {
    if (!nueva.trim() || guardandoNota) return;
    setGuardandoNota(true);
    setErrorNota(null);
    const resultado = await guardarAnotacion({ arbitroId: a.id, etiqueta: etiquetaNueva, texto: nueva, autor: "Comité" });
    setGuardandoNota(false);
    if (!resultado.ok) {
      setErrorNota(resultado.error);
      return;
    }
    setNotas([resultado.anotacion, ...notas]);
    setNueva("");
    // sugerencia automatica de plantilla de email al registrar una nota positiva o de mejora
    if (etiquetaNueva === "positiva") setSugerenciaEmail("felicitacion");
    else if (etiquetaNueva === "mejora") setSugerenciaEmail("puntosDeMejora");
    else setSugerenciaEmail(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={back} className="text-xs flex items-center gap-1" style={{ color: N.ink70 }}>
          <ChevronRight size={13} className="rotate-180" /> Volver a expedientes
        </button>
        <div className="flex items-center rounded-full border p-0.5 text-xs" style={{ borderColor: N.rule }}>
          {[["arbitro", "Ver como árbitro"], ["comite", "Ver como comité"]].map(([val, label]) => (
            <button key={val} onClick={() => setRolVista(val)}
              className="rounded-full px-3 py-1 font-medium transition-colors"
              style={{ background: rolVista === val ? T.primary : "transparent", color: rolVista === val ? "#FFF" : N.ink70 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md overflow-hidden" style={{ background: T.deep }}>
        <div className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar txt={a.foto} T={{ tint: "#FFFFFF", primary: T.primary }} size={60} />
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] mb-1" style={{ color: T.accent }}>LICENCIA {a.lic}</div>
              <h2 className="text-2xl font-semibold text-white leading-tight">{a.n}</h2>
              <div className="text-xs mt-1.5" style={{ color: N.ink70 }}>{a.cat} · {a.loc} · {a.edad} años · {a.temp} temporadas · {a.altura} cm</div>
              <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                <a href={`tel:${a.telefono.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:underline" style={{ color: "#FFF" }}>
                  <Phone size={12} style={{ color: T.accent }} /> {a.telefono}
                </a>
                <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 hover:underline" style={{ color: "#FFF" }}>
                  <Mail size={12} style={{ color: T.accent }} /> {a.email}
                </a>
              </div>
            </div>
          </div>
          <div style={{ background: N.card, borderRadius: 8, padding: "12px 18px" }}>
            <div className="text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: N.ink40 }}>Estado de forma actual</div>
            <Semaforo estado={est} size="lg" />
            <div className="text-[11px] mt-1.5" style={{ color: N.ink70 }}>media 5 últimos: <span className="font-mono font-semibold">{est.media.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="h-1" style={{ background: T.accent }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Estado de forma · últimos 6 informes"
            right={<span className="text-[11px]" style={{ color: c.fg }}>{est.etiqueta}</span>}>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={formaData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={N.rule} vertical={false} />
                <XAxis dataKey="p" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={{ stroke: N.rule }} tickLine={false} />
                <YAxis domain={[5, 10]} tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v) => [v.toFixed(1), "Nota"]} />
                <ReferenceLine y={8} stroke={N.verde} strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={7} stroke={N.rojo} strokeDasharray="3 3" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="nota" stroke={c.dot} strokeWidth={2.5} dot={{ r: 4, fill: c.dot }} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Histórico por temporada">
            <div className="-m-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Temporada", "Partidos", "Amarillas", "Rojas", "TA/PJ", "Media informes"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold border-b"
                        style={{ color: N.ink40, borderColor: N.rule }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.hist.slice().reverse().map((h, i) => (
                    <tr key={h.temp} className="border-b" style={{ borderColor: N.rule, background: i === 0 ? T.tint : "transparent" }}>
                      <td className="px-3 py-2.5 font-medium" style={{ color: N.ink }}>{h.temp}{i === 0 && <span className="ml-2 text-[10px]" style={{ color: T.primary }}>actual</span>}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums">{h.part}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums" style={{ color: "#E8C33C" }}>{h.am}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums" style={{ color: N.tr }}>{h.ro}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums" style={{ color: N.ink70 }}>{(h.am / h.part).toFixed(1)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums font-semibold"
                        style={{ color: h.media >= 8 ? N.verde : h.media < 7 ? N.rojo : N.ink }}>{h.media.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={histData} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.primary} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={T.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={N.rule} vertical={false} />
                  <XAxis dataKey="temp" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={{ stroke: N.rule }} tickLine={false} />
                  <YAxis domain={[6, 10]} tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v) => [v.toFixed(1), "Media"]} />
                  <Area type="monotone" dataKey="media" stroke={T.primary} fill="url(#gh)" strokeWidth={2.5} dot={{ r: 3, fill: T.primary }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <HistorialPartidos a={a} T={T} />

          {/* comentarios internos: seguimiento del comité + anotaciones de informadores/superiores, ver docs/data-model.md Anotacion */}
          <Panel title="Seguimiento interno"
            right={<span className="text-[11px] flex items-center gap-1" style={{ color: N.ink40 }}><Lock size={11} /> visible solo para el comité</span>}>
            <div className="flex gap-2 mb-2 flex-wrap">
              <input value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota()}
                placeholder="Añadir nota de seguimiento (llamadas, conversaciones, contexto)…"
                className="flex-1 text-sm rounded border px-3 py-2 outline-none min-w-[200px]" style={{ borderColor: N.rule, color: N.ink }} />
              <select value={etiquetaNueva} onChange={(e) => setEtiquetaNueva(e.target.value)}
                className="text-xs rounded border px-2 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
                {Object.entries(ETIQUETA_NOTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={addNota} disabled={guardandoNota} className="text-xs rounded px-3 py-2 text-white font-medium flex items-center gap-1.5 disabled:opacity-60" style={{ background: T.deep }}>
                <MessageSquarePlus size={14} /> {guardandoNota ? "Guardando…" : "Guardar"}
              </button>
            </div>

            {errorNota && (
              <p className="text-xs rounded px-3 py-2 mb-4" style={{ color: N.rojo, background: N.rojoT }}>
                No se pudo guardar: {errorNota}
              </p>
            )}

            {sugerenciaEmail && (
              <div className="rounded p-3 mb-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: T.accentTint }}>
                <div className="text-xs" style={{ color: N.ambarInk }}>
                  <span className="font-semibold">Sugerencia: </span>
                  {sugerenciaEmail === "felicitacion" ? "esta nota es positiva — ¿le envías un email de felicitación?" : "esta nota es de mejora — ¿le envías puntos de mejora por email?"}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={mailtoHref(a.email, PLANTILLAS_EMAIL[sugerenciaEmail].asunto(a), PLANTILLAS_EMAIL[sugerenciaEmail].cuerpo(a))}
                    className="text-xs rounded px-2.5 py-1 font-medium text-white flex items-center gap-1" style={{ background: T.deep }}>
                    <Send size={11} /> Redactar email
                  </a>
                  <button onClick={() => setSugerenciaEmail(null)} className="text-xs" style={{ color: N.ambarInk }}>Descartar</button>
                </div>
              </div>
            )}

            {notasEstado === "cargando" ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Cargando notas…</p>
            ) : notasEstado === "error" ? (
              <p className="text-xs rounded px-3 py-2" style={{ color: N.rojo, background: N.rojoT }}>
                No se pudieron cargar las notas. Comprueba la conexión y vuelve a abrir la ficha.
              </p>
            ) : notas.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Sin notas de seguimiento. Las notas quedan registradas con autor y fecha (audit log).</p>
            ) : (
              <div className="space-y-2.5">
                {notas.map((nt, i) => {
                  const et = ETIQUETA_NOTA[nt.etiqueta] || ETIQUETA_NOTA.seguimiento;
                  const fecha = new Date(nt.creadoEn).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
                  return (
                    <div key={nt.id ?? i} className="rounded border p-3" style={{ borderColor: N.rule, background: i === 0 && nt.fuente === "real" ? T.tint : N.card }}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: T.primary }}>{nt.autor}</span>
                        <span className="text-[11px] font-mono" style={{ color: N.ink40 }}>{fecha}</span>
                        <span className="text-[10px] rounded px-1.5 py-0.5 font-medium" style={{ background: et.bg, color: et.fg }}>{et.label}</span>
                        <span className="text-[10px]" style={{ color: nt.fuente === "real" ? N.verde : N.ambar }}>· {nt.fuente}</span>
                      </div>
                      <p className="text-sm" style={{ color: N.ink70 }}>{nt.texto}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* disponibilidad declarada por ciclo — specs/002-disponibilidad-arbitro */}
          <Panel title="Disponibilidad"
            right={<span className="text-[11px] flex items-center gap-1" style={{ color: N.ink40 }}><Lock size={11} /> historial visible para ambos roles</span>}>
            {bajaSinJustificarBloqueando && (
              <div className="rounded border p-3 mb-3 flex items-start gap-2.5" style={{ borderColor: VIZ.estado.critical, background: VIZ.estado.criticalT }}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: VIZ.estado.critical }} />
                <div className="flex-1">
                  <div className="text-xs font-semibold" style={{ color: VIZ.estado.critical }}>
                    Baja médica sin justificar — no se podrá designar a {a.n} para este ciclo hasta adjuntar el justificante
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <input type="file" accept="application/pdf" onChange={(e) => setArchivoJustificante(e.target.files?.[0] ?? null)}
                      className="text-xs" style={{ color: N.ink70 }} />
                    <button onClick={justificarBaja} disabled={!archivoJustificante || guardandoJustificante}
                      className="text-[11px] rounded px-2.5 py-1 font-medium text-white disabled:opacity-60" style={{ background: T.deep }}>
                      {guardandoJustificante ? "Adjuntando…" : "Adjuntar justificante"}
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: N.ink40 }}>
                    Esto registra de verdad la justificación en el histórico. El almacenamiento del PDF en sí queda pendiente (falta un bucket de Supabase Storage) — no se pierde la acción, pero el archivo no se sube todavía a ningún sitio.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: N.ink40 }}>Ciclo</label>
                <select value={cicloDeclaracion} onChange={(e) => setCicloDeclaracion(e.target.value)}
                  className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
                  {ciclosAsignacion.map((cy) => <option key={cy.id} value={cy.id}>{cy.finDeSemana}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: N.ink40 }}>Disponibilidad</label>
                <select value={tipoDisponibilidad} onChange={(e) => setTipoDisponibilidad(e.target.value)}
                  className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
                  {Object.entries(TIPO_DISPONIBILIDAD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {tipoDisponibilidad === "no_disponible" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: N.ink40 }}>Motivo</label>
                  <select value={motivoIndisponibilidad} onChange={(e) => setMotivoIndisponibilidad(e.target.value)}
                    className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
                    {Object.entries(MOTIVO_INDISPONIBILIDAD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              )}
              {tipoDisponibilidad === "no_disponible" && motivoIndisponibilidad === "baja" && (
                <label className="flex items-center gap-1.5 text-xs pb-2" style={{ color: N.ink70 }}>
                  <input type="checkbox" checked={bajaJustificada} onChange={(e) => setBajaJustificada(e.target.checked)} /> Justificada
                </label>
              )}
              <button onClick={declarar}
                disabled={guardandoDisponibilidad || Boolean(antelacionFestivo && !antelacionFestivo.valido)}
                className="text-xs rounded px-3 py-2 text-white font-medium disabled:opacity-60" style={{ background: T.deep }}>
                {guardandoDisponibilidad ? "Guardando…" : "Declarar"}
              </button>
            </div>

            {antelacionFestivo && !antelacionFestivo.valido && (
              <p className="text-xs rounded px-3 py-2 mb-3" style={{ color: N.ambarInk, background: N.ambarT }}>
                Un festivo solicitado necesita al menos 15 días de antelación (hay {antelacionFestivo.diasAntelacion}).
              </p>
            )}
            {errorDisponibilidad && (
              <p className="text-xs rounded px-3 py-2 mb-3" style={{ color: N.rojo, background: N.rojoT }}>
                No se pudo guardar: {errorDisponibilidad}
              </p>
            )}

            <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2 pt-2 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Historial
            </div>
            {logDispEstado === "cargando" ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Cargando historial…</p>
            ) : logDispEstado === "error" ? (
              <p className="text-xs rounded px-3 py-2" style={{ color: N.rojo, background: N.rojoT }}>
                No se pudo cargar el historial de disponibilidad.
              </p>
            ) : logDisponibilidad.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Sin declaraciones — se asume disponible por defecto.</p>
            ) : (
              <div className="space-y-2">
                {logDisponibilidad.slice().reverse().map((d) => {
                  const cicloEtiqueta = ciclosAsignacion.find((cy) => cy.id === d.cicloId)?.finDeSemana ?? d.cicloId;
                  const fecha = new Date(d.fechaDeclaracion).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
                  const noJustificada = d.motivo === "baja" && d.justificada === false;
                  return (
                    <div key={d.id} className="rounded border p-2.5 text-xs" style={{ borderColor: noJustificada ? N.rojo : N.rule, background: noJustificada ? N.rojoT : N.card }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" style={{ color: N.ink }}>{TIPO_DISPONIBILIDAD[d.tipo]?.label ?? d.tipo}</span>
                        {d.motivo && <span style={{ color: N.ink70 }}>· {MOTIVO_INDISPONIBILIDAD[d.motivo]?.label ?? d.motivo}</span>}
                        {d.motivo === "baja" && (
                          <span style={{ color: d.justificada ? N.verde : N.rojo }}>· {d.justificada ? "justificada" : "no justificada"}</span>
                        )}
                        <span className="font-mono" style={{ color: N.ink40 }}>{cicloEtiqueta}</span>
                        <span className="font-mono" style={{ color: N.ink40 }}>{fecha}</span>
                        <span style={{ color: N.ink40 }}>· {d.autor}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {rolVista === "comite" && logDispEstado === "listo" && patron && (
              <div className="mt-4 pt-3 border-t rounded p-2.5" style={{ borderColor: N.rule, background: N.paper }}>
                <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2 flex items-center gap-1" style={{ color: N.ink40 }}>
                  <Lock size={10} /> Patrón de implicación · solo comité
                </div>
                <div className="flex gap-5 text-xs flex-wrap" style={{ color: N.ink70 }}>
                  <span>Bajas no justificadas: <b style={{ color: patron.bajasNoJustificadas > 0 ? N.rojo : N.ink }}>{patron.bajasNoJustificadas}</b></span>
                  <span>Festivos solicitados: <b style={{ color: N.ink }}>{patron.festivosSolicitados}</b></span>
                  <span>Urgencias: <b style={{ color: N.ink }}>{patron.urgencias}</b></span>
                </div>
                <p className="text-[11px] mt-2" style={{ color: N.ink40 }}>Descriptivo, no interviene en el score ni en ninguna clasificación.</p>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          {/* contacto + plantillas de email — ver docs/decisiones-producto.md */}
          <Panel title="Contactar">
            <div className="space-y-2 mb-4">
              <a href={`tel:${a.telefono.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: N.ink }}>
                <Phone size={13} style={{ color: N.ink40 }} /> {a.telefono}
              </a>
              <a href={`mailto:${a.email}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: N.ink }}>
                <Mail size={13} style={{ color: N.ink40 }} /> {a.email}
              </a>
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: N.ink40 }}>Plantillas rápidas</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(PLANTILLAS_EMAIL).map(([k, p]) => (
                <a key={k} href={mailtoHref(a.email, p.asunto(a), p.cuerpo(a))}
                  className="text-xs rounded border px-3 py-2 flex items-center gap-2 hover:bg-[rgba(255,255,255,.04)] transition-colors" style={{ borderColor: N.rule, color: N.ink }}>
                  <Send size={12} style={{ color: T.primary }} /> {p.etiqueta}
                </a>
              ))}
            </div>
            <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Abre tu cliente de correo con el email ya redactado — revisas y envías tú, nunca se manda automáticamente.
            </p>
          </Panel>

          {/* radar de habilidades */}
          <Panel title="Perfil de habilidades">
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={skills} outerRadius="72%">
                <PolarGrid stroke={N.rule} />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: N.ink70 }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke={T.primary} fill={T.primary} fillOpacity={0.22} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v) => [v.toFixed(1), "Nota"]} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="text-xs space-y-1" style={{ color: N.ink70 }}>
              <p><span className="font-semibold" style={{ color: N.verde }}>Destaca:</span> {mejor.skill} ({mejor.v.toFixed(1)})</p>
              <p><span className="font-semibold" style={{ color: N.ambar }}>A trabajar:</span> {peor.skill} ({peor.v.toFixed(1)})</p>
            </div>
            <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Físico y técnica: pruebas de pretemporada. Gestión y disciplinaria: derivadas de los informes de la temporada.
            </p>
          </Panel>

          <Panel title="Resumen de trayectoria">
            <div className="grid grid-cols-2 gap-4">
              {[["Partidos totales", tot.part], ["Amarillas", tot.am], ["Rojas", tot.ro], ["TA por partido", (tot.am / tot.part).toFixed(1)]].map(([l, v]) => (
                <div key={l}>
                  <div className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: N.ink40 }}>{l}</div>
                  <div className="font-mono text-2xl tabular-nums" style={{ color: T.primary }}>{v}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* pruebas fisicas y examen teorico: 2 convocatorias/temporada, ver docs/decisiones-producto.md */}
          <Panel title="Pruebas físicas y teóricas"
            right={<span className="text-[11px] flex items-center gap-1" style={{ color: N.ambar }}><Info size={11} /> sintético</span>}>
            <div className="space-y-3">
              {a.pruebasFisicas.slice(0, 2).map((p, i) => (
                <div key={`fis-${i}`} className="rounded border p-2.5" style={{ borderColor: N.rule }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: N.ink }}><Dumbbell size={12} style={{ color: N.ink40 }} /> Prueba física · {p.convocatoria}</span>
                    <span className="font-mono text-xs" style={{ color: N.ink40 }}>{p.fecha}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs mb-1" style={{ color: N.ink70 }}>
                    <span className="font-mono font-semibold" style={{ color: p.nota >= 7.5 ? N.verde : N.ambar }}>{p.nota.toFixed(1)}</span>
                    <span>{p.peso} kg</span>
                  </div>
                  <p className="text-xs" style={{ color: N.ink70 }}>{p.comentario}</p>
                </div>
              ))}
              {a.examenesTeoricos.slice(0, 2).map((ex, i) => (
                <div key={`teo-${i}`} className="rounded border p-2.5" style={{ borderColor: N.rule }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: N.ink }}><BookOpen size={12} style={{ color: N.ink40 }} /> Examen teórico · {ex.convocatoria}</span>
                    <span className="font-mono text-xs" style={{ color: N.ink40 }}>{ex.fecha}</span>
                  </div>
                  <div className="text-xs mb-1 font-mono font-semibold" style={{ color: ex.nota >= 7.5 ? N.verde : N.ambar }}>{ex.nota.toFixed(1)}</div>
                  <p className="text-xs" style={{ color: N.ink70 }}>{ex.comentario}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Altura: {a.altura} cm (fija). El peso se registra por convocatoria, no como dato fijo — ver data-model.md.
            </p>
          </Panel>

          <Panel title="Disponibilidad">
            <div className="flex items-end gap-3">
              <div className="font-mono text-3xl tabular-nums" style={{ color: a.indisp >= 5 ? N.ambar : T.primary }}>{a.indisp}</div>
              <div className="text-xs pb-1" style={{ color: N.ink70 }}>fines de semana no disponibles solicitados esta temporada</div>
            </div>
            <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Información para planificar designaciones. No interviene en la evaluación ni en ninguna clasificación.
            </p>
          </Panel>

          <Panel title="Origen de los datos">
            <div className="space-y-2.5">
              {[["Partidos, designaciones y tarjetas", "ffcv.es/competiciones (público, real)"], ["Informes técnicos", "Aún no existen — pendiente de export del comité"], ["Pruebas físicas y teóricas", "Sintético (a la espera del dato real)"], ["Domicilio del árbitro", "Sintético (a la espera del roster del comité)"]].map(([l, src]) => (
                <div key={l} className="flex items-center justify-between text-xs gap-3">
                  <span className="flex items-center gap-2" style={{ color: N.ink70 }}>
                    <FileText size={13} style={{ color: N.ink40 }} />{l}
                  </span>
                  <span className="font-mono text-right" style={{ color: N.ink40 }}>{src}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- designación inteligente (v0, en construcción) ------------------------------- */
/** Busca un candidato por id entre los ya calculados para esta fila; si no está (poco probable, ver research.md), cae al roster completo. */
function candidatoPorId(r, arbitroId) {
  if (r.asignado?.arbitro?.id === arbitroId) return r.asignado.arbitro;
  const alt = r.alternativas.find((al) => al.arbitro.id === arbitroId);
  if (alt) return alt.arbitro;
  return ARBITROS.find((a) => a.id === arbitroId) ?? null;
}

function FilaJornada({ r, T, expandido, onToggle, onDecidir }) {
  const { partido, asignado, alternativas, requiereRevision, motivoRevision, decisionVigente } = r;
  const [guardandoId, setGuardandoId] = useState(null); // "sugerido" | id del arbitro de la alternativa en curso
  const [errorDecision, setErrorDecision] = useState(null);
  const [alternativaMotivo, setAlternativaMotivo] = useState(null); // id del arbitro cuyo campo de motivo está abierto
  const [motivoTexto, setMotivoTexto] = useState("");

  const candidatoDecidido = decisionVigente ? candidatoPorId(r, decisionVigente.arbitroId) : null;
  const fechaDecision = decisionVigente
    ? new Date(decisionVigente.decididoEn).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const confirmarSugerido = async (e) => {
    e.stopPropagation();
    if (!asignado || guardandoId) return;
    setGuardandoId("sugerido");
    setErrorDecision(null);
    const resultado = await onDecidir({ partidoId: partido.id, arbitroId: asignado.arbitro.id, esSugerido: true, motivo: null });
    setGuardandoId(null);
    if (!resultado.ok) setErrorDecision(resultado.error);
  };

  const abrirMotivo = (e, arbitroId) => {
    e.stopPropagation();
    setAlternativaMotivo(arbitroId);
    setMotivoTexto("");
    setErrorDecision(null);
  };

  const cancelarMotivo = (e) => {
    e.stopPropagation();
    setAlternativaMotivo(null);
    setMotivoTexto("");
  };

  const confirmarAlternativa = async (e, arbitroId) => {
    e.stopPropagation();
    if (!motivoTexto.trim() || guardandoId) return;
    setGuardandoId(arbitroId);
    setErrorDecision(null);
    const resultado = await onDecidir({ partidoId: partido.id, arbitroId, esSugerido: false, motivo: motivoTexto });
    setGuardandoId(null);
    if (!resultado.ok) { setErrorDecision(resultado.error); return; }
    setAlternativaMotivo(null);
    setMotivoTexto("");
  };

  return (
    <>
      <tr className="border-b cursor-pointer hover:bg-[rgba(255,255,255,.04)]" style={{ borderColor: N.rule }} onClick={onToggle}>
        <td className="px-3 py-3">
          <div className="font-medium" style={{ color: N.ink }}>{partido.equipoLocal} – {partido.equipoVisitante}</div>
          <div className="text-xs" style={{ color: N.ink40 }}>{partido.categoriaMinima} · {partido.localidad} · {partido.fecha}</div>
          {partido.sensible && (
            <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: VIZ.estado.warning }}>
              <AlertTriangle size={11} /> {partido.motivoSensible}
            </div>
          )}
        </td>
        <td className="px-3 py-3">
          {asignado ? (
            <div className="flex items-center gap-2">
              <Avatar txt={asignado.arbitro.foto} T={T} size={28} />
              <div>
                <div className="text-sm font-medium" style={{ color: N.ink }}>{asignado.arbitro.n}</div>
                <div className="text-[10px] font-mono" style={{ color: N.ink40 }}>score {asignado.score.toFixed(2)}</div>
              </div>
            </div>
          ) : (
            <span className="text-xs" style={{ color: N.rojo }}>Sin candidato disponible</span>
          )}
          {!decisionVigente && asignado && (
            <button onClick={confirmarSugerido} disabled={guardandoId === "sugerido"}
              className="mt-2 text-[11px] rounded px-2 py-1 font-medium text-white flex items-center gap-1 disabled:opacity-60" style={{ background: N.verde }}>
              <Check size={11} /> {guardandoId === "sugerido" ? "Guardando…" : "Confirmar"}
            </button>
          )}
        </td>
        <td className="px-3 py-3">
          {decisionVigente ? (
            <div>
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: N.verdeT, color: N.verde }}>
                <Check size={11} /> Decidida
              </span>
              <div className="text-[10px] mt-1" style={{ color: N.ink40 }}>
                {candidatoDecidido?.n ?? "árbitro"} · {decisionVigente.decididoPorRol === "comite" ? "comité" : "árbitro"} · {fechaDecision}
              </div>
              {decisionVigente.motivo && (
                <div className="text-[10px] italic mt-0.5" style={{ color: N.ink40 }}>{`"${decisionVigente.motivo}"`}</div>
              )}
            </div>
          ) : requiereRevision ? (
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: N.ambarT, color: N.ambar }}>
              <AlertTriangle size={11} /> Revisar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: N.verdeT, color: N.verde }}>
              <Check size={11} /> Auto-confirmable
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-right">
          <ChevronRight size={14} style={{ color: N.ink40, transform: expandido ? "rotate(90deg)" : "none" }} />
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={4} className="px-3 pb-4" style={{ background: N.paper }}>
            {motivoRevision.length > 0 && !decisionVigente && (
              <div className="rounded p-2.5 mb-3 text-xs" style={{ background: N.ambarT, color: N.ambarInk }}>
                {motivoRevision.map((m, i) => <div key={i}>· {m}</div>)}
              </div>
            )}
            {errorDecision && (
              <p className="text-xs rounded px-3 py-2 mb-3" style={{ color: N.rojo, background: N.rojoT }}>
                No se pudo guardar: {errorDecision}
              </p>
            )}
            <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: N.ink40 }}>
              Alternativas ({alternativas.length})
            </div>
            {alternativas.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>No hay más candidatos disponibles para este partido.</p>
            ) : (
              <div className="space-y-1.5">
                {alternativas.map(({ arbitro, score, coste }) => (
                  <div key={arbitro.id} className="text-xs rounded border p-2" style={{ borderColor: N.rule, background: N.card }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar txt={arbitro.foto} T={T} size={22} />
                        <span style={{ color: N.ink }}>{arbitro.n}</span>
                        <span style={{ color: N.ink40 }}>vive en {arbitro.loc}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono" style={{ color: N.ink70 }}>
                        <span>{score.toFixed(2)}</span>
                        <span>{coste.distanciaKmAprox != null ? `${coste.distanciaKmAprox} km` : "s/d"}</span>
                        <span>{coste.dentroTermino ? "sin dieta" : coste.costeFederacionEstimado != null ? `${coste.costeFederacionEstimado.toFixed(2)} €` : "s/d"}</span>
                      </div>
                    </div>
                    {!decisionVigente && (
                      alternativaMotivo === arbitro.id ? (
                        <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input value={motivoTexto} onChange={(e) => setMotivoTexto(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && confirmarAlternativa(e, arbitro.id)}
                            placeholder="Motivo del cambio (obligatorio)…" autoFocus
                            className="flex-1 text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink }} />
                          <button onClick={(e) => confirmarAlternativa(e, arbitro.id)} disabled={!motivoTexto.trim() || guardandoId === arbitro.id}
                            className="text-[11px] rounded px-2 py-1 font-medium text-white disabled:opacity-60" style={{ background: T.deep }}>
                            {guardandoId === arbitro.id ? "Guardando…" : "Guardar"}
                          </button>
                          <button onClick={cancelarMotivo} className="text-[11px]" style={{ color: N.ink40 }}>Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={(e) => abrirMotivo(e, arbitro.id)}
                          className="mt-2 text-[11px] rounded px-2 py-1 font-medium" style={{ color: T.primary, background: T.accentTint }}>
                          Elegir este candidato
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function DesignacionInteligente({ T, onIrAPartido }) {
  const [cicloId, setCicloId] = useState(ciclosAsignacion[0].id);
  const [expandidoId, setExpandidoId] = useState(null);
  const [vigentesDisponibilidad, setVigentesDisponibilidad] = useState(null);
  const ciclo = ciclosAsignacion.find((c) => c.id === cicloId);

  /* Disponibilidad real (specs/002), no solo el heurístico sintético de
     conDisponibilidad — una baja médica sin justificar excluye de verdad
     al árbitro como candidato (Roberto, 30 jul 2026). Ver filtroDuro en
     motorAsignacion.js. */
  useEffect(() => {
    let cancelado = false;
    obtenerVigentesDisponibilidadPorCiclo(cicloId).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) setVigentesDisponibilidad(resultado.vigentesPorArbitro);
    });
    return () => { cancelado = true; };
  }, [cicloId]);

  const resultados = useMemo(() => {
    const arbitrosConExtras = ARBITROS.map(conDisponibilidad);
    return asignarJornada(ciclo.partidos, arbitrosConExtras, localidadesGeo, vigentesDisponibilidad ?? new Map());
  }, [ciclo, vigentesDisponibilidad]);

  const { estado: vigentesEstado, vigentesPorPartido: vigentes } = useVigentesPorCiclo(cicloId);

  const resultadosConDecision = useMemo(() => conDecisionVigente(resultados, vigentes), [resultados, vigentes]);

  const decidirYActualizar = async ({ partidoId, arbitroId, esSugerido, motivo }) => {
    const resultado = await decidirDesignacion({ cicloId, partidoId, arbitroId, esSugerido, motivo, decididoPorRol: "comite" });
    if (resultado.ok) {
      registrarDecision(cicloId, partidoId, resultado.designacion);
    }
    return resultado;
  };

  const nDecididos = resultadosConDecision.filter((r) => r.decisionVigente).length;
  const nRevisar = resultadosConDecision.filter((r) => !r.decisionVigente && r.requiereRevision).length;
  const nAutoConfirmable = resultadosConDecision.length - nDecididos - nRevisar;
  const situacionesSensibles = resultadosConDecision.filter((r) => r.partido.sensible);

  return (
    <div className="space-y-5">
      {situacionesSensibles.length > 0 && (
        <Panel title={`Situaciones a tener en cuenta esta jornada · ${situacionesSensibles.length}`}>
          <p className="text-xs mb-3" style={{ color: N.ink70 }}>
            Partidos con algo que el comité debería valorar al confirmar — derbis, historial de tarjetas entre estos equipos,
            partidos con mucho en juego. No bloquean la decisión, es contexto para tomarla con criterio.
          </p>
          <div className="space-y-2">
            {situacionesSensibles.map((r) => (
              <div key={r.partido.id} className="rounded border p-3 flex items-start justify-between gap-3 flex-wrap cursor-pointer hover:bg-[rgba(255,255,255,.04)]"
                style={{ borderColor: N.rule }} onClick={() => (onIrAPartido ? onIrAPartido(r.partido.id) : setExpandidoId(r.partido.id))}>
                <div>
                  <div className="text-sm font-medium" style={{ color: N.ink }}>{r.partido.equipoLocal} – {r.partido.equipoVisitante}</div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: VIZ.estado.warning }}>
                    <AlertTriangle size={11} /> {r.partido.motivoSensible}
                  </div>
                  {r.asignado && <div className="text-xs mt-1" style={{ color: N.ink40 }}>Sugerido: <span style={{ color: N.ink }}>{r.asignado.arbitro.n}</span></div>}
                </div>
                <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: T.primary }}>Ir al partido <ChevronRight size={12} /></span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="rounded-md border-2 border-dashed p-4 flex items-start gap-3" style={{ borderColor: T.accent, background: T.accentTint }}>
        <Info size={18} className="mt-0.5 shrink-0" style={{ color: N.ambar }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: N.ambarInk }}>Motor v0 — asignación por lote, no operativo todavía</div>
          <p className="text-xs mt-0.5" style={{ color: N.ambarInk }}>
            Procesa toda la jornada a la vez (evita que el mismo árbitro salga sugerido en dos partidos simultáneos), con
            filtro duro real, score B.1 con shrinkage, y coste desglosado (tarifas.md). B.3, A.5 y la optimización global
            (húngaro sobre toda la jornada en vez de greedy por categoría) siguen pendientes — ver decisiones-producto.md.
          </p>
        </div>
      </div>

      <Panel title="Ciclo de asignación" right={
        <select value={cicloId} onChange={(e) => { setCicloId(e.target.value); setExpandidoId(null); setVigentesDisponibilidad(null); }}
          className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70, background: N.card }}>
          {ciclosAsignacion.map((c) => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
        </select>
      }>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5" style={{ color: N.ink }}><Calendar size={14} style={{ color: N.ink40 }} /> {ciclo.finDeSemana}</span>
          <span style={{ color: N.ink70 }}>{resultados.length} partidos</span>
          <span style={{ color: nRevisar > 0 ? N.ambar : N.verde }} className="font-medium">
            {nRevisar} para revisar · {nDecididos} decididos · {nAutoConfirmable} auto-confirmables
          </span>
        </div>
      </Panel>

      {vigentesEstado === "error" && (
        <p className="text-xs rounded px-3 py-2" style={{ color: N.rojo, background: N.rojoT }}>
          No se pudieron cargar las decisiones ya tomadas para esta jornada. Comprueba la conexión y recarga antes de confirmar o cambiar candidatos.
        </p>
      )}

      <Panel title="Partidos de la jornada">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Partido", "Árbitro asignado", "Estado", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-semibold border-b"
                    style={{ color: N.ink40, borderColor: N.rule }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultadosConDecision.map((r) => (
                <FilaJornada key={r.partido.id} r={r} T={T} expandido={expandidoId === r.partido.id}
                  onToggle={() => setExpandidoId(expandidoId === r.partido.id ? null : r.partido.id)}
                  onDecidir={decidirYActualizar} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs px-1 mt-4" style={{ color: N.ink40 }}>
          Cadencia acordada: las dos primeras jornadas se asignan de golpe al arrancar; a partir de ahí, cada lunes se
          asigna el fin de semana que empieza la semana siguiente, para que el árbitro se organice con antelación.
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------- vistas previas (v2/v3) ------------------------------- */
/* Roles (004), Equipos (005) y Partidos (006): prototipos de demo sin spec formal
   todavía (decisión explícita de Roberto, 30 jul 2026, ver decisiones-producto.md §25)
   — mismo patrón visual de BannerV2 que Recomendaciones/Económico/IA, ningún botón
   hace nada real. */
const CUENTAS_EJEMPLO = [
  { nombre: "Marisa Andújar Coll", rol: "Comité técnico", estado: "Activa", ultimo: "hace 2 días" },
  { nombre: "Pau Llorens Sanchis", rol: "Árbitro", estado: "Invitación enviada", ultimo: "—" },
  { nombre: "Ferran Botella Ibáñez", rol: "Informador", estado: "Activa", ultimo: "hace 5 días" },
];

function VistaRoles({ T }) {
  return (
    <div>
      <BannerV2 T={T} version="004 · Roles y permisos"
        texto="Acceso real por enlace mágico (sin contraseña) y panel de administración de cuentas. Se activa en 3 fases: hoy (demo, sin cuentas), comité con datos reales, y por último árbitros por categoría. Bloqueante: hace falta el email oficial verificado de cada árbitro antes de poder darle de alta." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Ejemplo · acceso por enlace mágico">
          <div className="max-w-sm space-y-3 opacity-90">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Correo electrónico</label>
              <input disabled placeholder="nombre.apellido@arbitrosffcv.es"
                className="w-full text-sm rounded border px-3 py-2 cursor-not-allowed" style={{ borderColor: N.rule, background: N.paper, color: N.ink40 }} />
            </div>
            <button disabled className="w-full text-xs rounded px-4 py-2 font-medium cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{ background: N.rule, color: N.ink40 }}>
              <MailCheck size={13} /> Enviar enlace mágico (disponible en 004)
            </button>
          </div>
        </Panel>
        <Panel title="Ejemplo · administración de cuentas">
          <div className="space-y-2 opacity-90">
            {CUENTAS_EJEMPLO.map((c, i) => (
              <div key={i} className="rounded border p-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: N.rule }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: N.ink }}>{c.nombre}</div>
                  <div className="text-xs mt-0.5" style={{ color: N.ink40 }}>{c.rol} · último acceso {c.ultimo}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] rounded px-2 py-0.5" style={{ background: c.estado === "Activa" ? N.verdeT : N.ambarT, color: c.estado === "Activa" ? N.verde : N.ambar }}>{c.estado}</span>
                  <button disabled className="cursor-not-allowed" style={{ color: N.ink40 }}><UserCog size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* Medias por categoría, calculadas una vez sobre EQUIPOS (dato real) — usadas para
   contextualizar la ficha de cada equipo ("por encima/debajo de la media de su grupo"). */
const MEDIAS_POR_CATEGORIA = (() => {
  const acc = {};
  for (const e of EQUIPOS) {
    if (!e.partidosJugados) continue;
    const c = acc[e.categoria] || { pj: 0, gf: 0, gc: 0, am: 0, ro: 0 };
    c.pj += e.partidosJugados; c.gf += e.golesFavor; c.gc += e.golesContra; c.am += e.amarillas; c.ro += e.rojas;
    acc[e.categoria] = c;
  }
  const medias = {};
  for (const [cat, c] of Object.entries(acc)) {
    medias[cat] = { golesPorPartido: c.gf / c.pj, amarillasPorPartido: c.am / c.pj, rojasPorPartido: c.ro / c.pj };
  }
  return medias;
})();

function VistaEquipos({ T }) {
  const [sel, setSel] = useState(null);
  return sel ? <FichaEquipo T={T} equipo={sel} back={() => setSel(null)} /> : <ListadoEquipos T={T} onPick={setSel} />;
}

function ListadoEquipos({ T, onPick }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const categorias = useMemo(() => ["Todas", ...new Set(EQUIPOS.map((e) => e.categoria))], []);
  const filtrados = useMemo(() => EQUIPOS.filter((e) =>
    (cat === "Todas" || e.categoria === cat) && (q.trim() === "" || e.nombre.toLowerCase().includes(q.trim().toLowerCase()))
  ), [q, cat]);

  return (
    <div className="space-y-5">
      <div className="rounded-md border p-3 flex items-center gap-2 text-xs" style={{ borderColor: N.rule, background: "rgba(255,255,255,.03)", color: N.ink70 }}>
        <Info size={13} style={{ color: N.ink40 }} />
        {EQUIPOS.length} equipos sobre {nf(agregadosReales.total_partidos_categoria_adulta)} partidos reales de la temporada 25/26
        (ffcv_public_data/) — sin sanciones disciplinarias ni titulares más frecuentes: no hay alineaciones en el scraping, solo goles y tarjetas.
      </div>
      <Panel title={`Equipos · ${filtrados.length} de ${EQUIPOS.length}`} right={
        <div className="flex gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)}
            className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70, background: N.card }}>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo…"
            className="text-xs rounded border px-2 py-1.5 outline-none w-40" style={{ borderColor: N.rule, color: N.ink, background: N.card }} />
        </div>
      }>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtrados.slice(0, 60).map((e) => (
            <button key={e.id} onClick={() => onPick(e)} className="text-left rounded border p-4 hover:bg-[rgba(255,255,255,.04)] transition-colors" style={{ borderColor: N.rule }}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium" style={{ color: N.ink }}>{e.nombre}</div>
                <Trophy size={14} style={{ color: N.ink40 }} />
              </div>
              <span className="text-[11px] rounded px-2 py-0.5 inline-block mt-1.5" style={{ background: T.tint, color: T.primary }}>{e.categoria}</span>
              <div className="text-xs mt-3 flex items-center gap-3" style={{ color: N.ink70 }}>
                <span><span style={{ color: N.ink40 }}>PJ</span> {e.partidosJugados}</span>
                <span><span style={{ color: N.ink40 }}>GF</span> {e.golesFavor}</span>
                <span><span style={{ color: N.ink40 }}>GC</span> {e.golesContra}</span>
              </div>
              {e.top_goleadores[0] && (
                <div className="text-xs mt-2" style={{ color: N.ink70 }}>
                  <span style={{ color: N.ink40 }}>Máx. goleador: </span>{e.top_goleadores[0].nombre} ({e.top_goleadores[0].goles})
                </div>
              )}
            </button>
          ))}
        </div>
        {filtrados.length > 60 && (
          <p className="text-[11px] mt-3 text-center" style={{ color: N.ink40 }}>
            Mostrando los primeros 60 de {filtrados.length} — afina la búsqueda o filtra por categoría para acotar.
          </p>
        )}
      </Panel>
    </div>
  );
}

function FichaEquipo({ T, equipo: e, back }) {
  const media = MEDIAS_POR_CATEGORIA[e.categoria];
  const golesPartido = e.partidosJugados ? e.golesFavor / e.partidosJugados : 0;
  const amarillasPartido = e.partidosJugados ? e.amarillas / e.partidosJugados : 0;
  const pctVictorias = e.partidosJugados ? Math.round((e.victorias / e.partidosJugados) * 100) : 0;

  const insights = [];
  if (media) {
    if (golesPartido >= media.golesPorPartido * 1.2) insights.push({ tono: "warn", texto: `Ataque por encima de la media de ${e.categoria}: ${golesPartido.toFixed(2)} goles/partido frente a ${media.golesPorPartido.toFixed(2)} de media del grupo. Es un equipo que suele generar volumen ofensivo.` });
    else if (golesPartido <= media.golesPorPartido * 0.7) insights.push({ tono: undefined, texto: `Ataque por debajo de la media de ${e.categoria}: ${golesPartido.toFixed(2)} goles/partido frente a ${media.golesPorPartido.toFixed(2)} de media del grupo.` });
    if (amarillasPartido >= media.amarillasPorPartido * 1.25) insights.push({ tono: "warn", texto: `Disciplina más tensa que la media: ${amarillasPartido.toFixed(2)} amarillas/partido frente a ${media.amarillasPorPartido.toFixed(2)} de media de ${e.categoria}. Contexto a tener en cuenta para la gestión de tarjetas.` });
  }
  if (pctVictorias >= 65) insights.push({ tono: undefined, texto: `Buena racha de resultados: gana el ${pctVictorias}% de sus partidos — puede jugar con más intensidad al ir por delante en el marcador.` });

  return (
    <div className="space-y-5">
      <button onClick={back} className="text-xs flex items-center gap-1 font-medium" style={{ color: T.primary }}>
        <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} /> Volver a equipos
      </button>

      <div className="rounded-md overflow-hidden" style={{ background: T.deep }}>
        <div className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Trophy size={22} style={{ color: "#FFF" }} />
          </div>
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] mb-1" style={{ color: T.accent }}>{e.categoria.toUpperCase()} · {e.grupo}</div>
            <div className="text-white text-xl font-semibold">{e.nombre}</div>
          </div>
        </div>
        <div className="h-1" style={{ background: T.accent }} />
      </div>

      <div className="rounded border px-3 py-2 flex items-center gap-2 text-[11px]" style={{ borderColor: N.rule, color: N.ink40, background: "rgba(255,255,255,.03)" }}>
        <Info size={12} />
Datos generados el {equiposRealesData.generado} a partir de {equiposRealesData.fuente}. Se actualizan cuando se relance el scraper tras cada jornada que publique la FFCV — cadencia real (¿miércoles?) pendiente de confirmar, no asumida.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard T={T} eyebrow="Partidos jugados" valor={e.partidosJugados} sub="temporada 25/26 · real" />
        <KpiCard T={T} eyebrow="V-E-D" valor={`${e.victorias}-${e.empates}-${e.derrotas}`} sub={`${pctVictorias}% victorias · real`} />
        <KpiCard T={T} eyebrow="Goles" valor={`${e.golesFavor}-${e.golesContra}`} sub={`diferencia ${e.golesFavor - e.golesContra >= 0 ? "+" : ""}${e.golesFavor - e.golesContra} · real`} />
        <KpiCard T={T} eyebrow="Tarjetas" valor={`${e.amarillas} / ${e.rojas}`} tone={e.rojas > 3 ? "warn" : undefined} sub="amarillas / rojas · real" />
      </div>

      <Panel title="Insights para el árbitro">
        {insights.length === 0 ? (
          <p className="text-sm" style={{ color: N.ink70 }}>Sin patrones destacables frente a la media de su categoría con el volumen de partidos disponible.</p>
        ) : (
          <div className="space-y-2.5">
            {insights.map((ins, i) => (
              <div key={i} className="rounded border p-3 flex items-start gap-2.5" style={{ borderColor: N.rule }}>
                {ins.tono === "warn" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: VIZ.estado.warning }} /> : <Info size={14} className="mt-0.5 shrink-0" style={{ color: N.ink40 }} />}
                <p className="text-sm" style={{ color: N.ink }}>{ins.texto}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
          Comparación estadística simple contra la media de {e.categoria} ({e.grupo}) — no es una recomendación validada por el comité, es una lectura directa del dato real.
        </p>
      </Panel>

      <Panel title="Máximos goleadores (temporada 25/26, real)">
        {e.top_goleadores.length === 0 ? (
          <p className="text-sm" style={{ color: N.ink40 }}>Sin goles de jugador identificado registrados para este equipo.</p>
        ) : (
          <div className="space-y-2">
            {e.top_goleadores.map((g, i) => (
              <div key={g.nombre} className="flex items-center justify-between rounded border p-2.5" style={{ borderColor: N.rule }}>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs w-4" style={{ color: N.ink40 }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: N.ink }}>{g.nombre}</span>
                </div>
                <span className="font-mono text-sm tabular-nums" style={{ color: T.primary }}>{g.goles}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* Biblioteca de heurísticas de cruce — heurística propia del equipo de producto,
   NO validada por el comité (ver Roberto, 30 jul 2026). Siempre en condicional
   ("suele", "posible"), nunca como certeza. Con el tiempo se perfeccionará con el
   dato real de si la recomendación se cumplió o no (fuera de alcance hoy). */
const REGLAS_CRUCE = [
  {
    test: (a, b, m) => a.gpp >= m.golesPorPartido * 1.15 && b.gpp >= m.golesPorPartido * 1.15,
    texto: () => `Ambos equipos anotan por encima de la media de su categoría: partido probablemente abierto, con más ocasiones claras de las habituales. Suele venir con más protestas en jugadas de gol y presión en el área.`,
  },
  {
    test: (a, b, m) => a.gpp <= m.golesPorPartido * 0.7 && b.gpp <= m.golesPorPartido * 0.7,
    texto: () => `Ambos equipos anotan por debajo de la media: partido probablemente cerrado y de pocas ocasiones — cuando esto ocurre, una sola decisión (un penalti, una expulsión) suele pesar más de lo habitual en el resultado.`,
  },
  {
    test: (a, b, m) => a.amp >= m.amarillasPorPartido * 1.25 && b.amp >= m.amarillasPorPartido * 1.25,
    texto: (a, b) => `${a.nombre} y ${b.nombre} muestran tarjetas por encima de la media de su categoría: historial de tensión disciplinaria en ambos. Suele ayudar marcar criterio de tarjetas pronto en vez de esperar a la primera entrada dura.`,
  },
  {
    test: (a, b) => Math.abs(a.pctVictorias - b.pctVictorias) >= 40,
    texto: (a, b) => `Diferencia grande de rendimiento (${a.pctVictorias}% vs ${b.pctVictorias}% de victorias): posible partido con un dominador claro. Vigilar tanto la relajación del favorito con el marcador a favor como la frustración/tarjetas del equipo por detrás si el resultado se decanta pronto.`,
  },
  {
    test: (a, b) => (a.rpp >= 0.15 || b.rpp >= 0.15),
    texto: (a, b) => `${a.rpp >= 0.15 ? a.nombre : b.nombre} tiene un historial de expulsiones por encima de lo habitual (más de una roja cada ~7 partidos) — vigilar comportamientos límite, no solo entradas fuertes.`,
  },
];

function generarInsightsCruce(equipoLocal, equipoVisitante) {
  const prep = (e) => ({
    nombre: e.nombre,
    gpp: e.partidosJugados ? e.golesFavor / e.partidosJugados : 0,
    amp: e.partidosJugados ? e.amarillas / e.partidosJugados : 0,
    rpp: e.partidosJugados ? e.rojas / e.partidosJugados : 0,
    pctVictorias: e.partidosJugados ? Math.round((e.victorias / e.partidosJugados) * 100) : 0,
  });
  const a = prep(equipoLocal), b = prep(equipoVisitante);
  const m = MEDIAS_POR_CATEGORIA[equipoLocal.categoria] || MEDIAS_POR_CATEGORIA[equipoVisitante.categoria] || { golesPorPartido: 1.3, amarillasPorPartido: 2.5 };
  return REGLAS_CRUCE.filter((r) => r.test(a, b, m)).map((r) => r.texto(a, b, m));
}

function SelectorEquipo({ label, value, onChange, opciones = EQUIPOS }) {
  return (
    <div className="flex-1 min-w-[200px]">
      <label className="text-[10px] uppercase tracking-[0.14em] font-semibold block mb-1" style={{ color: N.ink40 }}>{label}</label>
      <select value={value?.id ?? ""} onChange={(e) => onChange(opciones.find((eq) => eq.id === e.target.value) ?? null)}
        className="w-full text-sm rounded border px-3 py-2 outline-none" style={{ borderColor: N.rule, color: N.ink, background: N.card }}>
        <option value="">Elegir equipo…</option>
        {opciones.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.categoria}</option>)}
      </select>
    </div>
  );
}

function ComparativaEquipos({ T, local, visitante }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[local, visitante].map((e, i) => (
        <div key={e.id} className="rounded border p-4" style={{ borderColor: N.rule }}>
          <div className="text-sm font-semibold mb-2" style={{ color: i === 0 ? T.primary : N.ink }}>{e.nombre}</div>
          <span className="text-[11px] rounded px-2 py-0.5 inline-block mb-3" style={{ background: T.tint, color: T.primary }}>{e.categoria}</span>
          <div className="text-xs space-y-1.5" style={{ color: N.ink70 }}>
            <div>PJ <b style={{ color: N.ink }}>{e.partidosJugados}</b> · V-E-D <b style={{ color: N.ink }}>{e.victorias}-{e.empates}-{e.derrotas}</b></div>
            <div>Goles <b style={{ color: N.ink }}>{e.golesFavor}-{e.golesContra}</b></div>
            <div>Tarjetas <b style={{ color: N.ink }}>{e.amarillas} / {e.rojas}</b> (amarillas / rojas)</div>
            {e.top_goleadores[0] && <div>Máx. goleador <b style={{ color: N.ink }}>{e.top_goleadores[0].nombre}</b> ({e.top_goleadores[0].goles})</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightsCruce({ local, visitante }) {
  const insights = generarInsightsCruce(local, visitante);
  return insights.length === 0 ? (
    <p className="text-sm" style={{ color: N.ink70 }}>Sin patrones destacables entre estos dos equipos con las reglas actuales — no significa que el partido no tenga historia, solo que no encaja en ninguna de las heurísticas construidas hasta ahora.</p>
  ) : (
    <div className="space-y-2.5">
      {insights.map((texto, i) => (
        <div key={i} className="rounded border p-3 flex items-start gap-2.5" style={{ borderColor: "#F59B1E", background: N.ambarT }}>
          <Goal size={14} className="mt-0.5 shrink-0" style={{ color: N.ambar }} />
          <p className="text-sm" style={{ color: N.ambarInk }}>{texto}</p>
        </div>
      ))}
    </div>
  );
}

/* Emparejar nombres de equipo de ciclos-asignacion.json (calendario de demo,
   construido a mano) con equipos-reales.json (scraping) — son dos universos de
   nombres construidos por separado, no hay garantía de coincidencia 1:1. Mejor
   esfuerzo por normalización + prefijo, no siempre encuentra pareja. */
function normalizarNombreEquipo(s) {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/["'.]/g, "").replace(/\s+/g, " ").trim();
}
function buscarEquipoReal(nombre) {
  const norm = normalizarNombreEquipo(nombre);
  return EQUIPOS.find((e) => normalizarNombreEquipo(e.nombre) === norm)
    ?? EQUIPOS.find((e) => { const en = normalizarNombreEquipo(e.nombre); return en.startsWith(norm) || norm.startsWith(en); })
    ?? null;
}

/* Partidos de los 3 ciclos de demo con árbitro asignado/decidido real —
   compartido entre el enlace "ir al partido" de Designación y la lista de
   Partidos, para que sea literalmente la misma ficha en los dos sitios. */
const CICLO_IDS = ciclosAsignacion.map((c) => c.id);

function useJornadasConDesignacion() {
  const vigentesPorCiclos = useVigentesPorCiclos(CICLO_IDS);
  const cargando = vigentesPorCiclos.some((v) => v.estado === "cargando");

  const filas = useMemo(() => {
    const arbitrosConExtras = ARBITROS.map(conDisponibilidad);
    const todas = [];
    for (const ciclo of ciclosAsignacion) {
      const resultados = asignarJornada(ciclo.partidos, arbitrosConExtras, localidadesGeo);
      const vig = vigentesPorCiclos.find((v) => v.cicloId === ciclo.id);
      const conDecision = vig && vig.estado !== "error"
        ? conDecisionVigente(resultados, vig.vigentesPorPartido)
        : resultados.map((r) => ({ ...r, decisionVigente: null }));
      for (const r of conDecision) todas.push({ ...r, cicloEtiqueta: ciclo.finDeSemana });
    }
    return todas;
  }, [vigentesPorCiclos]);

  return { estado: cargando ? "cargando" : "listo", filas };
}

function FichaPartidoJornada({ T, fila, back }) {
  const { partido, asignado, decisionVigente, cicloEtiqueta } = fila;
  const local = buscarEquipoReal(partido.equipoLocal);
  const visitante = buscarEquipoReal(partido.equipoVisitante);
  const arbitroNombre = decisionVigente ? candidatoPorId(fila, decisionVigente.arbitroId)?.n : asignado?.arbitro?.n;

  return (
    <div className="space-y-5">
      <button onClick={back} className="text-xs flex items-center gap-1 font-medium" style={{ color: T.primary }}>
        <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} /> Volver a partidos
      </button>

      <div className="rounded-md border p-4" style={{ borderColor: N.rule, background: N.card }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: N.ink }}>{partido.equipoLocal}</span>
            <Swords size={15} style={{ color: N.ink40 }} />
            <span className="text-sm font-medium" style={{ color: N.ink }}>{partido.equipoVisitante}</span>
          </div>
          <span className="text-[11px] rounded px-2 py-0.5" style={{ background: T.tint, color: T.primary }}>{partido.categoriaMinima} · {cicloEtiqueta}</span>
        </div>
        {partido.sensible && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: VIZ.estado.warning }}>
            <AlertTriangle size={12} /> {partido.motivoSensible}
          </div>
        )}
        <div className="mt-3 text-xs" style={{ color: N.ink70 }}>
          Árbitro {decisionVigente ? "decidido" : "sugerido"}: <b style={{ color: T.primary }}>{arbitroNombre ?? "sin candidato"}</b>
        </div>
      </div>

      {local && visitante ? (
        <>
          <Panel title="Comparativa" right={<span className="text-[11px]" style={{ color: N.ink40 }}>real · temporada 25/26</span>}>
            <ComparativaEquipos T={T} local={local} visitante={visitante} />
          </Panel>
          <Panel title="Insights del cruce para el árbitro">
            <InsightsCruce local={local} visitante={visitante} />
          </Panel>
        </>
      ) : (
        <Panel title="Comparativa">
          <p className="text-sm" style={{ color: N.ink70 }}>
            No se encontró ficha real de equipo para {!local ? partido.equipoLocal : partido.equipoVisitante} — el calendario
            de demo (ciclos-asignacion.json) y el scraping real (equipos-reales.json) son dos universos de nombres
            construidos por separado, sin garantía de coincidencia exacta. Pendiente de unificar cuando 006-partidos se
            implemente de verdad.
          </p>
        </Panel>
      )}
    </div>
  );
}

function VistaPartidos({ T, partidoDestacadoId, onConsumirDestacado }) {
  const { filas } = useJornadasConDesignacion();
  const [verComo, setVerComo] = useState("comite");
  const [arbitroId, setArbitroId] = useState(ARBITROS[0]?.id ?? null);
  const [catFiltro, setCatFiltro] = useState("Todas");
  const [partidoSelManual, setPartidoSelManual] = useState(null);
  const [local, setLocal] = useState(EQUIPOS.find((e) => e.nombre === "At. Saguntino") ?? EQUIPOS[0]);
  const [visitante, setVisitante] = useState(EQUIPOS.find((e) => e.nombre.includes("Roda")) ?? EQUIPOS[1]);
  const [catComparador, setCatComparador] = useState("Todas");

  /* partidoSel se deriva en el propio render (nunca con un efecto que llame a
     setState) — combina el clic manual en la lista con el enlace "ir al partido"
     de Designación (prop controlada por el shell, ver irAPartido). */
  const partidoSel = partidoSelManual ?? (partidoDestacadoId ? filas.find((f) => f.partido.id === partidoDestacadoId) ?? null : null);
  const volverAlListado = () => { setPartidoSelManual(null); onConsumirDestacado?.(); };

  const filasFiltradas = useMemo(() => filas.filter((f) => {
    if (catFiltro !== "Todas" && f.partido.categoriaMinima !== catFiltro) return false;
    if (verComo === "arbitro" && arbitroId) {
      const idDecidido = f.decisionVigente?.arbitroId;
      const idAsignado = f.asignado?.arbitro?.id;
      return idDecidido === arbitroId || (!idDecidido && idAsignado === arbitroId);
    }
    return true;
  }), [filas, catFiltro, verComo, arbitroId]);

  const categoriasEquipos = useMemo(() => ["Todas", ...new Set(EQUIPOS.map((e) => e.categoria))], []);
  const equiposComparador = useMemo(() => catComparador === "Todas" ? EQUIPOS : EQUIPOS.filter((e) => e.categoria === catComparador), [catComparador]);

  if (partidoSel) return <FichaPartidoJornada T={T} fila={partidoSel} back={volverAlListado} />;

  return (
    <div className="space-y-5">
      <div className="rounded-md border-2 border-dashed p-4 flex items-start gap-3" style={{ borderColor: T.accent, background: T.accentTint }}>
        <Info size={18} className="mt-0.5 shrink-0" style={{ color: N.ambar }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: N.ambarInk }}>Prepartido con dato real + heurística propia</div>
          <p className="text-xs mt-0.5" style={{ color: N.ambarInk }}>
            Los KPIs de cada equipo son reales (ffcv_public_data/). Los insights de cruce son una <b>heurística propia del
            equipo de producto, sin validar todavía con el comité</b> — se leen como probabilidad, no como certeza.
          </p>
        </div>
      </div>

      <Panel title="Ver como">
        <div className="flex items-center gap-2 flex-wrap">
          {[["comite", "Comité / directiva"], ["arbitro", "Árbitro"], ["informador", "Informador"]].map(([val, label]) => (
            <button key={val} onClick={() => setVerComo(val)} className="text-xs rounded-full px-3 py-1.5 font-medium transition-colors"
              style={{ background: verComo === val ? T.primary : "transparent", color: verComo === val ? "#FFF" : N.ink70, border: `1px solid ${verComo === val ? T.primary : N.rule}` }}>
              {label}
            </button>
          ))}
          {verComo === "arbitro" && (
            <select value={arbitroId ?? ""} onChange={(e) => setArbitroId(e.target.value ? Number(e.target.value) : null)}
              className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
              {ARBITROS.map((a) => <option key={a.id} value={a.id}>{a.n}</option>)}
            </select>
          )}
        </div>
        {verComo === "informador" && (
          <p className="text-[11px] mt-2" style={{ color: N.ink40 }}>
            De momento ve lo mismo que comité/directiva — falta el modelo de datos de asignación informador↔partido (hoy solo existe designación de árbitro). Pendiente, ver decisiones-producto.md.
          </p>
        )}
      </Panel>

      <Panel title={`Partidos de la jornada · ${filasFiltradas.length}`} right={
        <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}
          className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
          {categoriasEquipos.map((c) => <option key={c}>{c}</option>)}
        </select>
      }>
        {filasFiltradas.length === 0 ? (
          <p className="text-sm" style={{ color: N.ink40 }}>Sin partidos para este filtro.</p>
        ) : (
          <div className="space-y-2">
            {filasFiltradas.map((f) => (
              <div key={f.partido.id} onClick={() => setPartidoSelManual(f)}
                className="rounded border p-3 flex items-center justify-between gap-3 flex-wrap cursor-pointer hover:bg-[rgba(255,255,255,.04)]" style={{ borderColor: N.rule }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: N.ink }}>{f.partido.equipoLocal} – {f.partido.equipoVisitante}</div>
                  <div className="text-xs mt-0.5" style={{ color: N.ink40 }}>{f.partido.categoriaMinima} · {f.partido.fecha} · {f.cicloEtiqueta}</div>
                </div>
                <ChevronRight size={14} style={{ color: N.ink40 }} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Comparador libre de equipos" right={
        <select value={catComparador} onChange={(e) => setCatComparador(e.target.value)}
          className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70 }}>
          {categoriasEquipos.map((c) => <option key={c}>{c}</option>)}
        </select>
      }>
        <div className="flex items-end gap-3 flex-wrap mb-4">
          <SelectorEquipo label="Equipo local" value={local} onChange={setLocal} opciones={equiposComparador} />
          <Swords size={18} className="mb-2.5 shrink-0" style={{ color: N.ink40 }} />
          <SelectorEquipo label="Equipo visitante" value={visitante} onChange={setVisitante} opciones={equiposComparador} />
        </div>
        {local && visitante && (
          <div className="space-y-4">
            <ComparativaEquipos T={T} local={local} visitante={visitante} />
            <InsightsCruce local={local} visitante={visitante} />
          </div>
        )}
      </Panel>
    </div>
  );
}

/* Recomendaciones (antigua vista previa v2) se fusionó dentro de Designación
   el 30 jul 2026 — ver panel "Situaciones a tener en cuenta" en DesignacionInteligente,
   que usa el campo real partido.sensible/motivoSensible en vez de datos de ejemplo. */

function VistaIA({ T }) {
  return (
    <div>
      <BannerV2 T={T} version="Versión 3"
        texto="Consultas en lenguaje natural respondidas con vuestros propios datos. Cuanto más histórico haya cargado, mejores respuestas." />
      <Panel title="Ejemplo · consulta al asistente">
        <div className="space-y-3 max-w-2xl opacity-90">
          <div className="flex justify-end">
            <div className="rounded-lg px-4 py-2.5 text-sm max-w-[80%]" style={{ background: T.deep, color: "#FFF" }}>
              ¿Qué árbitros de Preferente están en forma y tienen menos de 3 fines de semana de indisponibilidad?
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: T.accentTint }}>
              <Bot size={16} style={{ color: N.ambar }} />
            </div>
            <div className="rounded-lg border px-4 py-2.5 text-sm max-w-[80%]" style={{ borderColor: N.rule, color: N.ink70 }}>
              Dos colegiados cumplen ambos criterios: <span className="font-medium" style={{ color: N.ink }}>Aitana Sospedra Gil</span> (media 8,8, tendencia ascendente, 1 fin de semana solicitado) y <span className="font-medium" style={{ color: N.ink }}>Marc Devesa Ribó</span> (media 8,1, estable, 2 solicitados). ¿Quieres ver sus expedientes?
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5 max-w-2xl">
          <input disabled placeholder="Disponible en la versión 3, cuando la base de datos esté poblada…"
            className="flex-1 text-sm rounded border px-3 py-2 cursor-not-allowed" style={{ borderColor: N.rule, background: N.paper, color: N.ink40 }} />
          <button disabled className="rounded px-3 py-2 cursor-not-allowed" style={{ background: N.rule }}>
            <Send size={14} style={{ color: N.ink40 }} />
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* Seguimiento operativo (antes "Económico") — renombrado 30 jul 2026 a propósito
   menos vistoso: control interno del motor de designación, no algo de cara al comité.
   Calculado de verdad sobre los 3 ciclos de ciclos-asignacion.json y las decisiones
   ya persistidas en Supabase (designacionesRepo) — no son cifras de ejemplo, aunque
   la base sea pequeña (30 partidos de demo, no la temporada completa). */
function useResumenOperativo() {
  const [notasEstado, setNotasEstado] = useState("cargando"); // cargando | listo
  const [totalAnotaciones, setTotalAnotaciones] = useState(null);
  const vigentesPorCiclos = useVigentesPorCiclos(CICLO_IDS);
  const cargandoVigentes = vigentesPorCiclos.some((v) => v.estado === "cargando");
  const todosLosCiclosFallaron = vigentesPorCiclos.every((v) => v.estado === "error");

  useEffect(() => {
    let cancelado = false;
    contarAnotaciones().then((notas) => {
      if (cancelado) return;
      setTotalAnotaciones(notas.ok ? notas.total : null);
      setNotasEstado("listo");
    });
    return () => { cancelado = true; };
  }, []);

  const acc = useMemo(() => {
    const base = {
      totalPartidos: 0, decididos: 0, ajustesManuales: 0,
      sensiblesDetectadas: 0, sensiblesResueltas: 0,
      costeSiSugerido: 0, costeSiDecidido: 0, kmSugerido: 0, kmDecidido: 0,
      partidosConCoste: 0,
    };
    const arbitrosConExtras = ARBITROS.map(conDisponibilidad);
    for (const ciclo of ciclosAsignacion) {
      const resultados = asignarJornada(ciclo.partidos, arbitrosConExtras, localidadesGeo);
      const vig = vigentesPorCiclos.find((v) => v.cicloId === ciclo.id);
      if (!vig || vig.estado === "error") continue;
      const conDecision = conDecisionVigente(resultados, vig.vigentesPorPartido);
      for (const res of conDecision) {
        base.totalPartidos++;
        if (res.partido.sensible) {
          base.sensiblesDetectadas++;
          if (res.decisionVigente) base.sensiblesResueltas++;
        }
        const costeSugerido = res.asignado?.coste;
        if (costeSugerido?.costeFederacionEstimado != null) {
          base.costeSiSugerido += costeSugerido.costeFederacionEstimado;
          base.kmSugerido += costeSugerido.distanciaKmAprox ?? 0;
          base.partidosConCoste++;
        }
        if (res.decisionVigente) {
          base.decididos++;
          if (!res.decisionVigente.esSugerido) base.ajustesManuales++;
          const idDecidido = res.decisionVigente.arbitroId;
          const costeDecidido = res.asignado?.arbitro?.id === idDecidido
            ? res.asignado.coste
            : res.alternativas.find((a) => a.arbitro.id === idDecidido)?.coste;
          if (costeDecidido?.costeFederacionEstimado != null) {
            base.costeSiDecidido += costeDecidido.costeFederacionEstimado;
            base.kmDecidido += costeDecidido.distanciaKmAprox ?? 0;
          }
        } else if (costeSugerido?.costeFederacionEstimado != null) {
          base.costeSiDecidido += costeSugerido.costeFederacionEstimado;
          base.kmDecidido += costeSugerido.distanciaKmAprox ?? 0;
        }
      }
    }
    return base;
  }, [vigentesPorCiclos]);

  if (cargandoVigentes || notasEstado === "cargando") return { estado: "cargando", r: null };
  if (todosLosCiclosFallaron) return { estado: "error", r: null };
  return { estado: "listo", r: { ...acc, totalAnotaciones } };
}

function VistaSeguimientoOperativo({ T }) {
  const { estado, r } = useResumenOperativo();

  if (estado === "cargando") {
    return <p className="text-sm" style={{ color: N.ink40 }}>Calculando sobre los ciclos de designación…</p>;
  }
  if (estado !== "listo" || !r) {
    return <p className="text-sm" style={{ color: VIZ.estado.critical }}>No se pudo calcular el seguimiento operativo. Recarga la página.</p>;
  }

  const diferenciaCoste = r.costeSiDecidido - r.costeSiSugerido;
  const tasaAceptacionTop1 = r.decididos > 0 ? Math.round(((r.decididos - r.ajustesManuales) / r.decididos) * 100) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-md border-2 border-dashed p-4 flex items-start gap-3" style={{ borderColor: N.rule, background: "rgba(255,255,255,.03)" }}>
        <Info size={18} className="mt-0.5 shrink-0" style={{ color: N.ink40 }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: N.ink }}>Control interno, no una vista de producto</div>
          <p className="text-xs mt-0.5" style={{ color: N.ink70 }}>
            Sirve para que el equipo técnico vea cómo se está adoptando el motor de designación, no para enseñar al comité.
            Calculado sobre los {r.totalPartidos} partidos de los 3 ciclos de demo cargados hoy — a más volumen real, esta
            base crece sola, no hay nada sintético en el cálculo en sí.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard T={T} icon={UserCog} eyebrow="Ajustes manuales" valor={r.ajustesManuales}
          sub={`de ${r.decididos} decididos · real`} tone={r.ajustesManuales > 0 ? "warn" : undefined} />
        <KpiCard T={T} icon={Gauge} eyebrow="Aceptación del top-1"
          valor={tasaAceptacionTop1 != null ? `${tasaAceptacionTop1}%` : "—"} sub="sin cambio sobre lo sugerido · real" />
        <KpiCard T={T} icon={AlertTriangle} eyebrow="Situaciones sensibles" valor={r.sensiblesDetectadas}
          sub={`${r.sensiblesResueltas} ya resueltas · real (no son incidencias disciplinarias)`} />
        <KpiCard T={T} icon={MessageSquarePlus} eyebrow="Anotaciones registradas"
          valor={r.totalAnotaciones ?? "—"} sub="todas las fichas · real" />
        <KpiCard T={T} icon={AlertCircle} tone={agregadosReales.partidos_sin_arbitro_asignado > 0 ? "warn" : undefined}
          eyebrow="Partidos sin árbitro" valor={nf(agregadosReales.partidos_sin_arbitro_asignado)}
          sub="pendientes de asignar, temporada completa · real" />
      </div>

      <Panel title="Coste federación: sugerido por el motor vs. finalmente decidido">
        <p className="text-xs mb-4" style={{ color: N.ink70 }}>
          Tarifa real (0,26€/km, mínimo 4€, sin dieta dentro del término municipal — ver tarifas.md), no una cifra
          orientativa inventada. La diferencia solo aparece cuando el comité cambia el candidato sugerido.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ["Si se sigue siempre la sugerencia", r.costeSiSugerido, VIZ.serie[0]],
            ["Coste con las decisiones tomadas", r.costeSiDecidido, VIZ.serie[1]],
            ["Diferencia por ajustes manuales", diferenciaCoste, diferenciaCoste > 0 ? VIZ.estado.critical : VIZ.estado.good],
          ].map(([l, v, col]) => (
            <div key={l} className="rounded-md border p-4" style={{ background: N.card, borderColor: N.rule }}>
              <Eyebrow>{l}</Eyebrow>
              <div className="font-mono text-2xl mt-2 tabular-nums" style={{ color: col }}>
                {v >= 0 ? "" : "−"}{Math.abs(v).toFixed(2)} €
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-3" style={{ color: N.ink40 }}>
          Kilometraje total: {r.kmSugerido.toFixed(0)} km sugeridos · {r.kmDecidido.toFixed(0)} km finalmente asignados.
          Desglose por dietas/desplazamiento pendiente de más volumen real para que tenga sentido estadístico — ver sprints.md.
        </p>
      </Panel>

      <Panel title="Reparto de carga entre árbitros (dato real)" right={<span className="text-[11px]" style={{ color: N.ink40 }}>Top 8 de {nf(agregadosReales.total_arbitros_activos_adulta)}</span>}>
        <p className="text-xs mb-3" style={{ color: N.ink70 }}>
          Antes vivía en el Cuadro de Mando como «Dónde atacar» — movido aquí porque es una señal operativa para repartir
          designaciones de forma más inteligente, no algo que el comité necesite ver en la demo general.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={agregadosReales.top_carga_arbitros} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={N.rule} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nombre" width={170} tick={{ fontSize: 11, fill: N.ink70 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v) => [v, "Partidos"]} />
            <Bar dataKey="partidos" radius={[0, 3, 3, 0]}>
              {agregadosReales.top_carga_arbitros.map((a, i) => <Cell key={a.nombre} fill={VIZ.pastel[i % VIZ.pastel.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
          Coeficiente de variación de {agregadosReales.equidad_carga.coeficiente_variacion.toFixed(2)} — candidato directo a KPI A.6 (equidad de carga, ver kpis.md).
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------- glosario / gobernanza ------------------------------- */
/* Contenido tomado literalmente de docs/kpis.md y docs/tarifas.md (30 jul 2026) —
   no son definiciones nuevas inventadas para la demo, son las que ya gobiernan
   el motor de asignación construido en 003-persistencia-real. */
function Definicion({ titulo, children }) {
  return (
    <div className="pb-4 mb-4 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: N.rule }}>
      <div className="text-sm font-semibold mb-1.5" style={{ color: N.ink }}>{titulo}</div>
      <div className="text-sm leading-relaxed" style={{ color: N.ink70 }}>{children}</div>
    </div>
  );
}

function VistaGlosario({ T }) {
  return (
    <div className="space-y-5">
      <Panel title="Score del motor inteligente de designación (B.1–B.5)">
        <Definicion titulo="B.1 — Score de nivel general">
          <code className="block rounded px-3 py-2 my-2 text-xs font-mono" style={{ background: N.paper, color: T.primary }}>
            Score = 0,40·nota_evaluaciones + 0,20·prueba_física + 0,20·prueba_teórica + 0,20·consistencia − penalización(incidencias)
          </code>
          Pesos configurables por el comité (40/20/20/20 es punto de partida, no una constante cerrada). Con pocos informes
          acumulados se aplica <b>shrinkage bayesiano</b> para no dejar que un solo informe dispare el ranking: 1-2 informes →
          50% propio / 50% media de categoría; 3 informes → 70/30; 4 o más → 100% propio.
        </Definicion>
        <Definicion titulo="B.2 — Estado de forma">
          Tendencia, no nivel: media móvil ponderada (últimos 2 informes al 60%, resto del histórico al 40%). Un árbitro
          puede tener nivel medio-alto con tendencia descendente, o nivel medio con tendencia ascendente — son decisiones
          distintas para el comité, por eso se muestran separadas.
        </Definicion>
        <Definicion titulo="B.3 — Idoneidad situacional (matching)">
          Distinto de B.1: no es «quién es el mejor en general» sino «quién ha rendido mejor en partidos parecidos a este»
          (conflictividad, categoría, si es decisivo). Solo se considera fiable con <b>3 o más partidos de contexto similar</b>;
          por debajo de eso, cae automáticamente al score general B.1 — nunca se inventa confianza donde no hay datos.
        </Definicion>
        <Definicion titulo="B.4 — Alertas automáticas">
          Caída de nota ≥1,5 puntos en 2 informes consecutivos · prueba física por debajo del mínimo de su categoría ·
          inactividad &gt;4 semanas en temporada activa · sobrecarga &gt;130% de la media de partidos de su categoría.
        </Definicion>
        <Definicion titulo="B.5 — Disciplina del árbitro">
          Tarjetas mostradas (media por encuentro, comparada con la de su categoría). <b>Es descriptivo, no entra en B.1 ni en
          ningún score</b> — más tarjetas no es automáticamente peor arbitraje, puede reflejar partidos más conflictivos.
        </Definicion>
      </Panel>

      <Panel title="Principio de gobernanza (no confundir gestión con clasificación)">
        <p className="text-sm leading-relaxed" style={{ color: N.ink70 }}>
          La disponibilidad declarada y los kilómetros recorridos <b>no puntúan</b> — son datos de gestión (sirven para
          calcular coste y logística), nunca criterio de B.1 o de clasificación. La disciplina (B.5) es descriptiva, no
          evaluativa. Esta distinción tiene que ser explícita en la interfaz, no solo en la lógica interna, para que el
          comité confíe en que el ranking mide lo que dice medir.
        </p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: N.ink70 }}>
          El motor opera en dos fases: <b>filtro duro</b> (veto activo, indisponibilidad declarada, incompatibilidad de
          categoría — un candidato excluido no aparece con score bajo, se quita de la lista) y <b>score blando</b> (ranking
          sobre los candidatos no excluidos).
        </p>
      </Panel>

      <Panel title="Tarifas y coste (dato real, circulares oficiales FFCV)">
        <p className="text-sm leading-relaxed" style={{ color: N.ink70 }}>
          <b>0,26 €/km</b> (mínimo 4 €) fuera del término municipal de residencia del árbitro; <b>dentro del término, sin
          dieta, sea cual sea la distancia real</b>. Cualquier cifra que calcule Colegial es una estimación (etiquetada como
          tal) — el Comité de Árbitros de la FFCV es quien interpreta la aplicación real de dietas y desplazamientos.
        </p>
      </Panel>

      <Panel title="Procedimientos de uso de la webapp">
        <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1.5" style={{ color: N.ink70 }}>
          <li>Aceptar el candidato sugerido en Designación es un clic («Confirmar»); cambiar de candidato exige motivo
            obligatorio — nunca opcional, para no perder el dato de por qué se hizo el ajuste.</li>
          <li>Un partido marcado como «sensible» no bloquea la decisión, es contexto para tomarla con criterio (derbi,
            historial de tarjetas entre estos equipos, partido con mucho en juego).</li>
          <li>Todo lo etiquetado <span className="font-mono text-xs">· sintético</span> en la app es un dato inventado para
            poder mostrar la funcionalidad mientras no existe el dato real (evaluaciones del comité, contacto de árbitros).
            Nunca se presenta como si fuera real.</li>
          <li>El botón «Guardar nota» y las decisiones de Designación sí persisten de verdad contra Supabase — no es
            estado local que se pierda al recargar.</li>
        </ul>
      </Panel>

      <p className="text-[11px]" style={{ color: N.ink40 }}>
        Fuente: docs/kpis.md y docs/tarifas.md. Si algo de aquí cambia, se actualiza primero en esos documentos y luego aquí —
        esta página es un espejo de la documentación, no una fuente alternativa.
      </p>
    </div>
  );
}

/* ===================== Gestión y seguimiento de decisiones (spec 007-gestion-decisiones-comite) =====================
   Página nueva: registrar decisiones/acciones/políticas del comité (árbitro, categoría
   completa o grupo dentro de una categoría) con una foto del estado relevante en ese
   momento, y revisar más adelante si el impacto estimado se cumplió — mecánica tipo
   Football Manager, ver spec.md. NO tiene control de acceso propio todavía (FR-012):
   mismo criterio sin cuentas de la Fase 1 de rollout que el resto del prototipo
   (docs/decisiones-producto.md §22), hasta que 004-roles-permisos exista. */

const TIPOS_DECISION = {
  accion_motivacion: "Acción de motivación/seguimiento",
  campana_ascenso: "Campaña de ascenso",
};

const METRICA_LABELS = {
  estado_forma: "Estado de forma",
  disponibilidad_vigente: "Disponibilidad vigente",
  num_informes: "Informes acumulados",
  ultima_prueba_fisica: "Última prueba física",
  ultimo_examen_teorico: "Último examen teórico",
};

function valorMetricaLegible(clave, campo) {
  if (!campo || campo.valor == null) return "—";
  const v = campo.valor;
  if (clave === "estado_forma") return `${v.media.toFixed(1)} (${v.color})`;
  if (clave === "disponibilidad_vigente") return v.motivo ? `${v.tipo} · ${v.motivo}` : v.tipo;
  if (clave === "num_informes") return String(v);
  if (clave === "ultima_prueba_fisica" || clave === "ultimo_examen_teorico") return `${v.nota} (${v.fecha})`;
  return JSON.stringify(v);
}

function FormularioDecision({ T, onCancelar, onCreada }) {
  const [nivel, setNivel] = useState("arbitro");
  const [arbitroId, setArbitroId] = useState("");
  const [categoria, setCategoria] = useState("");
  const [seleccionIds, setSeleccionIds] = useState([]);
  const [filtroEstadoForma, setFiltroEstadoForma] = useState("todos");
  const [titulo, setTitulo] = useState("");
  const [estimacionImpacto, setEstimacionImpacto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cicloActivo = ciclosAsignacion[0];
  const [vigentesDisponibilidad, setVigentesDisponibilidad] = useState(null);
  const [disponibilidadEstado, setDisponibilidadEstado] = useState("cargando");

  useEffect(() => {
    let cancelado = false;
    obtenerVigentesDisponibilidadPorCiclo(cicloActivo.id).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setVigentesDisponibilidad(resultado.vigentesPorArbitro);
        setDisponibilidadEstado("listo");
      } else {
        setDisponibilidadEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [cicloActivo.id]);

  const categoriasReales = CATEGORIAS.filter((c) => c !== "Todas");
  const arbitrosDeCategoria = categoria ? ARBITROS.filter((a) => a.cat === categoria) : [];
  const arbitrosFiltrados = filtroEstadoForma === "todos"
    ? arbitrosDeCategoria
    : arbitrosDeCategoria.filter((a) => estadoForma(a.forma).color === filtroEstadoForma);

  const toggleSeleccion = (id) => {
    setSeleccionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!titulo.trim()) { setError("Escribe un título para la decisión."); return; }
    if (!estimacionImpacto.trim()) { setError("Escribe qué esperas conseguir con esta decisión."); return; }
    if (disponibilidadEstado !== "listo") {
      setError("Esperando a cargar la disponibilidad vigente — vuelve a intentarlo en un momento.");
      return;
    }

    const resuelto = resolverObjetivoArbitros(
      { nivel, categoria, arbitroId: arbitroId ? Number(arbitroId) : null, seleccionIds },
      ARBITROS
    );
    if (!resuelto.valido) { setError(resuelto.motivoRechazo); return; }

    setGuardando(true);
    const snapshots = resuelto.arbitroIds.map((id) => {
      const arbitro = ARBITROS.find((a) => a.id === id);
      const contexto = {
        estadoForma: estadoForma(arbitro.forma),
        disponibilidadVigente: vigentesDisponibilidad.get(id) ?? null,
      };
      return { arbitroId: id, metricas: construirSnapshot(arbitro, contexto) };
    });

    const resultado = await registrarDecisionComite({
      tipo: "accion_motivacion",
      titulo: titulo.trim(),
      objetivoNivel: nivel,
      objetivoCategoria: nivel === "arbitro" ? null : categoria,
      objetivoArbitroIds: resuelto.arbitroIds,
      estimacionImpacto: estimacionImpacto.trim(),
      autor: "Comité",
      snapshots,
    });
    setGuardando(false);

    if (!resultado.ok) { setError(resultado.error); return; }
    onCreada(resultado.decision.id);
  }

  return (
    <div className="max-w-2xl">
      <button onClick={onCancelar} className="text-xs mb-3" style={{ color: T.primary }}>&larr; Cancelar</button>
      <Panel title="Nueva decisión · acción de motivación/seguimiento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] font-semibold block mb-1.5" style={{ color: N.ink40 }}>Objetivo</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: "arbitro", label: "Un árbitro" },
                { id: "categoria", label: "Categoría completa" },
                { id: "grupo_categoria", label: "Grupo dentro de una categoría" },
              ].map((op) => (
                <button key={op.id} type="button" onClick={() => { setNivel(op.id); setSeleccionIds([]); }}
                  className="text-xs rounded-full px-3 py-1.5 border transition-colors"
                  style={{
                    borderColor: nivel === op.id ? T.primary : N.rule,
                    background: nivel === op.id ? T.tint : N.card,
                    color: nivel === op.id ? T.primary : N.ink70,
                  }}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          {nivel === "arbitro" && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Árbitro</label>
              <select value={arbitroId} onChange={(e) => setArbitroId(e.target.value)}
                className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }}>
                <option value="">Elegir árbitro…</option>
                {ARBITROS.map((a) => <option key={a.id} value={a.id}>{a.n} · {a.cat}</option>)}
              </select>
            </div>
          )}

          {(nivel === "categoria" || nivel === "grupo_categoria") && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Categoría</label>
              <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setSeleccionIds([]); }}
                className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }}>
                <option value="">Elegir categoría…</option>
                {categoriasReales.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {nivel === "grupo_categoria" && categoria && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: N.ink70 }}>Árbitros de {categoria}</label>
                <select value={filtroEstadoForma} onChange={(e) => setFiltroEstadoForma(e.target.value)}
                  className="text-xs rounded border px-2 py-1" style={{ borderColor: N.rule, color: N.ink70 }}>
                  <option value="todos">Todos los estados</option>
                  <option value="rojo">Solo en seguimiento</option>
                  <option value="ambar">Solo irregulares</option>
                  <option value="verde">Solo en forma</option>
                </select>
              </div>
              <div className="max-h-56 overflow-y-auto rounded border divide-y" style={{ borderColor: N.rule }}>
                {arbitrosFiltrados.length === 0 && (
                  <p className="text-xs p-3" style={{ color: N.ink40 }}>Ningún árbitro de esta categoría coincide con el filtro.</p>
                )}
                {arbitrosFiltrados.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer" style={{ color: N.ink }}>
                    <input type="checkbox" checked={seleccionIds.includes(a.id)} onChange={() => toggleSeleccion(a.id)} />
                    {a.n}
                    <Semaforo estado={estadoForma(a.forma)} />
                  </label>
                ))}
              </div>
              <p className="text-[11px] mt-1" style={{ color: N.ink40 }}>{seleccionIds.length} seleccionado(s)</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Título</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="p. ej. Email de reactivación a árbitros en seguimiento"
              className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }} />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>
              ¿Qué esperas conseguir? (estimación cualitativa del comité, no una cifra calculada — FR-004)
            </label>
            <textarea value={estimacionImpacto} onChange={(e) => setEstimacionImpacto(e.target.value)} rows={3}
              placeholder="p. ej. Que el árbitro sienta seguimiento del comité y su estado de forma mejore en los próximos meses"
              className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }} />
          </div>

          {error && (
            <p className="text-xs rounded px-3 py-2" style={{ color: VIZ.estado.critical, background: VIZ.estado.criticalT }}>{error}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="text-xs rounded px-4 py-2 font-medium text-white disabled:opacity-60" style={{ background: T.primary }}>
              {guardando ? "Guardando…" : "Registrar decisión"}
            </button>
            <button type="button" onClick={onCancelar} className="text-xs rounded px-4 py-2 font-medium" style={{ color: N.ink70 }}>
              Cancelar
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

const COMPARACION_INFO = {
  mejora: { label: "Mejora", color: VIZ.estado.good },
  empeora: { label: "Empeora", color: VIZ.estado.critical },
  sin_cambio: { label: "Sin cambio", color: N.ink40 },
  no_comparable: { label: "No comparable", color: N.ink40 },
};

/* Agrupa las filas de revisiones_impacto por revisado_en (todas las filas de
   una misma llamada a revisarImpacto comparten el mismo timestamp — now() es
   estable dentro de una sola sentencia de inserción en Postgres) — cada grupo
   es una "ronda" de revisión, puede haber varias sobre la misma decisión (T023). */
function agruparRevisionesPorRonda(revisiones) {
  const porRonda = new Map();
  for (const r of revisiones) {
    if (!porRonda.has(r.revisadoEn)) porRonda.set(r.revisadoEn, []);
    porRonda.get(r.revisadoEn).push(r);
  }
  return [...porRonda.entries()].sort((a, b) => new Date(b[0]) - new Date(a[0]));
}

function DetalleDecision({ T, decisionId, onVolver }) {
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error
  const [decision, setDecision] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [revisiones, setRevisiones] = useState([]);
  const [revisando, setRevisando] = useState(false);
  const [errorRevision, setErrorRevision] = useState(null);

  const cicloActivo = ciclosAsignacion[0];
  const [vigentesDisponibilidad, setVigentesDisponibilidad] = useState(null);
  const [disponibilidadEstado, setDisponibilidadEstado] = useState("cargando");

  useEffect(() => {
    let cancelado = false;
    obtenerDecisionComite(decisionId).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setDecision(resultado.decision);
        setSnapshots(resultado.snapshots);
        setRevisiones(resultado.revisiones);
        setEstado("listo");
      } else {
        setEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [decisionId]);

  useEffect(() => {
    let cancelado = false;
    obtenerVigentesDisponibilidadPorCiclo(cicloActivo.id).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setVigentesDisponibilidad(resultado.vigentesPorArbitro);
        setDisponibilidadEstado("listo");
      } else {
        setDisponibilidadEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [cicloActivo.id]);

  if (estado === "cargando") return <p className="text-sm" style={{ color: N.ink40 }}>Cargando decisión…</p>;
  if (estado === "error" || !decision) {
    return (
      <div>
        <button onClick={onVolver} className="text-xs mb-3" style={{ color: T.primary }}>&larr; Volver</button>
        <p className="text-sm" style={{ color: VIZ.estado.critical }}>No se pudo cargar esta decisión.</p>
      </div>
    );
  }

  const nombrePorId = new Map(ARBITROS.map((a) => [a.id, a.n]));
  const objetivoTexto = decision.objetivoNivel === "arbitro"
    ? "árbitro individual"
    : decision.objetivoNivel === "categoria"
      ? `toda la categoría ${decision.objetivoCategoria}`
      : `grupo de ${decision.objetivoCategoria}`;

  const estadoRevision = derivarEstadoRevision({
    creadoEn: decision.creadoEn,
    plazoRevisionMeses: decision.plazoRevisionMeses,
    tieneRevision: revisiones.length > 0,
  });
  const rondas = agruparRevisionesPorRonda(revisiones);

  async function handleRevisar() {
    setErrorRevision(null);
    if (disponibilidadEstado !== "listo") {
      setErrorRevision("Esperando a cargar la disponibilidad vigente — vuelve a intentarlo en un momento.");
      return;
    }
    setRevisando(true);

    const metricasActualesPorArbitroId = {};
    for (const s of snapshots) {
      const arbitro = ARBITROS.find((a) => a.id === s.arbitroId);
      if (!arbitro) {
        // árbitro ya no activo en el dataset — se omite, decisionesRepo lo marca
        // no_comparable con motivo "árbitro no activo" (Edge Case de spec.md).
        continue;
      }
      const contexto = {
        estadoForma: estadoForma(arbitro.forma),
        disponibilidadVigente: vigentesDisponibilidad.get(arbitro.id) ?? null,
      };
      metricasActualesPorArbitroId[s.arbitroId] = construirSnapshot(arbitro, contexto);
    }

    const resultado = await revisarImpacto(decisionId, {
      metricasActualesPorArbitroId,
      revisadoPor: "Comité",
    });
    setRevisando(false);

    if (!resultado.ok) { setErrorRevision(resultado.error); return; }
    setRevisiones((prev) => [...resultado.revisiones, ...prev]);
  }

  return (
    <div>
      <button onClick={onVolver} className="text-xs mb-3" style={{ color: T.primary }}>&larr; Volver a decisiones</button>
      <Panel title={TIPOS_DECISION[decision.tipo] ?? decision.tipo}
        right={<span className="text-xs" style={{ color: N.ink40 }}>{new Date(decision.creadoEn).toLocaleDateString("es-ES")}</span>}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: N.ink }}>{decision.titulo}</h2>
        <p className="text-xs mb-3" style={{ color: N.ink40 }}>
          Objetivo: {objetivoTexto} · {decision.objetivoArbitroIds.length} árbitro(s) afectado(s)
        </p>
        <div className="rounded border p-3 mb-4" style={{ borderColor: N.rule, background: N.paper }}>
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: N.ink40 }}>
            Impacto esperado (estimación cualitativa del comité)
          </div>
          <p className="text-sm" style={{ color: N.ink }}>{decision.estimacionImpacto}</p>
        </div>
        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: N.ink40 }}>
          Foto del estado en el momento de decidir
        </div>
        <div className="space-y-3 mb-4">
          {snapshots.map((s) => (
            <div key={s.arbitroId} className="rounded border p-3" style={{ borderColor: N.rule }}>
              <div className="text-sm font-medium mb-2" style={{ color: N.ink }}>{nombrePorId.get(s.arbitroId) ?? `Árbitro #${s.arbitroId}`}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(s.metricas).map(([clave, campo]) => (
                  <div key={clave} className="text-xs flex items-center justify-between gap-2 rounded px-2 py-1.5" style={{ background: N.paper }}>
                    <span style={{ color: N.ink70 }}>{METRICA_LABELS[clave] ?? clave}</span>
                    <span className="font-mono" style={{ color: N.ink }}>
                      {valorMetricaLegible(clave, campo)}
                      <span className="ml-1.5" style={{ color: campo.fuente === "real" ? T.primary : N.ink40 }}>· {campo.fuente}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4" style={{ borderColor: N.rule }}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: N.ink40 }}>
              Revisión de impacto
            </div>
            <button onClick={handleRevisar} disabled={revisando}
              className="text-xs rounded px-3 py-1.5 font-medium text-white disabled:opacity-60" style={{ background: T.primary }}>
              {revisando ? "Revisando…" : "Revisar impacto ahora"}
            </button>
          </div>
          {estadoRevision === "plazo_no_cumplido" && (
            <p className="text-xs mb-3" style={{ color: N.ink40 }}>
              El plazo típico de revisión ({decision.plazoRevisionMeses} meses) todavía no se ha cumplido — puedes
              revisar igualmente, es solo una referencia, no un bloqueo.
            </p>
          )}
          {errorRevision && (
            <p className="text-xs rounded px-3 py-2 mb-3" style={{ color: VIZ.estado.critical, background: VIZ.estado.criticalT }}>{errorRevision}</p>
          )}
          {rondas.length === 0 && (
            <p className="text-sm" style={{ color: N.ink40 }}>Todavía no se ha revisado el impacto de esta decisión.</p>
          )}
          <div className="space-y-4">
            {rondas.map(([revisadoEn, filas]) => (
              <div key={revisadoEn}>
                <div className="text-xs font-medium mb-2" style={{ color: N.ink70 }}>
                  Revisión del {new Date(revisadoEn).toLocaleDateString("es-ES")}
                </div>
                <p className="text-[11px] mb-2 italic" style={{ color: N.ink40 }}>
                  Correlación temporal, no una relación de causa-efecto confirmada — otras decisiones o factores
                  pueden haber influido en el mismo periodo.
                </p>
                <div className="space-y-2">
                  {filas.map((r) => (
                    <div key={r.id} className="rounded border p-3" style={{ borderColor: N.rule }}>
                      <div className="text-sm font-medium mb-2" style={{ color: N.ink }}>
                        {nombrePorId.get(r.arbitroId) ?? `Árbitro #${r.arbitroId}`}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(r.comparacion).map(([clave, direccion]) => {
                          const info = COMPARACION_INFO[direccion] ?? COMPARACION_INFO.no_comparable;
                          return (
                            <div key={clave} className="text-xs flex items-center justify-between gap-2 rounded px-2 py-1.5" style={{ background: N.paper }}>
                              <span style={{ color: N.ink70 }}>{METRICA_LABELS[clave] ?? clave}</span>
                              <span className="font-mono font-medium" style={{ color: info.color }}>{info.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function FormularioCampana({ T, onCancelar, onCreada }) {
  const [categoriaOrigen, setCategoriaOrigen] = useState("");
  const [categoriaDestino, setCategoriaDestino] = useState("");
  const [seleccionIds, setSeleccionIds] = useState([]);
  const [estimacionImpacto, setEstimacionImpacto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cicloActivo = ciclosAsignacion[0];
  const [vigentesDisponibilidad, setVigentesDisponibilidad] = useState(null);
  const [disponibilidadEstado, setDisponibilidadEstado] = useState("cargando");

  useEffect(() => {
    let cancelado = false;
    obtenerVigentesDisponibilidadPorCiclo(cicloActivo.id).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setVigentesDisponibilidad(resultado.vigentesPorArbitro);
        setDisponibilidadEstado("listo");
      } else {
        setDisponibilidadEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [cicloActivo.id]);

  const categoriasReales = CATEGORIAS.filter((c) => c !== "Todas");
  const arbitrosDeCategoria = categoriaOrigen ? ARBITROS.filter((a) => a.cat === categoriaOrigen) : [];

  const toggleSeleccion = (id) => {
    setSeleccionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!categoriaOrigen || !categoriaDestino) { setError("Elige categoría de origen y de destino."); return; }
    if (seleccionIds.length === 0) { setError("Selecciona al menos un candidato."); return; }
    if (!estimacionImpacto.trim()) { setError("Escribe qué esperas conseguir con esta campaña."); return; }
    if (disponibilidadEstado !== "listo") {
      setError("Esperando a cargar la disponibilidad vigente — vuelve a intentarlo en un momento.");
      return;
    }

    setGuardando(true);
    const snapshots = seleccionIds.map((id) => {
      const arbitro = ARBITROS.find((a) => a.id === id);
      const contexto = {
        estadoForma: estadoForma(arbitro.forma),
        disponibilidadVigente: vigentesDisponibilidad.get(id) ?? null,
      };
      return { arbitroId: id, metricas: construirSnapshot(arbitro, contexto) };
    });

    const resultado = await registrarDecisionComite({
      tipo: "campana_ascenso",
      titulo: `Campaña de ascenso: ${categoriaOrigen} → ${categoriaDestino}`,
      objetivoNivel: "grupo_categoria",
      objetivoCategoria: categoriaOrigen,
      objetivoArbitroIds: seleccionIds,
      estimacionImpacto: estimacionImpacto.trim(),
      autor: "Comité",
      detalle: {
        categoria_origen: categoriaOrigen,
        categoria_destino: categoriaDestino,
        candidatos: seleccionIds.map((id) => ({ arbitroId: id, notaTeorica: null, notaFisica: null })),
        plazas_disponibles: null,
        corte_confirmado: false,
        ascendidos_arbitro_ids: [],
      },
      snapshots,
    });
    setGuardando(false);

    if (!resultado.ok) { setError(resultado.error); return; }
    onCreada(resultado.decision.id);
  }

  return (
    <div className="max-w-2xl">
      <button onClick={onCancelar} className="text-xs mb-3" style={{ color: T.primary }}>&larr; Cancelar</button>
      <Panel title="Nueva campaña de ascenso">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Categoría de origen</label>
              <select value={categoriaOrigen} onChange={(e) => { setCategoriaOrigen(e.target.value); setSeleccionIds([]); }}
                className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }}>
                <option value="">Elegir categoría…</option>
                {categoriasReales.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Categoría de destino</label>
              <select value={categoriaDestino} onChange={(e) => setCategoriaDestino(e.target.value)}
                className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }}>
                <option value="">Elegir categoría…</option>
                {categoriasReales.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {categoriaOrigen && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: N.ink70 }}>Candidatos de {categoriaOrigen}</label>
              <div className="max-h-56 overflow-y-auto rounded border divide-y" style={{ borderColor: N.rule }}>
                {arbitrosDeCategoria.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer" style={{ color: N.ink }}>
                    <input type="checkbox" checked={seleccionIds.includes(a.id)} onChange={() => toggleSeleccion(a.id)} />
                    {a.n}
                  </label>
                ))}
              </div>
              <p className="text-[11px] mt-1" style={{ color: N.ink40 }}>{seleccionIds.length} candidato(s) seleccionado(s)</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>¿Qué esperas conseguir con esta campaña?</label>
            <textarea value={estimacionImpacto} onChange={(e) => setEstimacionImpacto(e.target.value)} rows={2}
              placeholder="p. ej. Reforzar la categoría superior con árbitros preparados y detectar talento"
              className="w-full text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }} />
          </div>

          {error && (
            <p className="text-xs rounded px-3 py-2" style={{ color: VIZ.estado.critical, background: VIZ.estado.criticalT }}>{error}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="text-xs rounded px-4 py-2 font-medium text-white disabled:opacity-60" style={{ background: T.primary }}>
              {guardando ? "Creando…" : "Crear campaña"}
            </button>
            <button type="button" onClick={onCancelar} className="text-xs rounded px-4 py-2 font-medium" style={{ color: N.ink70 }}>
              Cancelar
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function DetalleCampana({ T, decisionId, onVolver }) {
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error
  const [decision, setDecision] = useState(null);
  const [notas, setNotas] = useState({});
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [errorNotas, setErrorNotas] = useState(null);
  const [plazas, setPlazas] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmar, setErrorConfirmar] = useState(null);

  useEffect(() => {
    let cancelado = false;
    obtenerDecisionComite(decisionId).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setDecision(resultado.decision);
        const candidatos = resultado.decision.detalle?.candidatos ?? [];
        const notasIniciales = {};
        for (const c of candidatos) {
          notasIniciales[c.arbitroId] = { notaTeorica: c.notaTeorica ?? "", notaFisica: c.notaFisica ?? "" };
        }
        setNotas(notasIniciales);
        setPlazas(resultado.decision.detalle?.plazas_disponibles ?? "");
        setEstado("listo");
      } else {
        setEstado("error");
      }
    });
    return () => { cancelado = true; };
  }, [decisionId]);

  if (estado === "cargando") return <p className="text-sm" style={{ color: N.ink40 }}>Cargando campaña…</p>;
  if (estado === "error" || !decision) {
    return (
      <div>
        <button onClick={onVolver} className="text-xs mb-3" style={{ color: T.primary }}>&larr; Volver</button>
        <p className="text-sm" style={{ color: VIZ.estado.critical }}>No se pudo cargar esta campaña.</p>
      </div>
    );
  }

  const campanaId = decision.id; // identidad estable = campana_id de la primera fase
  const detalle = decision.detalle ?? {};
  const corteConfirmado = Boolean(detalle.corte_confirmado);
  const candidatos = detalle.candidatos ?? [];
  const nombrePorId = new Map(ARBITROS.map((a) => [a.id, a.n]));

  const candidatosConNotasActuales = candidatos.map((c) => ({
    arbitroId: c.arbitroId,
    notaTeorica: notas[c.arbitroId]?.notaTeorica === "" || notas[c.arbitroId]?.notaTeorica == null ? null : Number(notas[c.arbitroId].notaTeorica),
    notaFisica: notas[c.arbitroId]?.notaFisica === "" || notas[c.arbitroId]?.notaFisica == null ? null : Number(notas[c.arbitroId].notaFisica),
  }));
  const { candidatosOrdenados, candidatosIncompletos } = clasificarCandidatos(candidatosConNotasActuales);
  const plazasNum = plazas === "" ? 0 : Number(plazas);
  const { dentroDeCorte } = calcularCorte(candidatosOrdenados, plazasNum);

  async function handleGuardarNotas() {
    setErrorNotas(null);
    setGuardandoNotas(true);
    const candidatosActualizados = candidatos.map((c) => ({
      arbitroId: c.arbitroId,
      notaTeorica: notas[c.arbitroId]?.notaTeorica === "" || notas[c.arbitroId]?.notaTeorica == null ? null : Number(notas[c.arbitroId].notaTeorica),
      notaFisica: notas[c.arbitroId]?.notaFisica === "" || notas[c.arbitroId]?.notaFisica == null ? null : Number(notas[c.arbitroId].notaFisica),
    }));
    const resultado = await registrarFaseCampana(campanaId, { candidatos: candidatosActualizados });
    setGuardandoNotas(false);
    if (!resultado.ok) { setErrorNotas(resultado.error); return; }
    setDecision(resultado.decision);
  }

  async function handleConfirmarCorte() {
    setErrorConfirmar(null);
    if (plazas === "" || Number(plazas) < 0) {
      setErrorConfirmar("Introduce un número de plazas válido (0 o mayor).");
      return;
    }
    setConfirmando(true);
    const resultado = await confirmarCorteAscenso(campanaId, { plazasDisponibles: Number(plazas) });
    setConfirmando(false);
    if (!resultado.ok) { setErrorConfirmar(resultado.motivoRechazo); return; }
    setDecision(resultado.decision);
  }

  return (
    <div>
      <button onClick={onVolver} className="text-xs mb-3" style={{ color: T.primary }}>&larr; Volver a decisiones</button>
      <Panel title="Campaña de ascenso"
        right={<span className="text-xs" style={{ color: N.ink40 }}>{new Date(decision.creadoEn).toLocaleDateString("es-ES")}</span>}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: N.ink }}>{decision.titulo}</h2>
        <p className="text-xs mb-4" style={{ color: N.ink40 }}>
          {detalle.categoria_origen} &rarr; {detalle.categoria_destino} · {candidatos.length} candidato(s)
          {corteConfirmado && <span className="ml-2 font-semibold" style={{ color: VIZ.estado.good }}>· corte confirmado</span>}
        </p>

        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: N.ink40 }}>
          Notas de pruebas <span className="normal-case font-normal">(sintéticas mientras no haya dato real del comité)</span>
        </div>
        <div className="rounded border overflow-hidden mb-3" style={{ borderColor: N.rule }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: N.paper }}>
                <th className="text-left px-3 py-2 font-medium" style={{ color: N.ink70 }}>Candidato</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: N.ink70 }}>Nota teórica</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: N.ink70 }}>Nota física</th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map((c) => (
                <tr key={c.arbitroId} className="border-t" style={{ borderColor: N.rule }}>
                  <td className="px-3 py-2" style={{ color: N.ink }}>{nombrePorId.get(c.arbitroId) ?? `#${c.arbitroId}`}</td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" max="10" step="0.1" disabled={corteConfirmado}
                      value={notas[c.arbitroId]?.notaTeorica ?? ""}
                      onChange={(e) => setNotas((prev) => ({ ...prev, [c.arbitroId]: { ...prev[c.arbitroId], notaTeorica: e.target.value } }))}
                      className="w-20 text-sm rounded border px-2 py-1 disabled:opacity-60" style={{ borderColor: N.rule, color: N.ink }} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" max="10" step="0.1" disabled={corteConfirmado}
                      value={notas[c.arbitroId]?.notaFisica ?? ""}
                      onChange={(e) => setNotas((prev) => ({ ...prev, [c.arbitroId]: { ...prev[c.arbitroId], notaFisica: e.target.value } }))}
                      className="w-20 text-sm rounded border px-2 py-1 disabled:opacity-60" style={{ borderColor: N.rule, color: N.ink }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errorNotas && (
          <p className="text-xs rounded px-3 py-2 mb-3" style={{ color: VIZ.estado.critical, background: VIZ.estado.criticalT }}>{errorNotas}</p>
        )}
        {!corteConfirmado && (
          <button onClick={handleGuardarNotas} disabled={guardandoNotas}
            className="text-xs rounded px-4 py-2 font-medium text-white disabled:opacity-60 mb-6" style={{ background: T.primary }}>
            {guardandoNotas ? "Guardando…" : "Guardar notas"}
          </button>
        )}

        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: N.ink40 }}>
          Clasificación {corteConfirmado ? "" : "en vivo (previsualización)"}
        </div>
        <div className="rounded border overflow-hidden mb-3" style={{ borderColor: N.rule }}>
          {candidatosOrdenados.length === 0 && (
            <p className="text-xs p-3" style={{ color: N.ink40 }}>Ningún candidato tiene todavía las dos notas registradas.</p>
          )}
          {candidatosOrdenados.map((c, i) => {
            const dentro = corteConfirmado
              ? (detalle.ascendidos_arbitro_ids ?? []).includes(c.arbitroId)
              : dentroDeCorte.includes(c.arbitroId);
            return (
              <div key={c.arbitroId} className="flex items-center justify-between px-3 py-2 border-t first:border-t-0" style={{ borderColor: N.rule }}>
                <span className="text-sm" style={{ color: N.ink }}>{i + 1}. {nombrePorId.get(c.arbitroId) ?? `#${c.arbitroId}`}</span>
                <span className="text-xs flex items-center gap-2">
                  <span className="font-mono" style={{ color: N.ink70 }}>{c.notaFinal.toFixed(1)}</span>
                  {dentro && (
                    <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: VIZ.estado.goodT, color: VIZ.estado.good }}>
                      {corteConfirmado ? "Ascendido" : "Dentro del corte"}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {candidatosIncompletos.length > 0 && (
          <p className="text-[11px] mb-4" style={{ color: N.ink40 }}>
            Sin ambas notas todavía, fuera de la clasificación: {candidatosIncompletos.map((c) => nombrePorId.get(c.arbitroId) ?? `#${c.arbitroId}`).join(", ")}
          </p>
        )}

        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: N.ink40 }}>
          Plazas y confirmación del corte
        </div>
        {corteConfirmado ? (
          <p className="text-sm" style={{ color: VIZ.estado.good }}>
            Corte confirmado con {detalle.plazas_disponibles} plaza(s) — campaña inmutable, resultado basado en pruebas sintéticas.
          </p>
        ) : (
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: N.ink70 }}>Plazas disponibles</label>
              <input type="number" min="0" value={plazas} onChange={(e) => setPlazas(e.target.value)}
                className="w-24 text-sm rounded border px-3 py-2" style={{ borderColor: N.rule, color: N.ink }} />
            </div>
            <button onClick={handleConfirmarCorte} disabled={confirmando}
              className="text-xs rounded px-4 py-2 font-medium text-white disabled:opacity-60" style={{ background: T.accent }}>
              {confirmando ? "Confirmando…" : "Confirmar corte"}
            </button>
          </div>
        )}
        {errorConfirmar && (
          <p className="text-xs rounded px-3 py-2 mt-3" style={{ color: VIZ.estado.critical, background: VIZ.estado.criticalT }}>{errorConfirmar}</p>
        )}
      </Panel>
    </div>
  );
}

/* Componente propio (no solo un bloque dentro de VistaDecisiones) para poder
   remontarlo con key={} al volver de crear/ver una decisión — el remonte
   reinicia estadoLista a "cargando" de forma natural, sin llamar a setState
   de forma síncrona dentro del efecto (regla de Next.js 16, ver webapp/AGENTS.md). */
const ESTADO_REVISION_INFO = {
  pendiente: { label: "Pendiente de revisión", bg: VIZ.estado.warningT, fg: VIZ.estado.warning },
  plazo_no_cumplido: { label: "Plazo no cumplido", bg: N.paper, fg: N.ink40 },
  revisada: { label: "Revisada", bg: VIZ.estado.goodT, fg: VIZ.estado.good },
};

function ListaDecisiones({ T, onAbrir, onNueva, onNuevaCampana }) {
  const [decisiones, setDecisiones] = useState(null);
  const [estadoLista, setEstadoLista] = useState("cargando"); // cargando | listo | error
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    let cancelado = false;
    listarDecisiones({}).then((resultado) => {
      if (cancelado) return;
      if (resultado.ok) {
        setDecisiones(resultado.decisiones);
        setEstadoLista("listo");
      } else {
        setEstadoLista("error");
      }
    });
    return () => { cancelado = true; };
  }, []);

  const decisionesFiltradas = decisiones && filtroTipo ? decisiones.filter((d) => d.tipo === filtroTipo) : decisiones;

  return (
    <div>
      <div className="flex justify-end mb-3 gap-2">
        <button onClick={onNuevaCampana} className="text-xs rounded px-4 py-2 font-medium" style={{ border: `1px solid ${T.primary}`, color: T.primary }}>
          + Campaña de ascenso
        </button>
        <button onClick={onNueva} className="text-xs rounded px-4 py-2 font-medium text-white" style={{ background: T.primary }}>
          + Nueva decisión
        </button>
      </div>
      <Panel title="Decisiones registradas"
        right={
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-xs rounded border px-2 py-1" style={{ borderColor: N.rule, color: N.ink70 }}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_DECISION).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
          </select>
        }>
        {estadoLista === "cargando" && <p className="text-sm" style={{ color: N.ink40 }}>Cargando…</p>}
        {estadoLista === "error" && (
          <p className="text-sm" style={{ color: VIZ.estado.critical }}>No se pudieron cargar las decisiones. Recarga la página.</p>
        )}
        {estadoLista === "listo" && decisiones.length === 0 && (
          <p className="text-sm" style={{ color: N.ink40 }}>Todavía no hay decisiones registradas.</p>
        )}
        {estadoLista === "listo" && decisiones.length > 0 && decisionesFiltradas.length === 0 && (
          <p className="text-sm" style={{ color: N.ink40 }}>Ninguna decisión de este tipo todavía.</p>
        )}
        {estadoLista === "listo" && decisionesFiltradas?.length > 0 && (
          <div className="space-y-2">
            {decisionesFiltradas.map((d) => {
              const infoEstado = ESTADO_REVISION_INFO[d.estadoRevision] ?? ESTADO_REVISION_INFO.plazo_no_cumplido;
              return (
                <button key={d.id} onClick={() => onAbrir(d.id, d.tipo)}
                  className="w-full text-left rounded border p-3 transition-colors hover:bg-[rgba(255,255,255,.04)]" style={{ borderColor: N.rule }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: N.ink }}>{d.titulo}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] rounded-full px-2 py-0.5 font-medium" style={{ background: infoEstado.bg, color: infoEstado.fg }}>
                        {infoEstado.label}
                      </span>
                      <span className="text-[11px]" style={{ color: N.ink40 }}>{TIPOS_DECISION[d.tipo] ?? d.tipo}</span>
                    </div>
                  </div>
                  <div className="text-xs mt-1" style={{ color: N.ink40 }}>
                    {new Date(d.creadoEn).toLocaleDateString("es-ES")} · {d.autor}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function VistaDecisiones({ T }) {
  const [sub, setSub] = useState("lista"); // lista | nueva | nueva_campana | detalle | detalle_campana
  const [decisionSelId, setDecisionSelId] = useState(null);
  const [listaKey, setListaKey] = useState(0);

  const abrirDetalle = (id, tipo) => {
    setDecisionSelId(id);
    setSub(tipo === "campana_ascenso" ? "detalle_campana" : "detalle");
  };
  const volverALista = () => { setSub("lista"); setListaKey((k) => k + 1); };

  if (sub === "nueva") {
    return <FormularioDecision T={T} onCancelar={() => setSub("lista")} onCreada={(id) => abrirDetalle(id, "accion_motivacion")} />;
  }
  if (sub === "nueva_campana") {
    return <FormularioCampana T={T} onCancelar={() => setSub("lista")} onCreada={(id) => abrirDetalle(id, "campana_ascenso")} />;
  }
  if (sub === "detalle" && decisionSelId) {
    return <DetalleDecision key={decisionSelId} T={T} decisionId={decisionSelId} onVolver={volverALista} />;
  }
  if (sub === "detalle_campana" && decisionSelId) {
    return <DetalleCampana key={decisionSelId} T={T} decisionId={decisionSelId} onVolver={volverALista} />;
  }

  return (
    <div>
      <p className="text-xs mb-4 max-w-2xl" style={{ color: N.ink40 }}>
        Gestión de decisiones del comité sobre árbitros, categorías o grupos — registra una decisión con una foto de
        su estado actual, y revisa más adelante si tuvo el efecto esperado. No tiene todavía control de acceso propio
        (visible a quien entre al prototipo, mismo criterio sin cuentas de la Fase 1 de rollout que el resto de la
        demo, hasta que exista <code>004-roles-permisos</code>).
      </p>
      <ListaDecisiones key={listaKey} T={T} onAbrir={abrirDetalle} onNueva={() => setSub("nueva")} onNuevaCampana={() => setSub("nueva_campana")} />
    </div>
  );
}

/* ------------------------------- shell ------------------------------- */
export default function CRMExpedientes() {
  const [vista, setVista] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [colapsado, setColapsado] = useState(false);
  const [partidoDestacadoId, setPartidoDestacadoId] = useState(null);
  const T = THEMES.ffcv;

  /* Núcleo de competición + Cuadro de Mando: navegación principal, mismo nivel,
     sin candado. Equipos/Partidos promovidos desde "Próximas versiones" el 30 jul 2026
     (decisiones-producto.md) — dejan de ser vista previa bloqueada. */
  const navV1 = [
    { id: "dashboard", label: "Cuadro de Mando", icon: Gauge },
    { id: "arbitros", label: "Árbitros", icon: Users },
    { id: "equipos", label: "Equipos", icon: Trophy },
    { id: "partidos", label: "Partidos", icon: Swords },
    { id: "designacion", label: "Designación", icon: Route },
  ];
  /* "Próximas versiones": IA sigue bloqueada (v3, sin construir). "Decisiones" (spec 007,
     6 ago 2026) es la primera página de management/gestión del comité que vive aquí —
     funcionalidad real, sin candado, decisión explícita de Roberto de agrupar aquí este
     tipo de páginas según se vayan construyendo. */
  const navFuturo = [
    { id: "decisiones", label: "Decisiones", icon: ListChecks },
    { id: "ia", label: "Consultar con IA", icon: Sparkles, v: "v3" },
  ];
  /* Grupo aparte, deliberadamente menos vistoso (decisión 30 jul 2026): control interno
     del motor, administración de cuentas y la referencia de conceptos — construidas,
     no vistas previas, pero no es lo que se enseña primero en una demo. */
  const navSistema = [
    { id: "economico", label: "Seguimiento operativo", icon: Wallet },
    { id: "roles", label: "Configuración", icon: Settings },
    { id: "glosario", label: "Glosario y gobernanza", icon: BookOpen },
  ];
  const ir = (v) => { setVista(v); setSel(null); };
  /* Enlace real Designación -> Partidos (30 jul 2026): "ir al partido" abre la
     misma ficha de partido, no un duplicado. */
  const irAPartido = (partidoId) => { setVista("partidos"); setSel(null); setPartidoDestacadoId(partidoId); };
  const tituloVista = {
    dashboard: "Cuadro de Mando", arbitros: "Árbitros", equipos: "Equipos", partidos: "Partidos",
    designacion: "Designación inteligente", roles: "Configuración", economico: "Seguimiento operativo",
    glosario: "Glosario y gobernanza", ia: "Consultar con IA", decisiones: "Decisiones",
  };
  const todosLosItems = [...navV1, ...navFuturo, ...navSistema];

  const BotonNav = ({ n, tamañoIcono = 15, futuro = false }) => {
    const on = vista === n.id;
    if (colapsado) {
      return (
        <button key={n.id} onClick={() => ir(n.id)} title={n.label}
          className="w-full flex items-center justify-center rounded px-2 py-2.5 transition-colors"
          style={{ background: on ? "rgba(255,255,255,0.12)" : "transparent", color: on ? "#FFF" : N.ink70 }}>
          <n.icon size={16} />
        </button>
      );
    }
    return (
      <button key={n.id} onClick={() => ir(n.id)}
        className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors"
        style={{ background: on ? "rgba(255,255,255,0.12)" : "transparent", color: on ? "#FFF" : N.ink70, boxShadow: on ? `inset 3px 0 0 ${T.accent}` : "none" }}>
        <n.icon size={tamañoIcono} />
        <span className="flex-1 text-left">{n.label}</span>
        {futuro && <>
          <span className="text-[9px] font-mono rounded px-1 py-0.5" style={{ background: "rgba(255,255,255,0.1)", color: N.ink40 }}>{n.v}</span>
          <Lock size={10} />
        </>}
      </button>
    );
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: N.paper, color: N.ink }}>
      <div className="flex">
        <aside className={`${colapsado ? "w-16" : "w-56"} shrink-0 min-h-screen hidden md:flex flex-col transition-[width] duration-150`} style={{ background: T.deep }}>
          <div className={`p-5 flex items-center ${colapsado ? "justify-center" : "gap-3"} border-b`} style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <Escudo T={T} />
            {!colapsado && (
              <div className="min-w-0">
                <div className="text-white text-base font-semibold leading-none">Colegial</div>
                <div className="text-[10px] mt-1 truncate" style={{ color: N.ink70 }}>Comité Técnico · {T.corto}</div>
              </div>
            )}
          </div>
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {navV1.map((n) => <BotonNav key={n.id} n={n} />)}
            <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              {!colapsado && <div className="px-3 text-[9px] uppercase tracking-[0.14em] mb-1.5" style={{ color: N.ink40 }}>Próximas versiones</div>}
              {navFuturo.map((n) => <BotonNav key={n.id} n={n} tamañoIcono={14} futuro={Boolean(n.v)} />)}
            </div>
            <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              {!colapsado && <div className="px-3 text-[9px] uppercase tracking-[0.14em] mb-1.5" style={{ color: N.ink40 }}>Sistema</div>}
              {navSistema.map((n) => <BotonNav key={n.id} n={n} tamañoIcono={14} />)}
            </div>
          </nav>
          <div className="p-2 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <button onClick={() => setColapsado(!colapsado)} title={colapsado ? "Expandir menú" : "Plegar menú"}
              className="w-full flex items-center justify-center gap-2 rounded px-3 py-2 text-xs transition-colors"
              style={{ color: N.ink70 }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {colapsado ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /> Plegar menú</>}
            </button>
            {!colapsado && <p className="text-[9px] leading-snug px-3 mt-2" style={{ color: N.ink40 }}>Datos sintéticos. Ningún colegiado real.</p>}
          </div>
        </aside>

        <main className="flex-1 p-5 sm:p-7 max-w-[1400px]">
          <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: T.primary }}>
                {sel ? "Expediente del colegiado" : tituloVista[vista]}
              </h1>
              <p className="text-xs mt-1" style={{ color: N.ink70 }}>{T.nombre} · Base de datos de expedientes arbitrales</p>
            </div>
            <div className="flex md:hidden gap-1 flex-wrap">
              {todosLosItems.map((n) => (
                <button key={n.id} onClick={() => ir(n.id)} className="text-xs rounded border px-2 py-1"
                  style={{ borderColor: N.rule, background: vista === n.id ? T.deep : N.card, color: vista === n.id ? "#FFF" : N.ink70 }}>{n.label}</button>
              ))}
            </div>
          </header>

          {vista === "dashboard" && <Dashboard T={T} irArbitros={() => ir("arbitros")} />}
          {vista === "arbitros" && !sel && <Listado T={T} onPick={setSel} />}
          {vista === "arbitros" && sel && <Ficha key={sel.id} T={T} a={sel} back={() => setSel(null)} />}
          {vista === "equipos" && <VistaEquipos T={T} />}
          {vista === "partidos" && <VistaPartidos T={T} partidoDestacadoId={partidoDestacadoId} onConsumirDestacado={() => setPartidoDestacadoId(null)} />}
          {vista === "designacion" && <DesignacionInteligente T={T} onIrAPartido={irAPartido} />}
          {vista === "roles" && <VistaRoles T={T} />}
          {vista === "economico" && <VistaSeguimientoOperativo T={T} />}
          {vista === "glosario" && <VistaGlosario T={T} />}
          {vista === "ia" && <VistaIA T={T} />}
          {vista === "decisiones" && <VistaDecisiones T={T} />}
        </main>
      </div>
    </div>
  );
}
