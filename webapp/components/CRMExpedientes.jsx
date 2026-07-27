"use client";
import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  Users, Search, ChevronRight, TrendingUp, TrendingDown, Minus,
  FileText, Calendar, AlertCircle, Lock, Sparkles,
  MessageSquarePlus, Gavel, Wallet, Bot, Check, Ban, AlertTriangle, Send,
  LayoutDashboard, Route, Scale, Info, Phone, Mail, Mailbox, Ruler, Dumbbell, BookOpen,
} from "lucide-react";
import agregadosReales from "../data/agregados-reales.json";
import localidadesGeo from "../data/localidades-geo.json";
import arbitros200 from "../data/arbitros-200.json";
import ciclosAsignacion from "../data/ciclos-asignacion.json";
import { asignarJornada } from "../lib/asignarJornada";
import { CATEGORIAS } from "../lib/categorias";
import { conDisponibilidad } from "../lib/disponibilidad";
import { coberturaPorCategoria } from "../lib/coberturaCategoria";

/* ================================================================
   COLEGIAL · CRM de expedientes arbitrales — versión 1 ampliada
   v1 activa: expedientes, histórico, semáforo, radar, comentarios.
   v2/v3 como vistas previas bloqueadas (disclaimer visible).
================================================================ */

const THEMES = {
  ffcv: { nombre: "Federació de Futbol Comunitat Valenciana", corto: "FFCV", siglas: "FFCV",
    primary: "#0C4C7C", deep: "#08375A", accent: "#F59B1E", tint: "#EAF2F8", accentTint: "#FEF3E2" },
  fcf: { nombre: "Federació Catalana de Futbol", corto: "FCF", siglas: "FCF",
    primary: "#1B3F94", deep: "#132D6B", accent: "#D8232A", tint: "#ECEFF9", accentTint: "#FBEAEA" },
  rfaf: { nombre: "Real Federación Andaluza de Fútbol", corto: "RFAF", siglas: "RFAF",
    primary: "#0B6B4F", deep: "#07503B", accent: "#F0B323", tint: "#E9F4F0", accentTint: "#FDF4E0" },
};

const N = {
  paper: "#F6F7F9", card: "#FFFFFF", ink: "#16202B", ink70: "#5A6672",
  ink40: "#939CA6", rule: "#E1E5EA",
  verde: "#2E7D5B", verdeT: "#E7F2EC", ambar: "#C88A1A", ambarT: "#FBF1DC",
  rojo: "#C0392B", rojoT: "#FAE9E7", ta: "#E8C33C", tr: "#C0392B",
};

/* --------- dataset de trabajo: 200 árbitros ---------
   Identidad + carga real de partidos_2025_2026.csv (designaciones públicas FFCV),
   resto (informes, notas, vetos, disponibilidad) sintético hasta tener export
   real del comité. Ver docs/decisiones-producto.md §6 y generar_dataset_arbitros.py.
   gest = gestión de partido, radar; indisp = fines de semana no disponibles. */
const ARBITROS = arbitros200;

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

