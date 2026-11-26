import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  Users, Search, ChevronRight, TrendingUp, TrendingDown, Minus,
  Upload, FileText, Calendar, AlertCircle, Palette, Lock, Sparkles,
  MessageSquarePlus, Gavel, Wallet, Bot, Check, Ban, AlertTriangle, Send,
} from "lucide-react";

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

/* --------- datos sintéticos ---------
   gest = gestión de partido, radar; indisp = fines de semana no disponibles */
const ARBITROS = [
  { id: 1, n: "Marc Devesa Ribó", lic: "24118", cat: "Preferente", loc: "Torrent", edad: 27, temp: 6, foto: "MD", indisp: 2, gest: 8.2,
    hist: [
      { temp: "2023/24", part: 22, am: 71, ro: 4, media: 7.9 },
      { temp: "2024/25", part: 20, am: 66, ro: 2, media: 8.2 },
      { temp: "2025/26", part: 21, am: 74, ro: 3, media: 8.4 },
    ],
    forma: [7.8, 8.1, 6.8, 8.4, 8.6, 8.5], fis: 9.1, tec: 8.0,
    notas: [
      { fecha: "02/05/26", autor: "J. Delegado", texto: "Llamada de seguimiento tras la J28. Actitud muy positiva, asume el error de la expulsión y pide vídeo del partido." },
    ] },
  { id: 2, n: "Aitana Sospedra Gil", lic: "24902", cat: "Preferente", loc: "Sagunto", edad: 24, temp: 4, foto: "AS", indisp: 1, gest: 8.9,
    hist: [
      { temp: "2023/24", part: 18, am: 49, ro: 2, media: 8.3 },
      { temp: "2024/25", part: 19, am: 55, ro: 1, media: 8.6 },
      { temp: "2025/26", part: 19, am: 58, ro: 1, media: 8.9 },
    ],
    forma: [8.5, 8.7, 8.6, 9.0, 8.8, 9.1], fis: 9.4, tec: 8.6,
    notas: [
      { fecha: "20/04/26", autor: "CTA", texto: "Candidata clara a designaciones de más nivel la próxima temporada. Comentado en reunión de delegación." },
    ] },
  { id: 3, n: "Rubén Català Ferrer", lic: "23744", cat: "1ª Regional", loc: "Alzira", edad: 31, temp: 9, foto: "RC", indisp: 6, gest: 6.8,
    hist: [
      { temp: "2023/24", part: 25, am: 88, ro: 5, media: 7.3 },
      { temp: "2024/25", part: 26, am: 92, ro: 7, media: 7.0 },
      { temp: "2025/26", part: 24, am: 96, ro: 6, media: 6.9 },
    ],
    forma: [7.4, 7.1, 6.8, 6.5, 6.9, 6.4], fis: 7.2, tec: 7.1, notas: [] },
  { id: 4, n: "Pau Llorens Sanchis", lic: "25330", cat: "1ª Regional", loc: "Paterna", edad: 22, temp: 2, foto: "PL", indisp: 0, gest: 7.6,
    hist: [
      { temp: "2024/25", part: 16, am: 40, ro: 1, media: 7.5 },
      { temp: "2025/26", part: 17, am: 44, ro: 2, media: 7.8 },
    ],
    forma: [7.5, 7.6, 7.9, 7.8, 8.1, 8.0], fis: 8.8, tec: 7.4, notas: [] },
  { id: 5, n: "Nerea Bonet Ivars", lic: "25011", cat: "2ª Regional", loc: "Xàtiva", edad: 21, temp: 3, foto: "NB", indisp: 3, gest: 8.0,
    hist: [
      { temp: "2023/24", part: 20, am: 47, ro: 1, media: 7.8 },
      { temp: "2024/25", part: 21, am: 49, ro: 3, media: 7.9 },
      { temp: "2025/26", part: 22, am: 51, ro: 2, media: 8.1 },
    ],
    forma: [8.0, 7.7, 8.2, 8.1, 8.3, 8.1], fis: 8.5, tec: 7.9, notas: [] },
  { id: 6, n: "Héctor Balaguer Mas", lic: "22087", cat: "Preferente", loc: "Vila-real", edad: 34, temp: 12, foto: "HB", indisp: 8, gest: 8.4,
    hist: [
      { temp: "2023/24", part: 22, am: 60, ro: 3, media: 7.9 },
      { temp: "2024/25", part: 21, am: 61, ro: 5, media: 7.7 },
      { temp: "2025/26", part: 20, am: 63, ro: 4, media: 7.5 },
    ],
    forma: [7.8, 7.6, 7.4, 7.7, 7.2, 7.5], fis: 6.4, tec: 8.2,
    notas: [
      { fecha: "15/03/26", autor: "J. Delegado", texto: "Comunicó que la disponibilidad baja de este año es por motivos familiares. Situación temporal." },
    ] },
  { id: 7, n: "Lucía Ferrando Prats", lic: "25612", cat: "2ª Regional", loc: "Burjassot", edad: 20, temp: 1, foto: "LF", indisp: 1, gest: 7.9,
    hist: [
      { temp: "2025/26", part: 15, am: 29, ro: 0, media: 8.6 },
    ],
    forma: [8.2, 8.4, 8.5, 8.6, 8.7, 8.9], fis: 9.0, tec: 8.3, notas: [] },
  { id: 8, n: "Sergi Company Roig", lic: "23219", cat: "2ª Regional", loc: "Silla", edad: 29, temp: 7, foto: "SC", indisp: 5, gest: 6.2,
    hist: [
      { temp: "2023/24", part: 24, am: 79, ro: 5, media: 6.9 },
      { temp: "2024/25", part: 22, am: 84, ro: 6, media: 6.6 },
      { temp: "2025/26", part: 23, am: 88, ro: 7, media: 6.4 },
    ],
    forma: [6.8, 6.5, 6.2, 6.6, 6.1, 6.4], fis: 7.6, tec: 6.8, notas: [] },
];