/* ------------------------------- piezas ------------------------------- */
function Eyebrow({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: N.ink40 }}>{children}</div>;
}
function Panel({ title, children, right }) {
  return (
    <section className="rounded-md border overflow-hidden" style={{ background: N.card, borderColor: N.rule }}>
      <div className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-2" style={{ borderColor: N.rule, background: "#FBFCFD" }}>
        <Eyebrow>{title}</Eyebrow>{right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function coloresForma(color) {
  return {
    verde: { bg: N.verdeT, fg: N.verde, dot: N.verde },
    ambar: { bg: N.ambarT, fg: N.ambar, dot: N.ambar },
    rojo: { bg: N.rojoT, fg: N.rojo, dot: N.rojo },
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
/* estados de CoberturaCategoria (lib/coberturaCategoria.js) — mismo patrón visual que coloresForma/Semaforo */
function coloresCobertura(estado) {
  return {
    riesgo: { bg: N.rojoT, fg: N.rojo, dot: N.rojo, label: "En riesgo" },
    ajustado: { bg: N.ambarT, fg: N.ambar, dot: N.ambar, label: "Ajustado, sin margen" },
    holgada: { bg: N.verdeT, fg: N.verde, dot: N.verde, label: "Cobertura holgada" },
    sin_partidos: { bg: "#F1F3F5", fg: N.ink40, dot: N.ink40, label: "Sin partidos este finde" },
  }[estado];
}
function BadgeCobertura({ estado }) {
  const c = coloresCobertura(estado);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full font-medium text-[11px] px-2 py-0.5 shrink-0" style={{ background: c.bg, color: c.fg }}>
      <span className="rounded-full" style={{ width: 7, height: 7, background: c.dot }} />
      {c.label}
    </span>
  );
}
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
        <img src={logoSrc} alt={`Escudo ${T.corto}`} className="w-full h-full object-contain" />
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
        <div className="text-sm font-semibold" style={{ color: "#7A5A10" }}>Vista previa · {version}</div>
        <p className="text-xs mt-0.5" style={{ color: "#7A5A10" }}>
          {texto || "Esta función no está activa en la versión inicial. Antes hay que poblar la base de datos de expedientes: todo lo que ves aquí se construye sobre ella."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- dashboard ------------------------------- */
function KpiCard({ eyebrow, valor, sub, T, tone, icon: Icon }) {
  const col = tone === "warn" ? N.ambar : tone === "bad" ? N.rojo : T.primary;
  return (
    <div className="rounded-md border p-4" style={{ background: N.card, borderColor: N.rule }}>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        {Icon && <Icon size={13} style={{ color: N.ink40 }} />}
      </div>
      <div className="font-mono text-3xl" style={{ color: col }}>{valor}</div>
      {sub && <div className="text-xs mt-1" style={{ color: N.ink70 }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ T, irArbitros }) {
  const cv = agregadosReales.equidad_carga.coeficiente_variacion;
  const cvTono = cv >= 0.8 ? "bad" : cv >= 0.5 ? "warn" : "ok";
  const cvTexto = cv >= 0.8 ? "muy desigual" : cv >= 0.5 ? "desigual" : "equilibrada";

  const cicloActivo = ciclosAsignacion[0];
  const cobertura = useMemo(() => coberturaPorCategoria(ARBITROS, cicloActivo), [cicloActivo]);
  const categoriasConPartidos = cobertura.porCategoria.filter((c) => c.partidosADesignar > 0);
  const categoriasEnRiesgo = categoriasConPartidos.filter((c) => c.estado === "riesgo");

  const [catVolumen, setCatVolumen] = useState("Todas");
  const partidosVolumen = useMemo(
    () => cicloActivo.partidos.filter((p) => catVolumen === "Todas" || p.categoriaMinima === catVolumen),
    [cicloActivo, catVolumen]
  );

  const alertasForma = useMemo(() => {
    const todas = ARBITROS.map((a) => ({ a, est: estadoForma(a.forma) })).filter((x) => x.est.color !== "verde");
    const peso = { rojo: 0, ambar: 1 };
    return todas.sort((x, y) => peso[x.est.color] - peso[y.est.color]).slice(0, 6);
  }, []);
  const totalAlertas = useMemo(
    () => ARBITROS.reduce((n, a) => n + (estadoForma(a.forma).color !== "verde" ? 1 : 0), 0),
    []
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard T={T} icon={Users} eyebrow="Árbitros activos" valor={nf(agregadosReales.total_arbitros_activos_adulta)}
          sub="categoría adulta, temporada 25/26 — dato real" />
        <KpiCard T={T} icon={Calendar} eyebrow="Partidos temporada" valor={nf(agregadosReales.total_partidos_categoria_adulta)}
          sub={`de ${nf(agregadosReales.total_partidos_temporada)} incl. fútbol base — dato real`} />
        <KpiCard T={T} icon={Scale} eyebrow="Equidad de carga" tone={cvTono} valor={cv.toFixed(2)}
          sub={`carga ${cvTexto} entre árbitros (CV) — dato real`} />
        <KpiCard T={T} icon={AlertCircle} tone={agregadosReales.partidos_sin_arbitro_asignado > 0 ? "warn" : "ok"}
          eyebrow="Partidos sin árbitro" valor={nf(agregadosReales.partidos_sin_arbitro_asignado)}
          sub="pendientes de asignar — dato real" />
      </div>

      <Panel
        title={`Cobertura por categoría · ${cicloActivo.finDeSemana}`}
        right={
          categoriasEnRiesgo.length > 0 ? (
            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: N.rojo }}>
              <AlertTriangle size={12} /> {categoriasEnRiesgo.length} en riesgo
            </span>
          ) : (
            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: N.verde }}>
              <Check size={12} /> sin alertas de cobertura
            </span>
          )
        }
      >
        {cobertura.datasetDisponibilidadVacio && (
          <p className="text-xs mb-3 rounded border px-3 py-2" style={{ color: N.rojo, borderColor: N.rojoT, background: N.rojoT }}>
            No hay dataset de disponibilidad cargado — los 0 disponibles de abajo no significan cobertura completa, significan que falta el dato.
          </p>
        )}
        {categoriasConPartidos.length === 0 ? (
          <p className="text-xs" style={{ color: N.ink40 }}>Ninguna categoría tiene partidos programados este fin de semana.</p>
        ) : (
          <div className="space-y-2.5">
            {categoriasConPartidos.map((c) => (
              <div key={c.categoria} className="flex items-center justify-between gap-3 rounded border p-3 flex-wrap" style={{ borderColor: N.rule }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: N.ink }}>{c.categoria}</div>
                  <div className="text-xs mt-0.5 font-mono tabular-nums" style={{ color: N.ink70 }}>
                    {c.partidosADesignar} {c.partidosADesignar === 1 ? "partido" : "partidos"} a designar <span style={{ color: N.ink40 }}>· real</span>
                    {" — "}
                    {c.disponiblesCategoriaPropia} de categoría propia + {c.disponiblesCategoriaInferior} de categoría inferior = {c.totalDisponibles} {c.totalDisponibles === 1 ? "disponible" : "disponibles"} <span style={{ color: N.ambar }}>· sintético</span>
                  </div>
                </div>
                <BadgeCobertura estado={c.estado} />
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
          “En riesgo” = disponibles &lt; partidos a designar. “Ajustado” = exactamente igual, sin margen. Los árbitros que también pitan categorías inferiores pueden aparecer disponibles en más de una categoría a la vez — si dos categorías comparten el mismo pool y ambas están en riesgo, ese pool no cubre a las dos a la vez.
        </p>
      </Panel>

      <Panel
        title={`Partidos del fin de semana · ${cicloActivo.finDeSemana}`}
        right={
          <select value={catVolumen} onChange={(e) => setCatVolumen(e.target.value)}
            className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70, background: "#FFF" }}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        }
      >
        <div className="font-mono text-2xl" style={{ color: T.primary }}>{partidosVolumen.length}</div>
        <div className="text-xs mt-1" style={{ color: N.ink70 }}>
          {catVolumen === "Todas" ? "partidos a designar, todas las categorías" : `partidos a designar en ${catVolumen}`} <span style={{ color: N.ink40 }}>· real</span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Dónde atacar · mayor carga de partidos (dato real)" right={<span className="text-[11px]" style={{ color: N.ink40 }}>Top 8 de {nf(agregadosReales.total_arbitros_activos_adulta)}</span>}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agregadosReales.top_carga_arbitros} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={N.rule} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" width={170} tick={{ fontSize: 11, fill: N.ink70 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v) => [v, "Partidos"]} />
                <Bar dataKey="partidos" fill={T.primary} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Carga real de designaciones públicas de la FFCV esta temporada. Un coeficiente de variación de {cv.toFixed(2)} indica reparto {cvTexto} — candidato directo a KPI A.6 (equidad de carga, ver kpis.md).
            </p>
          </Panel>

          <Panel title="Categorías con más volumen (dato real)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agregadosReales.distribucion_categorias.slice(0, 8)} margin={{ top: 4, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={N.rule} vertical={false} />
                <XAxis dataKey="competicion" tick={{ fontSize: 10, fill: N.ink40 }} axisLine={{ stroke: N.rule }} tickLine={false} angle={-30} textAnchor="end" interval={0} height={70} />
                <YAxis tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v) => [v, "Partidos"]} />
                <Bar dataKey="partidos" fill={T.accent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={`Alertas de forma · top 6 de ${totalAlertas}`} right={<span className="text-[11px] flex items-center gap-1" style={{ color: N.ambar }}><Info size={11} /> sintético</span>}>
            {alertasForma.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Sin alertas activas.</p>
            ) : (
              <div className="space-y-2.5">
                {alertasForma.map(({ a, est }) => (
                  <div key={a.id} className="flex items-center justify-between rounded border p-2.5" style={{ borderColor: N.rule }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: N.ink }}>{a.n}</div>
                      <div className="text-xs" style={{ color: N.ink70 }}>{a.cat} · {a.loc}</div>
                    </div>
                    <Semaforo estado={est} />
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] mt-3 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Basado en el semáforo de forma — hoy con datos sintéticos (8 expedientes de muestra). Será real en cuanto haya informes reales cargados.
            </p>
            <button onClick={irArbitros} className="mt-3 text-xs font-medium flex items-center gap-1" style={{ color: T.primary }}>
              Ver en Árbitros <ChevronRight size={13} />
            </button>
          </Panel>

          <Panel title="Insights">
            <div className="space-y-3 text-sm" style={{ color: N.ink70 }}>
              <p>
                <span className="font-semibold" style={{ color: N.ink }}>Reparto de carga muy desigual: </span>
                el árbitro con más partidos dirige {agregadosReales.equidad_carga.max_partidos}, el de menos solo {agregadosReales.equidad_carga.min_partidos}. Media {agregadosReales.equidad_carga.media_partidos_por_arbitro} partidos/árbitro. <span className="text-[11px]" style={{ color: N.ambar }}>· real</span>
              </p>
              <p>
                <span className="font-semibold" style={{ color: N.ink }}>{agregadosReales.partidos_sin_arbitro_asignado} partidos</span> de categoría adulta siguen sin árbitro asignado en el CSV público — puede ser normal (jornadas futuras) o señal de déficit de colegiados en alguna categoría. <span className="text-[11px]" style={{ color: N.ambar }}>· real, sin interpretar todavía</span>
              </p>
              <p>
                <span className="font-semibold" style={{ color: N.ink }}>2 árbitros necesitan seguimiento</span> por caída de nota en informes recientes. <span className="text-[11px]" style={{ color: N.ambar }}>· sintético</span>
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- listado ------------------------------- */
function Listado({ T, onPick }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [cat, setCat] = useState("Todas");
  const [mediaMin, setMediaMin] = useState("Todas");

  const filas = useMemo(() => ARBITROS
    .map((a) => ({ a, est: estadoForma(a.forma), tot: totales(a), ultima: a.hist[a.hist.length - 1] }))
    .filter(({ a, est, ultima }) => {
      const okq = (a.n + a.cat + a.loc + a.lic).toLowerCase().includes(q.toLowerCase());
      const okf = filtro === "todos" || est.color === filtro;
      const okc = cat === "Todas" || a.cat === cat;
      const okm = mediaMin === "Todas" || ultima.media >= parseFloat(mediaMin);
      return okq && okf && okc && okm;
    }), [q, filtro, cat, mediaMin]);

  const conteo = useMemo(() => {
    const c = { verde: 0, ambar: 0, rojo: 0 };
    ARBITROS.forEach((a) => c[estadoForma(a.forma).color]++);
    return c;
  }, []);

  const selectStyle = { borderColor: N.rule, color: N.ink70, background: "#FFF" };

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
            <div className="flex items-center gap-2 rounded border px-2 py-1 bg-white" style={{ borderColor: N.rule }}>
              <Search size={13} style={{ color: N.ink40 }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o licencia"
                className="text-xs outline-none w-36 bg-transparent" style={{ color: N.ink }} />
            </div>
          </div>
        }>
        <div className="overflow-x-auto -m-5">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Colegiado", "Categoría", "Estado de forma", "Media 25/26", "PJ (total)", "Indisp.", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-semibold border-b"
                    style={{ color: N.ink40, borderColor: N.rule }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map(({ a, est, tot, ultima }) => (
                <tr key={a.id} onClick={() => onPick(a)}
                  className="cursor-pointer border-b hover:bg-slate-50 transition-colors" style={{ borderColor: N.rule }}>
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
          {[["Partidos en ventana", enVentana.length, N.ink], ["Amarillas", resumen.am, "#B08D14"], ["Rojas", resumen.ro, N.rojo]].map(([l, v, col]) => (
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
                    {h.amarillas > 0 && <span style={{ color: "#B08D14" }}>{h.amarillas}TA</span>}
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

  const [notas, setNotas] = useState(a.notas);
  const [nueva, setNueva] = useState("");
  const [etiquetaNueva, setEtiquetaNueva] = useState("seguimiento");
  const [sugerenciaEmail, setSugerenciaEmail] = useState(null); // plantilla sugerida tras añadir nota positiva/mejora
  const addNota = () => {
    if (!nueva.trim()) return;
    setNotas([{ fecha: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }), autor: "Tú", etiqueta: etiquetaNueva, texto: nueva.trim() }, ...notas]);
    setNueva("");
    // sugerencia automatica de plantilla de email al registrar una nota positiva o de mejora
    if (etiquetaNueva === "positiva") setSugerenciaEmail("felicitacion");
    else if (etiquetaNueva === "mejora") setSugerenciaEmail("puntosDeMejora");
    else setSugerenciaEmail(null);
  };

  return (
    <div className="space-y-5">
      <button onClick={back} className="text-xs flex items-center gap-1" style={{ color: N.ink70 }}>
        <ChevronRight size={13} className="rotate-180" /> Volver a expedientes
      </button>

      <div className="rounded-md overflow-hidden" style={{ background: T.primary }}>
        <div className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar txt={a.foto} T={{ tint: "#FFFFFF", primary: T.primary }} size={60} />
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] mb-1" style={{ color: T.accent }}>LICENCIA {a.lic}</div>
              <h2 className="text-2xl font-semibold text-white leading-tight">{a.n}</h2>
              <div className="text-xs mt-1.5" style={{ color: "#B7CBDD" }}>{a.cat} · {a.loc} · {a.edad} años · {a.temp} temporadas · {a.altura} cm</div>
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
          <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 18px" }}>
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
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums" style={{ color: "#B08D14" }}>{h.am}</td>
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
              <button onClick={addNota} className="text-xs rounded px-3 py-2 text-white font-medium flex items-center gap-1.5" style={{ background: T.primary }}>
                <MessageSquarePlus size={14} /> Guardar
              </button>
            </div>

            {sugerenciaEmail && (
              <div className="rounded p-3 mb-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: T.accentTint }}>
                <div className="text-xs" style={{ color: "#7A5A10" }}>
                  <span className="font-semibold">Sugerencia: </span>
                  {sugerenciaEmail === "felicitacion" ? "esta nota es positiva — ¿le envías un email de felicitación?" : "esta nota es de mejora — ¿le envías puntos de mejora por email?"}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={mailtoHref(a.email, PLANTILLAS_EMAIL[sugerenciaEmail].asunto(a), PLANTILLAS_EMAIL[sugerenciaEmail].cuerpo(a))}
                    className="text-xs rounded px-2.5 py-1 font-medium text-white flex items-center gap-1" style={{ background: T.primary }}>
                    <Send size={11} /> Redactar email
                  </a>
                  <button onClick={() => setSugerenciaEmail(null)} className="text-xs" style={{ color: "#7A5A10" }}>Descartar</button>
                </div>
              </div>
            )}

            {notas.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Sin notas de seguimiento. Las notas quedan registradas con autor y fecha (audit log).</p>
            ) : (
              <div className="space-y-2.5">
                {notas.map((nt, i) => {
                  const et = ETIQUETA_NOTA[nt.etiqueta] || ETIQUETA_NOTA.seguimiento;
                  return (
                    <div key={i} className="rounded border p-3" style={{ borderColor: N.rule, background: i === 0 && nt.autor === "Tú" ? T.tint : "#FFF" }}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: T.primary }}>{nt.autor}</span>
                        <span className="text-[11px] font-mono" style={{ color: N.ink40 }}>{nt.fecha}</span>
                        <span className="text-[10px] rounded px-1.5 py-0.5 font-medium" style={{ background: et.bg, color: et.fg }}>{et.label}</span>
                      </div>
                      <p className="text-sm" style={{ color: N.ink70 }}>{nt.texto}</p>
                    </div>
                  );
                })}
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
                  className="text-xs rounded border px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors" style={{ borderColor: N.rule, color: N.ink }}>
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
function FilaJornada({ r, T, expandido, onToggle }) {
  const { partido, asignado, alternativas, requiereRevision, motivoRevision } = r;
  return (
    <>
      <tr className="border-b cursor-pointer hover:bg-slate-50" style={{ borderColor: N.rule }} onClick={onToggle}>
        <td className="px-3 py-3">
          <div className="font-medium" style={{ color: N.ink }}>{partido.equipoLocal} – {partido.equipoVisitante}</div>
          <div className="text-xs" style={{ color: N.ink40 }}>{partido.categoriaMinima} · {partido.localidad} · {partido.fecha}</div>
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
        </td>
        <td className="px-3 py-3">
          {requiereRevision ? (
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
            {motivoRevision.length > 0 && (
              <div className="rounded p-2.5 mb-3 text-xs" style={{ background: N.ambarT, color: "#7A5A10" }}>
                {motivoRevision.map((m, i) => <div key={i}>· {m}</div>)}
              </div>
            )}
            <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: N.ink40 }}>
              Alternativas ({alternativas.length})
            </div>
            {alternativas.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>No hay más candidatos disponibles para este partido.</p>
            ) : (
              <div className="space-y-1.5">
                {alternativas.map(({ arbitro, score, coste }) => (
                  <div key={arbitro.id} className="flex items-center justify-between text-xs rounded border p-2" style={{ borderColor: N.rule, background: "#FFF" }}>
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
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function DesignacionInteligente({ T }) {
  const [cicloId, setCicloId] = useState(ciclosAsignacion[0].id);
  const [expandidoId, setExpandidoId] = useState(null);
  const ciclo = ciclosAsignacion.find((c) => c.id === cicloId);

  const resultados = useMemo(() => {
    const arbitrosConExtras = ARBITROS.map(conDisponibilidad);
    return asignarJornada(ciclo.partidos, arbitrosConExtras, localidadesGeo);
  }, [ciclo]);

  const nRevisar = resultados.filter((r) => r.requiereRevision).length;

  return (
    <div className="space-y-5">
      <div className="rounded-md border-2 border-dashed p-4 flex items-start gap-3" style={{ borderColor: T.accent, background: T.accentTint }}>
        <Info size={18} className="mt-0.5 shrink-0" style={{ color: N.ambar }} />
        <div>
          <div className="text-sm font-semibold" style={{ color: "#7A5A10" }}>Motor v0 — asignación por lote, no operativo todavía</div>
          <p className="text-xs mt-0.5" style={{ color: "#7A5A10" }}>
            Procesa toda la jornada a la vez (evita que el mismo árbitro salga sugerido en dos partidos simultáneos), con
            filtro duro real, score B.1 con shrinkage, y coste desglosado (tarifas.md). B.3, A.5 y la optimización global
            (húngaro sobre toda la jornada en vez de greedy por categoría) siguen pendientes — ver decisiones-producto.md.
          </p>
        </div>
      </div>

      <Panel title="Ciclo de asignación" right={
        <select value={cicloId} onChange={(e) => { setCicloId(e.target.value); setExpandidoId(null); }}
          className="text-xs rounded border px-2 py-1.5 outline-none" style={{ borderColor: N.rule, color: N.ink70, background: "#FFF" }}>
          {ciclosAsignacion.map((c) => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
        </select>
      }>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5" style={{ color: N.ink }}><Calendar size={14} style={{ color: N.ink40 }} /> {ciclo.finDeSemana}</span>
          <span style={{ color: N.ink70 }}>{resultados.length} partidos</span>
          <span style={{ color: nRevisar > 0 ? N.ambar : N.verde }} className="font-medium">{nRevisar} para revisar · {resultados.length - nRevisar} auto-confirmables</span>
        </div>
      </Panel>

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
              {resultados.map((r) => (
                <FilaJornada key={r.partido.id} r={r} T={T} expandido={expandidoId === r.partido.id}
                  onToggle={() => setExpandidoId(expandidoId === r.partido.id ? null : r.partido.id)} />
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
const PROPUESTA = [
  { partido: "Atlético Saguntino – CD Roda", cat: "Preferente", arb: "Aitana Sospedra Gil", km: 21, estado: "ok", nota: "Sin incompatibilidades · en forma · 14 días sin dirigir al Saguntino" },
  { partido: "CD Buñol – Paterna CF", cat: "1ª Regional", arb: "Pau Llorens Sanchis", km: 68, estado: "aviso", nota: "Reside en Paterna · territorialidad pendiente de criterio del técnico" },
  { partido: "Burjassot CF – CD Almazora", cat: "2ª Regional", arb: "Sergi Company Roig", km: 26, estado: "bloqueo", nota: "Estado de forma en rojo · el sistema sugiere revisión antes de confirmar" },
];

function VistaRecomendaciones({ T }) {
  return (
    <div>
      <BannerV2 T={T} version="Versión 2"
        texto="Recomendaciones de designación con incompatibilidades y vetos. El sistema sugiere y explica; el técnico decide y firma. Necesita los expedientes poblados para funcionar." />
      <Panel title="Ejemplo · recomendaciones para la jornada 31">
        <div className="space-y-2 opacity-90">
          {PROPUESTA.map((p, i) => (
            <div key={i} className="rounded border p-4" style={{ borderColor: N.rule }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: N.ink }}>{p.partido}</span>
                    <span className="text-[11px] rounded px-2 py-0.5" style={{ background: T.tint, color: T.primary }}>{p.cat}</span>
                  </div>
                  <div className="text-sm mt-1.5" style={{ color: N.ink }}>
                    <span style={{ color: N.ink40 }}>Sugerido: </span><span className="font-medium">{p.arb}</span>
                    <span className="font-mono text-xs ml-2" style={{ color: N.ink40 }}>{p.km} km</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: N.ink70 }}>{p.nota}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium"
                  style={p.estado === "ok" ? { background: N.verdeT, color: N.verde } : p.estado === "aviso" ? { background: N.ambarT, color: N.ambar } : { background: N.rojoT, color: N.rojo }}>
                  {p.estado === "ok" ? <><Check size={11} /> Sin conflicto</> : p.estado === "aviso" ? <><AlertTriangle size={11} /> Revisar</> : <><Ban size={11} /> Atención</>}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button disabled className="mt-4 text-xs rounded px-4 py-2 font-medium cursor-not-allowed flex items-center gap-1.5"
          style={{ background: N.rule, color: N.ink40 }}>
          <Lock size={12} /> Confirmar y publicar (disponible en v2)
        </button>
      </Panel>
    </div>
  );
}

function VistaIA({ T }) {
  return (
    <div>
      <BannerV2 T={T} version="Versión 3"
        texto="Consultas en lenguaje natural respondidas con vuestros propios datos. Cuanto más histórico haya cargado, mejores respuestas." />
      <Panel title="Ejemplo · consulta al asistente">
        <div className="space-y-3 max-w-2xl opacity-90">
          <div className="flex justify-end">
            <div className="rounded-lg px-4 py-2.5 text-sm max-w-[80%]" style={{ background: T.primary, color: "#FFF" }}>
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

const COSTE_MES = [
  { m: "Sep", km: 8400, opt: 7100 }, { m: "Oct", km: 12600, opt: 10200 },
  { m: "Nov", km: 13100, opt: 10800 }, { m: "Ene", km: 12800, opt: 10400 },
  { m: "Feb", km: 13400, opt: 10900 }, { m: "Mar", km: 14100, opt: 11300 },
];

function VistaEconomica({ T }) {
  return (
    <div>
      <BannerV2 T={T} version="Versión 3"
        texto="Control económico: kilometraje liquidado frente a asignación por proximidad, y otros ahorros. Necesita el motor de designación de la v2 funcionando." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 opacity-90">
        {[["Kilometraje liquidado", "28.230 €", N.ink], ["Con reparto por proximidad", "23.070 €", N.verde], ["Diferencia", "5.160 €", N.rojo]].map(([l, v, col]) => (
          <div key={l} className="rounded-md border p-4" style={{ background: N.card, borderColor: N.rule }}>
            <Eyebrow>{l}</Eyebrow>
            <div className="font-mono text-2xl mt-2" style={{ color: col }}>{v}</div>
          </div>
        ))}
      </div>
      <Panel title="Ejemplo · kilómetros liquidados frente a óptimos (una delegación)">
        <div className="opacity-90">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={COSTE_MES} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={N.rule} vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={{ stroke: N.rule }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} formatter={(v, k) => [`${nf(v)} km`, k === "km" ? "Liquidado" : "Por proximidad"]} />
              <Area type="monotone" dataKey="km" stroke={T.accent} fill={T.accent} fillOpacity={0.1} strokeWidth={2.5} />
              <Area type="monotone" dataKey="opt" stroke={T.primary} fill={T.primary} fillOpacity={0.06} strokeWidth={2} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------- shell ------------------------------- */
export default function CRMExpedientes() {
  const [vista, setVista] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const T = THEMES.ffcv;

  const navV1 = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "arbitros", label: "Árbitros", icon: Users },
    { id: "designacion", label: "Designación", icon: Route },
  ];
  const navFuturo = [
    { id: "recomendaciones", label: "Recomendaciones", icon: Gavel, v: "v2" },
    { id: "economico", label: "Económico", icon: Wallet, v: "v3" },
    { id: "ia", label: "Consultar con IA", icon: Sparkles, v: "v3" },
  ];
  const ir = (v) => { setVista(v); setSel(null); };
  const tituloVista = { dashboard: "Dashboard", arbitros: "Árbitros", designacion: "Designación inteligente", recomendaciones: "Recomendaciones de designación", economico: "Control económico", ia: "Consultar con IA" };

  return (
    <div className="min-h-screen font-sans" style={{ background: N.paper, color: N.ink }}>
      <div className="flex">
        <aside className="w-56 shrink-0 min-h-screen hidden md:flex flex-col" style={{ background: T.primary }}>
          <div className="p-5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <Escudo T={T} />
            <div className="min-w-0">
              <div className="text-white text-base font-semibold leading-none">Colegial</div>
              <div className="text-[10px] mt-1 truncate" style={{ color: "#A9C3D8" }}>Comité Técnico · {T.corto}</div>
            </div>
          </div>
          <nav className="p-3 space-y-1 flex-1">
            {navV1.map((n) => {
              const on = vista === n.id;
              return (
                <button key={n.id} onClick={() => ir(n.id)}
                  className="w-full flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
                  style={{ background: on ? "rgba(255,255,255,0.12)" : "transparent", color: on ? "#FFF" : "#A9C3D8", boxShadow: on ? `inset 3px 0 0 ${T.accent}` : "none" }}>
                  <n.icon size={15} /> {n.label}
                </button>
              );
            })}
            <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="px-3 text-[9px] uppercase tracking-[0.14em] mb-1.5" style={{ color: "#6C8AA5" }}>Próximas versiones</div>
              {navFuturo.map((n) => {
                const on = vista === n.id;
                return (
                  <button key={n.id} onClick={() => ir(n.id)}
                    className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-[13px] transition-colors"
                    style={{ background: on ? "rgba(255,255,255,0.08)" : "transparent", color: on ? "#D8E4EE" : "#6C8AA5", boxShadow: on ? `inset 3px 0 0 ${T.accent}` : "none" }}>
                    <n.icon size={14} />
                    <span className="flex-1 text-left">{n.label}</span>
                    <span className="text-[9px] font-mono rounded px-1 py-0.5" style={{ background: "rgba(255,255,255,0.1)", color: "#8FA9BF" }}>{n.v}</span>
                    <Lock size={10} />
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <p className="text-[9px] leading-snug" style={{ color: "#7B9BB5" }}>Datos sintéticos. Ningún colegiado real.</p>
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
              {[...navV1, ...navFuturo].map((n) => (
                <button key={n.id} onClick={() => ir(n.id)} className="text-xs rounded border px-2 py-1"
                  style={{ borderColor: N.rule, background: vista === n.id ? T.primary : "#FFF", color: vista === n.id ? "#FFF" : N.ink70 }}>{n.label}</button>
              ))}
            </div>
          </header>

          {vista === "dashboard" && <Dashboard T={T} irArbitros={() => ir("arbitros")} />}
          {vista === "arbitros" && !sel && <Listado T={T} onPick={setSel} />}
          {vista === "arbitros" && sel && <Ficha T={T} a={sel} back={() => setSel(null)} />}
          {vista === "designacion" && <DesignacionInteligente T={T} />}
          {vista === "recomendaciones" && <VistaRecomendaciones T={T} />}
          {vista === "economico" && <VistaEconomica T={T} />}
          {vista === "ia" && <VistaIA T={T} />}
        </main>
      </div>
    </div>
  );
}