const CATEGORIAS = ["Todas", "Preferente", "1ª Regional", "2ª Regional"];

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
function Avatar({ txt, T, size = 40 }) {
  return (
    <div className="rounded-full flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, background: T.tint, color: T.primary, fontSize: size * 0.36 }}>{txt}</div>
  );
}
function Escudo({ T, size = 38 }) {
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
          <div className="flex items-center justify-between mb-2"><Eyebrow>Expedientes</Eyebrow><Users size={13} style={{ color: N.ink40 }} /></div>
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

      <Panel title={`Expedientes · ${filas.length} de ${ARBITROS.length}`}
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
  const addNota = () => {
    if (!nueva.trim()) return;
    setNotas([{ fecha: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }), autor: "Tú", texto: nueva.trim() }, ...notas]);
    setNueva("");
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
              <div className="text-xs mt-1.5" style={{ color: "#B7CBDD" }}>{a.cat} · {a.loc} · {a.edad} años · {a.temp} temporadas</div>
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

          {/* comentarios internos */}
          <Panel title="Seguimiento interno"
            right={<span className="text-[11px] flex items-center gap-1" style={{ color: N.ink40 }}><Lock size={11} /> visible solo para el comité</span>}>
            <div className="flex gap-2 mb-4">
              <input value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota()}
                placeholder="Añadir nota de seguimiento (llamadas, conversaciones, contexto)…"
                className="flex-1 text-sm rounded border px-3 py-2 outline-none" style={{ borderColor: N.rule, color: N.ink }} />
              <button onClick={addNota} className="text-xs rounded px-3 py-2 text-white font-medium flex items-center gap-1.5" style={{ background: T.primary }}>
                <MessageSquarePlus size={14} /> Guardar
              </button>
            </div>
            {notas.length === 0 ? (
              <p className="text-xs" style={{ color: N.ink40 }}>Sin notas de seguimiento. Las notas quedan registradas con autor y fecha (audit log).</p>
            ) : (
              <div className="space-y-2.5">
                {notas.map((nt, i) => (
                  <div key={i} className="rounded border p-3" style={{ borderColor: N.rule, background: i === 0 && nt.autor === "Tú" ? T.tint : "#FFF" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: T.primary }}>{nt.autor}</span>
                      <span className="text-[11px] font-mono" style={{ color: N.ink40 }}>{nt.fecha}</span>
                    </div>
                    <p className="text-sm" style={{ color: N.ink70 }}>{nt.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
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
              {[["Actas y tarjetas", "Excel FFCV 23-26"], ["Informes técnicos", "PDF cargados"], ["Pruebas físicas", "Excel pretemporada"]].map(([l, src]) => (
                <div key={l} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2" style={{ color: N.ink70 }}>
                    <FileText size={13} style={{ color: N.ink40 }} />{l}
                  </span>
                  <span className="font-mono" style={{ color: N.ink40 }}>{src}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- ingesta ------------------------------- */
function Ingesta({ T }) {
  return (
    <Panel title="Carga de histórico">
      <div className="rounded-lg border-2 border-dashed p-10 text-center" style={{ borderColor: N.rule }}>
        <Upload size={32} style={{ color: T.primary }} className="mx-auto mb-3" />
        <div className="text-sm font-medium" style={{ color: N.ink }}>Arrastra aquí los Excel y PDFs del comité</div>
        <div className="text-xs mt-1.5 max-w-md mx-auto" style={{ color: N.ink70 }}>
          El sistema detecta columnas de nombre, licencia, partidos, tarjetas y notas, propone la correspondencia
          y tú confirmas antes de guardar.
        </div>
        <button className="mt-4 text-xs rounded px-4 py-2 text-white font-medium" style={{ background: T.primary }}>Seleccionar archivos</button>
      </div>
      <div className="mt-4 rounded p-3 flex items-start gap-2" style={{ background: T.accentTint }}>
        <AlertCircle size={15} style={{ color: N.ambar }} className="mt-0.5 shrink-0" />
        <p className="text-xs" style={{ color: "#7A5A10" }}>
          La carga autoservicio llega en la versión 1.5. En la puesta en marcha inicial, los expedientes se cargan con vuestros archivos en una sesión conjunta.
        </p>
      </div>
    </Panel>
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
  const [tid, setTid] = useState("ffcv");
  const [vista, setVista] = useState("expedientes");
  const [sel, setSel] = useState(null);
  const T = THEMES[tid];

  const navV1 = [
    { id: "expedientes", label: "Expedientes", icon: Users },
    { id: "ingesta", label: "Cargar histórico", icon: Upload },
  ];
  const navFuturo = [
    { id: "recomendaciones", label: "Recomendaciones", icon: Gavel, v: "v2" },
    { id: "economico", label: "Económico", icon: Wallet, v: "v3" },
    { id: "ia", label: "Consultar con IA", icon: Sparkles, v: "v3" },
  ];
  const ir = (v) => { setVista(v); setSel(null); };
  const tituloVista = { expedientes: "Expedientes", ingesta: "Cargar histórico", recomendaciones: "Recomendaciones de designación", economico: "Control económico", ia: "Consultar con IA" };

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
            <div className="flex items-center gap-1.5 mb-2">
              <Palette size={11} style={{ color: T.accent }} />
              <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#A9C3D8" }}>Territorial</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} onClick={() => setTid(k)} title={t.nombre}
                  className="rounded text-[9px] font-bold py-1.5"
                  style={{ background: k === tid ? t.accent : "rgba(255,255,255,0.1)", color: k === tid ? t.deep : "#A9C3D8" }}>{t.siglas}</button>
              ))}
            </div>
            <p className="text-[9px] mt-2.5 leading-snug" style={{ color: "#7B9BB5" }}>Datos sintéticos. Ningún colegiado real.</p>
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

          {vista === "expedientes" && !sel && <Listado T={T} onPick={setSel} />}
          {vista === "expedientes" && sel && <Ficha T={T} a={sel} back={() => setSel(null)} />}
          {vista === "ingesta" && <Ingesta T={T} />}
          {vista === "recomendaciones" && <VistaRecomendaciones T={T} />}
          {vista === "economico" && <VistaEconomica T={T} />}
          {vista === "ia" && <VistaIA T={T} />}
        </main>
      </div>
    </div>
  );
}
