import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutGrid, Users, Gavel, Wallet, Trophy, Ban, ChevronRight,
  AlertTriangle, Check, Clock, Search, FileText, MapPin, Palette,
} from "lucide-react";

/* ------------------------------------------------------------------
   TEMAS POR TERRITORIAL
   El producto es el mismo; la identidad se configura por federación.
   Colores de la FFCV tomados de su marca (azul institucional + naranja).
   El resto son configuraciones de ejemplo para enseñar la escalabilidad.
------------------------------------------------------------------- */
const THEMES = {
  ffcv: {
    nombre: "Federació de Futbol Comunitat Valenciana",
    corto: "FFCV", siglas: "FFCV",
    primary: "#0C4C7C", deep: "#08375A", accent: "#F59B1E",
    tint: "#EAF2F8", accentTint: "#FEF3E2",
  },
  fcf: {
    nombre: "Federació Catalana de Futbol",
    corto: "FCF", siglas: "FCF",
    primary: "#1B3F94", deep: "#132D6B", accent: "#D8232A",
    tint: "#ECEFF9", accentTint: "#FBEAEA",
  },
  rfaf: {
    nombre: "Real Federación Andaluza de Fútbol",
    corto: "RFAF", siglas: "RFAF",
    primary: "#0B6B4F", deep: "#07503B", accent: "#F0B323",
    tint: "#E9F4F0", accentTint: "#FDF4E0",
  },
  rfef: {
    nombre: "Real Federación Española de Fútbol",
    corto: "RFEF", siglas: "RFEF",
    primary: "#1A2E5A", deep: "#111F3D", accent: "#C8A24B",
    tint: "#ECEFF6", accentTint: "#F8F2E4",
  },
};

/* neutros y semáforo disciplinario, comunes a todos los temas */
const N = {
  paper: "#F6F7F9", card: "#FFFFFF", ink: "#16202B", ink70: "#5A6672",
  ink40: "#939CA6", rule: "#E1E5EA",
  ta: "#E8C33C", tr: "#C0392B", ok: "#2E7D5B",
};

const EUR_KM = 0.26;

/* ---------------------------- datos sintéticos ---------------------------- */
const ARBITROS = [
  { id: 1, n: "Marc Devesa Ribó", lic: "24118", cat: "Preferente", loc: "Torrent", edad: 27, temp: 6, part: 21, km: 3120, am: 74, ro: 3, inf: 8.4, fis: 9.1, tec: 8.0, disp: 2, vetos: [{ eq: "CD Buñol", motivo: "Incidente en banquillo · jornada 9", hasta: "Fin de temporada" }] },
  { id: 2, n: "Aitana Sospedra Gil", lic: "24902", cat: "Preferente", loc: "Sagunto", edad: 24, temp: 4, part: 19, km: 2410, am: 58, ro: 1, inf: 8.9, fis: 9.4, tec: 8.6, disp: 1, vetos: [] },
  { id: 3, n: "Rubén Català Ferrer", lic: "23744", cat: "1ª Regional", loc: "Alzira", edad: 31, temp: 9, part: 24, km: 4380, am: 96, ro: 6, inf: 6.9, fis: 7.2, tec: 7.1, disp: 6, vetos: [{ eq: "UD Alzira", motivo: "Territorialidad · club de residencia", hasta: "Permanente" }, { eq: "CF Gandía", motivo: "Polémica arbitral · acta ampliada", hasta: "3 jornadas" }] },
  { id: 4, n: "Pau Llorens Sanchis", lic: "25330", cat: "1ª Regional", loc: "Paterna", edad: 22, temp: 2, part: 17, km: 1980, am: 44, ro: 2, inf: 7.8, fis: 8.8, tec: 7.4, disp: 0, vetos: [] },
  { id: 5, n: "Nerea Bonet Ivars", lic: "25011", cat: "2ª Regional", loc: "Xàtiva", edad: 21, temp: 3, part: 22, km: 2760, am: 51, ro: 2, inf: 8.1, fis: 8.5, tec: 7.9, disp: 3, vetos: [] },
  { id: 6, n: "Héctor Balaguer Mas", lic: "22087", cat: "Preferente", loc: "Vila-real", edad: 34, temp: 12, part: 20, km: 5240, am: 63, ro: 4, inf: 7.5, fis: 6.4, tec: 8.2, disp: 8, vetos: [] },
  { id: 7, n: "Ivan Peiró Domingo", lic: "24560", cat: "1ª Regional", loc: "Utiel", edad: 26, temp: 5, part: 18, km: 5910, am: 69, ro: 3, inf: 7.2, fis: 8.0, tec: 7.0, disp: 4, vetos: [] },
  { id: 8, n: "Lucía Ferrando Prats", lic: "25612", cat: "2ª Regional", loc: "Burjassot", edad: 20, temp: 1, part: 15, km: 1240, am: 29, ro: 0, inf: 8.6, fis: 9.0, tec: 8.3, disp: 1, vetos: [] },
  { id: 9, n: "Sergi Company Roig", lic: "23219", cat: "2ª Regional", loc: "Silla", edad: 29, temp: 7, part: 23, km: 2050, am: 88, ro: 7, inf: 6.4, fis: 7.6, tec: 6.8, disp: 5, vetos: [{ eq: "CD Roda", motivo: "Agresión verbal a colegiado · expediente", hasta: "24 meses" }] },
  { id: 10, n: "Andreu Talens Vidal", lic: "24875", cat: "1ª Regional", loc: "Gandía", edad: 25, temp: 4, part: 20, km: 3640, am: 55, ro: 1, inf: 8.2, fis: 8.4, tec: 8.1, disp: 2, vetos: [] },
];

const HIST = [
  { j: 30, fecha: "04/05", local: "Atlético Saguntino", vis: "CF Torre Levante", am: 4, ro: 0, nota: 8.5, km: 92 },
  { j: 29, fecha: "27/04", local: "Silla CF", vis: "CD Almazora", am: 2, ro: 0, nota: 8.6, km: 38 },
  { j: 28, fecha: "20/04", local: "CD Buñol", vis: "Paterna CF", am: 7, ro: 1, nota: 6.8, km: 74, flag: true },
  { j: 27, fecha: "13/04", local: "UD Carcaixent", vis: "CD Utiel", am: 3, ro: 0, nota: 8.4, km: 156 },
  { j: 26, fecha: "06/04", local: "Burjassot CF", vis: "CF Gandía", am: 5, ro: 1, nota: 8.1, km: 118 },
  { j: 25, fecha: "30/03", local: "CD Roda", vis: "UD Alzira", am: 3, ro: 0, nota: 8.7, km: 61 },
];

const NOTAS_TEMP = [
  { j: "J25", nota: 8.7 }, { j: "J26", nota: 8.1 }, { j: "J27", nota: 8.4 },
  { j: "J28", nota: 6.8 }, { j: "J29", nota: 8.6 }, { j: "J30", nota: 8.5 },
];

const COSTE_MES = [
  { m: "Sep", km: 8400, opt: 7100 }, { m: "Oct", km: 12600, opt: 10200 },
  { m: "Nov", km: 13100, opt: 10800 }, { m: "Dic", km: 9200, opt: 7900 },
  { m: "Ene", km: 12800, opt: 10400 }, { m: "Feb", km: 13400, opt: 10900 },
  { m: "Mar", km: 14100, opt: 11300 }, { m: "Abr", km: 13700, opt: 11100 },
  { m: "May", km: 11900, opt: 9800 },
];

const PROPUESTA = [
  { partido: "Atlético Saguntino – CD Roda", cat: "Preferente", hora: "Sáb 18:00", arb: "Aitana Sospedra Gil", km: 21, estado: "ok", nota: "Sin incompatibilidades · 14 días sin dirigir al Saguntino" },
  { partido: "UD Alzira – CF Torre Levante", cat: "Preferente", hora: "Sáb 18:00", arb: "Marc Devesa Ribó", km: 47, estado: "ok", nota: "Sin incompatibilidades activas" },
  { partido: "CD Buñol – Paterna CF", cat: "1ª Regional", hora: "Dom 12:00", arb: "Pau Llorens Sanchis", km: 68, estado: "aviso", nota: "Reside en Paterna · territorialidad pendiente de criterio del técnico" },
  { partido: "CF Gandía – UD Carcaixent", cat: "1ª Regional", hora: "Dom 12:00", arb: "Andreu Talens Vidal", km: 34, estado: "ok", nota: "Sin incompatibilidades activas" },
  { partido: "CD Utiel – Silla CF", cat: "2ª Regional", hora: "Dom 17:00", arb: "Nerea Bonet Ivars", km: 112, estado: "aviso", nota: "Hay dos colegiados disponibles a menos de 40 km" },
  { partido: "Burjassot CF – CD Almazora", cat: "2ª Regional", hora: "Dom 17:00", arb: "Sergi Company Roig", km: 26, estado: "bloqueo", nota: "Veto activo con CD Roda (no afecta) · el CTA pidió revisar sus 7 expulsiones" },
];

const nf = (x) => x.toLocaleString("es-ES");
const eur = (x) => `${Math.round(x).toLocaleString("es-ES")} €`;

/* ------------------------------- piezas UI ------------------------------- */
function Eyebrow({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: N.ink40 }}>{children}</div>;
}

function Panel({ title, children, right, T }) {
  return (
    <section className="rounded-md border overflow-hidden" style={{ background: N.card, borderColor: N.rule }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: N.rule, background: "#FBFCFD" }}>
        <Eyebrow>{title}</Eyebrow>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Kpi({ label, value, sub, tone, T, icon: Icon }) {
  const col = tone === "accent" ? T.accent : tone === "red" ? N.tr : tone === "ok" ? N.ok : T.primary;
  return (
    <div className="rounded-md border p-4" style={{ background: N.card, borderColor: N.rule }}>
      <div className="flex items-center justify-between mb-2.5">
        <Eyebrow>{label}</Eyebrow>
        {Icon && <Icon size={13} style={{ color: N.ink40 }} />}
      </div>
      <div className="font-mono text-3xl tabular-nums leading-none" style={{ color: col }}>{value}</div>
      {sub && <div className="text-xs mt-2" style={{ color: N.ink70 }}>{sub}</div>}
    </div>
  );
}

function Chip({ tone, children, T }) {
  const map = {
    ok: { bg: "#E7F2EC", fg: N.ok },
    aviso: { bg: T.accentTint, fg: "#A2660A" },
    bloqueo: { bg: "#FAE9E7", fg: N.tr },
    marca: { bg: T.tint, fg: T.primary },
    neutro: { bg: "#EFF1F4", fg: N.ink70 },
  }[tone] || { bg: "#EFF1F4", fg: N.ink70 };
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ background: map.bg, color: map.fg }}>{children}</span>
  );
}

/* firma visual: la barra de disciplina, amarillas y rojas con su peso real */
function Disciplina({ am, ro, w = "w-24" }) {
  const total = am + ro * 3 || 1;
  return (
    <div className={`flex h-4 gap-px ${w}`}>
      <div style={{ width: `${(am / total) * 100}%`, background: N.ta }} />
      <div style={{ width: `${((ro * 3) / total) * 100}%`, background: N.tr }} />
    </div>
  );
}

/* placeholder del escudo: cada territorial sube el suyo */
function Escudo({ T, size = 40 }) {
  return (
    <div className="rounded flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, background: T.accent, color: T.deep, fontSize: size * 0.28, letterSpacing: "0.02em" }}>
      {T.siglas}
    </div>
  );
}

/* --------------------------------- vistas -------------------------------- */
function PanelInicio({ T, go }) {
  const real = COSTE_MES.reduce((a, b) => a + b.km, 0);
  const opt = COSTE_MES.reduce((a, b) => a + b.opt, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi T={T} label="Colegiados activos" value="248" sub="4 categorías · 6 delegaciones" icon={Users} />
        <Kpi T={T} label="Informes de la jornada" value="41" tone="accent" sub="7 pendientes de firmar" icon={FileText} />
        <Kpi T={T} label="Encuentros dirigidos" value={nf(1988)} sub="Temporada 2025/26" icon={Gavel} />
        <Kpi T={T} label="Vetos activos" value="17" tone="red" sub="3 vencen esta jornada" icon={Ban} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Panel T={T} title="Evolución de la nota media de informes por categoría">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={NOTAS_TEMP} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.primary} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={T.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={N.rule} vertical={false} />
                <XAxis dataKey="j" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={{ stroke: N.rule }} tickLine={false} />
                <YAxis domain={[6, 10]} tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="nota" stroke={T.primary} fill="url(#g1)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs mt-2" style={{ color: N.ink70 }}>
              La caída de la jornada 28 corresponde a los tres encuentros con acta ampliada.
            </p>
          </Panel>
        </div>

        <Panel T={T} title="Requiere decisión del técnico">
          <div className="space-y-2.5">
            {[
              { t: "Sergi Company Roig", d: "7 expulsiones en 23 encuentros", tone: "bloqueo", et: "Revisar" },
              { t: "CD Buñol – Paterna CF", d: "Posible territorialidad del designado", tone: "aviso", et: "Aviso" },
              { t: "Veto con CF Gandía", d: "Vence el domingo · levantar o prorrogar", tone: "neutro", et: "Vence" },
              { t: "7 informes sin firmar", d: "Jornada 30 · cierre el miércoles", tone: "aviso", et: "Plazo" },
            ].map((x, i) => (
              <button key={i} onClick={() => go("designacion")}
                className="w-full text-left rounded border p-3 hover:bg-slate-50 transition-colors"
                style={{ borderColor: N.rule }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: N.ink }}>{x.t}</div>
                    <div className="text-xs mt-0.5" style={{ color: N.ink70 }}>{x.d}</div>
                  </div>
                  <Chip T={T} tone={x.tone}>{x.et}</Chip>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Listado({ T, onPick }) {
  const [q, setQ] = useState("");
  const rows = ARBITROS.filter((a) => (a.n + a.cat + a.loc + a.lic).toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel T={T} title={`Colegiados · ${rows.length} de ${ARBITROS.length}`}
      right={
        <div className="flex items-center gap-2 rounded border px-2 py-1 bg-white" style={{ borderColor: N.rule }}>
          <Search size={13} style={{ color: N.ink40 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o licencia"
            className="text-xs outline-none w-48 bg-transparent" style={{ color: N.ink }} />
        </div>
      }>
      <div className="overflow-x-auto -m-5">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Licencia", "Colegiado", "Categoría", "PJ", "Disciplina", "TA/PJ", "Informes", "Vetos", "Km", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-semibold border-b"
                  style={{ color: N.ink40, borderColor: N.rule }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} onClick={() => onPick(a)}
                className="cursor-pointer border-b hover:bg-slate-50 transition-colors" style={{ borderColor: N.rule }}>
                <td className="px-3 py-3 font-mono text-xs" style={{ color: N.ink40 }}>{a.lic}</td>
                <td className="px-3 py-3 font-medium whitespace-nowrap" style={{ color: N.ink }}>{a.n}</td>
                <td className="px-3 py-3"><Chip T={T} tone="marca">{a.cat}</Chip></td>
                <td className="px-3 py-3 font-mono tabular-nums text-xs">{a.part}</td>
                <td className="px-3 py-3"><Disciplina am={a.am} ro={a.ro} /></td>
                <td className="px-3 py-3 font-mono tabular-nums text-xs">{(a.am / a.part).toFixed(1)}</td>
                <td className="px-3 py-3 font-mono tabular-nums text-xs font-semibold"
                  style={{ color: a.inf >= 8 ? N.ok : a.inf < 7 ? N.tr : N.ink }}>{a.inf.toFixed(1)}</td>
                <td className="px-3 py-3">{a.vetos.length ? <Chip T={T} tone="bloqueo">{a.vetos.length}</Chip> : <span className="text-xs" style={{ color: N.ink40 }}>—</span>}</td>
                <td className="px-3 py-3 font-mono tabular-nums text-xs" style={{ color: N.ink40 }}>{nf(a.km)}</td>
                <td className="px-3 py-3"><ChevronRight size={14} style={{ color: N.ink40 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Ficha({ T, a, back }) {
  return (
    <div className="space-y-5">
      <button onClick={back} className="text-xs flex items-center gap-1" style={{ color: N.ink70 }}>
        <ChevronRight size={13} className="rotate-180" /> Volver al listado
      </button>

      {/* cabecera institucional */}
      <div className="rounded-md overflow-hidden" style={{ background: T.primary }}>
        <div className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Escudo T={T} size={52} />
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] mb-1" style={{ color: T.accent }}>
                LICENCIA {a.lic}
              </div>
              <h2 className="text-2xl font-semibold text-white leading-tight">{a.n}</h2>
              <div className="text-xs mt-1.5" style={{ color: "#B7CBDD" }}>
                {a.cat} · {a.loc} · {a.edad} años · {a.temp} temporadas en el comité
              </div>
            </div>
          </div>
          <div className="flex gap-8">
            {[["Encuentros", a.part], ["Media informes", a.inf.toFixed(1)], ["TA por partido", (a.am / a.part).toFixed(1)], ["Expulsiones", a.ro]].map(([l, v]) => (
              <div key={l}>
                <div className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "#93AEC6" }}>{l}</div>
                <div className="font-mono text-2xl text-white tabular-nums">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-1" style={{ background: T.accent }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Panel T={T} title="Historial de encuentros"
            right={<span className="text-[11px]" style={{ color: N.ink40 }}>Últimos 6 de {a.part}</span>}>
            <div className="-m-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["J", "Fecha", "Encuentro", "TA", "TR", "Informe", "Km"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold border-b"
                        style={{ color: N.ink40, borderColor: N.rule }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HIST.map((p) => (
                    <tr key={p.j} className="border-b" style={{ borderColor: N.rule, background: p.flag ? T.accentTint : "transparent" }}>
                      <td className="px-3 py-2.5 font-mono text-xs" style={{ color: N.ink40 }}>{p.j}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{p.fecha}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: N.ink }}>
                        {p.local} <span style={{ color: N.ink40 }}>–</span> {p.vis}
                        {p.flag && <span className="ml-2"><Chip T={T} tone="aviso">Acta ampliada</Chip></span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums font-semibold" style={{ color: "#B08D14" }}>{p.am}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums font-semibold" style={{ color: N.tr }}>{p.ro}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums font-semibold"
                        style={{ color: p.nota >= 8 ? N.ok : p.nota < 7 ? N.tr : N.ink }}>{p.nota.toFixed(1)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums" style={{ color: N.ink40 }}>{p.km}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel T={T} title="Incompatibilidades y vetos">
            {a.vetos.length === 0 ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: N.ink70 }}>
                <Check size={15} style={{ color: N.ok }} /> Sin restricciones activas. Designable en cualquier encuentro de su categoría.
              </div>
            ) : (
              <div className="space-y-2">
                {a.vetos.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 rounded border p-3" style={{ borderColor: N.rule }}>
                    <Ban size={15} className="mt-0.5 shrink-0" style={{ color: N.tr }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: N.ink }}>{v.eq}</div>
                      <div className="text-xs mt-0.5" style={{ color: N.ink70 }}>{v.motivo}</div>
                    </div>
                    <Chip T={T} tone="neutro"><Clock size={11} /> {v.hasta}</Chip>
                  </div>
                ))}
              </div>
            )}
            <button className="mt-4 text-xs rounded px-3 py-1.5 text-white font-medium" style={{ background: T.primary }}>
              Añadir incompatibilidad
            </button>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel T={T} title="Pruebas de pretemporada">
            <div className="space-y-4">
              {[["Media de informes", a.inf, "Cierre jornada 30"], ["Prueba física", a.fis, "Yo-Yo IR1 · septiembre"], ["Prueba técnica", a.tec, "Reglas de juego · septiembre"]].map(([l, v, s]) => (
                <div key={l}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm" style={{ color: N.ink }}>{l}</span>
                    <span className="font-mono text-sm tabular-nums font-semibold" style={{ color: T.primary }}>{v.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: "#EDF0F3" }}>
                    <div className="h-full rounded-sm" style={{ width: `${v * 10}%`, background: v >= 8 ? T.primary : T.accent }} />
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: N.ink40 }}>{s}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel T={T} title="Disciplina de la temporada">
            <div className="flex items-end gap-6 mb-4">
              <div>
                <div className="font-mono text-3xl tabular-nums" style={{ color: "#B08D14" }}>{a.am}</div>
                <Eyebrow>Amarillas</Eyebrow>
              </div>
              <div>
                <div className="font-mono text-3xl tabular-nums" style={{ color: N.tr }}>{a.ro}</div>
                <Eyebrow>Rojas</Eyebrow>
              </div>
            </div>
            <Disciplina am={a.am} ro={a.ro} w="w-full" />
            <p className="text-xs mt-3" style={{ color: N.ink70 }}>
              Media de la categoría: 3,1 amarillas por encuentro. Este colegiado está {(a.am / a.part) > 3.1 ? "por encima" : "por debajo"} de la media.
            </p>
          </Panel>

          <Panel T={T} title="Datos de gestión">
            <div className="space-y-2.5 text-sm">
              {[["Kilómetros de la temporada", `${nf(a.km)} km`], ["Liquidación de desplazamientos", eur(a.km * EUR_KM)], ["Fines de semana no disponibles", a.disp]].map(([l, v]) => (
                <div key={l} className="flex items-baseline justify-between gap-4">
                  <span style={{ color: N.ink70 }}>{l}</span>
                  <span className="font-mono text-xs tabular-nums shrink-0" style={{ color: N.ink }}>{v}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-4 pt-3 border-t" style={{ color: N.ink40, borderColor: N.rule }}>
              Información administrativa. No interviene en la evaluación ni en la clasificación del colegiado.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Designacion({ T }) {
  const [ok, setOk] = useState([]);
  const km = PROPUESTA.reduce((s, p) => s + p.km, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi T={T} label="Encuentros jornada 31" value="6" sub="Propuesta generada en 4 segundos" icon={Gavel} />
        <Kpi T={T} label="Restricciones aplicadas" value="4" tone="accent" sub="Vetos, territorialidad, descanso, disponibilidad" icon={Ban} />
        <Kpi T={T} label="Kilómetros de la propuesta" value={nf(km)} tone="ok" sub="Reparto manual equivalente: 512 km" icon={MapPin} />
      </div>

      <Panel T={T} title="Propuesta de designación · jornada 31"
        right={
          <button className="text-xs rounded px-3 py-1.5 text-white font-medium" style={{ background: ok.length === 6 ? T.primary : N.ink40 }}>
            Confirmar {ok.length}/6 y publicar
          </button>
        }>
        <div className="space-y-2">
          {PROPUESTA.map((p, i) => {
            const on = ok.includes(i);
            return (
              <div key={i} className="rounded border p-4 transition-colors"
                style={{ borderColor: on ? N.ok : N.rule, background: on ? "#F7FCF9" : N.card }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: N.ink }}>{p.partido}</span>
                      <Chip T={T} tone="marca">{p.cat}</Chip>
                      <span className="text-xs font-mono" style={{ color: N.ink40 }}>{p.hora}</span>
                    </div>
                    <div className="text-sm mt-2" style={{ color: N.ink }}>
                      <span style={{ color: N.ink40 }}>Designado: </span>
                      <span className="font-medium">{p.arb}</span>
                      <span className="font-mono text-xs ml-2" style={{ color: N.ink40 }}>{p.km} km</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: N.ink70 }}>{p.nota}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Chip T={T} tone={p.estado}>
                      {p.estado === "ok" ? <><Check size={11} /> Sin conflicto</> :
                        p.estado === "aviso" ? <><AlertTriangle size={11} /> Revisar</> :
                          <><Ban size={11} /> Atención</>}
                    </Chip>
                    <button onClick={() => setOk(on ? ok.filter((x) => x !== i) : [...ok, i])}
                      className="text-xs rounded border px-3 py-1.5 font-medium transition-colors"
                      style={{ borderColor: on ? N.ok : N.rule, color: on ? N.ok : N.ink70, background: on ? "#FFF" : "#FFF" }}>
                      {on ? "Confirmada" : "Confirmar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-4 pt-4 border-t" style={{ color: N.ink70, borderColor: N.rule }}>
          El motor filtra por vetos activos, territorialidad, descanso entre encuentros, disponibilidad declarada y
          proximidad. La designación no se publica sin la confirmación del técnico.
        </p>
      </Panel>
    </div>
  );
}

function Economico({ T }) {
  const real = COSTE_MES.reduce((a, b) => a + b.km, 0);
  const opt = COSTE_MES.reduce((a, b) => a + b.opt, 0);
  const top = [...ARBITROS].sort((a, b) => b.km - a.km).slice(0, 6)
    .map((a) => ({ n: a.n.split(" ")[0] + " " + a.n.split(" ")[1][0] + ".", km: a.km }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Kpi T={T} label="Liquidado a colegiados" value={eur(real * EUR_KM)} sub={`${nf(real)} km a ${EUR_KM.toFixed(2)} €/km`} />
        <Kpi T={T} label="Con reparto por proximidad" value={eur(opt * EUR_KM)} tone="ok" sub={`${nf(opt)} km`} />
        <Kpi T={T} label="Diferencia" value={eur((real - opt) * EUR_KM)} tone="red" sub="18,4 % del gasto de desplazamiento" />
        <Kpi T={T} label="Coste medio por encuentro" value={eur((real * EUR_KM) / 199)} sub="199 encuentros liquidados" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel T={T} title="Kilómetros liquidados frente a asignación por proximidad">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={COSTE_MES} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={N.rule} vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: N.ink40 }} axisLine={{ stroke: N.rule }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: N.ink40 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 4, border: `1px solid ${N.rule}`, fontSize: 12 }}
                formatter={(v, k) => [`${nf(v)} km`, k === "km" ? "Liquidado" : "Por proximidad"]} />
              <Area type="monotone" dataKey="km" stroke={T.accent} fill={T.accent} fillOpacity={0.1} strokeWidth={2.5} />
              <Area type="monotone" dataKey="opt" stroke={T.primary} fill={T.primary} fillOpacity={0.06} strokeWidth={2} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel T={T} title="El argumento ante la federación">
          <div className="space-y-4 text-sm" style={{ color: N.ink70 }}>
            <p>
              Con 248 colegiados y un reparto hecho sobre hojas de cálculo, el comité liquida
              <span className="font-mono font-semibold" style={{ color: N.ink }}> {eur((real - opt) * EUR_KM)} </span>
              más al año de lo que costaría el mismo calendario asignado con criterios de proximidad.
            </p>
            <p>
              No es un ahorro teórico. Son encuentros concretos: un colegiado de Utiel desplazado a Gandía
              habiendo tres disponibles a menos de 40 km.
            </p>
            <div className="rounded border p-4" style={{ borderColor: N.rule, background: T.tint }}>
              <Eyebrow>Retorno de la inversión</Eyebrow>
              <div className="font-mono text-3xl mt-2" style={{ color: T.primary }}>×3,4</div>
              <p className="text-xs mt-2" style={{ color: N.ink70 }}>
                El ahorro de una sola temporada cubre la licencia inicial y varios años de mantenimiento.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Clasificacion({ T }) {
  const rows = useMemo(() => [...ARBITROS]
    .map((a) => ({ ...a, idx: a.inf * 0.5 + a.fis * 0.25 + a.tec * 0.25 }))
    .sort((a, b) => b.idx - a.idx), []);
  return (
    <Panel T={T} title="Clasificación de la temporada"
      right={<span className="text-[11px]" style={{ color: N.ink40 }}>Informes 50 % · Física 25 % · Técnica 25 %</span>}>
      <div>
        {rows.map((a, i) => (
          <div key={a.id} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: N.rule }}>
            <span className="font-mono text-sm w-7 tabular-nums font-semibold"
              style={{ color: i < 3 ? T.accent : N.ink40 }}>{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: N.ink }}>{a.n}</div>
              <div className="text-xs" style={{ color: N.ink40 }}>{a.cat} · Licencia {a.lic}</div>
            </div>
            <div className="hidden sm:flex gap-5 font-mono text-xs tabular-nums" style={{ color: N.ink70 }}>
              <span>{a.inf.toFixed(1)}</span><span>{a.fis.toFixed(1)}</span><span>{a.tec.toFixed(1)}</span>
            </div>
            <div className="w-28 h-1.5 rounded-sm overflow-hidden hidden sm:block" style={{ background: "#EDF0F3" }}>
              <div className="h-full" style={{ width: `${a.idx * 10}%`, background: i < 3 ? T.accent : T.primary }} />
            </div>
            <span className="font-mono text-sm w-10 text-right tabular-nums font-semibold" style={{ color: T.primary }}>
              {a.idx.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs mt-4 pt-4 border-t" style={{ color: N.ink70, borderColor: N.rule }}>
        La disponibilidad declarada y los kilómetros recorridos no puntúan. Son información de gestión, nunca criterio de clasificación.
      </p>
    </Panel>
  );
}

/* ---------------------------------- shell --------------------------------- */
export default function CRMArbitral() {
  const [tid, setTid] = useState("ffcv");
  const [vista, setVista] = useState("panel");
  const [sel, setSel] = useState(null);
  const T = THEMES[tid];

  const nav = [
    { id: "panel", label: "Panel", icon: LayoutGrid },
    { id: "arbitros", label: "Colegiados", icon: Users },
    { id: "designacion", label: "Designación", icon: Gavel },
    { id: "economico", label: "Desplazamientos", icon: Wallet },
    { id: "clasificacion", label: "Clasificación", icon: Trophy },
  ];
  const ir = (v) => { setVista(v); setSel(null); };

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
            {nav.map((n) => {
              const on = vista === n.id;
              return (
                <button key={n.id} onClick={() => ir(n.id)}
                  className="w-full flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
                  style={{
                    background: on ? "rgba(255,255,255,0.12)" : "transparent",
                    color: on ? "#FFF" : "#A9C3D8",
                    boxShadow: on ? `inset 3px 0 0 ${T.accent}` : "none",
                  }}>
                  <n.icon size={15} /> {n.label}
                </button>
              );
            })}
          </nav>

          {/* selector de territorial: la misma herramienta, la marca de cada federación */}
          <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette size={11} style={{ color: T.accent }} />
              <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#A9C3D8" }}>Territorial</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} onClick={() => setTid(k)} title={t.nombre}
                  className="rounded text-[9px] font-bold py-1.5 transition-opacity"
                  style={{
                    background: k === tid ? t.accent : "rgba(255,255,255,0.1)",
                    color: k === tid ? t.deep : "#A9C3D8",
                  }}>
                  {t.siglas}
                </button>
              ))}
            </div>
            <p className="text-[9px] mt-2.5 leading-snug" style={{ color: "#7B9BB5" }}>
              Datos sintéticos. Ningún colegiado real.
            </p>
          </div>
        </aside>

        <main className="flex-1 p-5 sm:p-7 max-w-[1400px]">
          <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: T.primary }}>
                {sel ? "Expediente del colegiado" : nav.find((n) => n.id === vista)?.label}
              </h1>
              <p className="text-xs mt-1" style={{ color: N.ink70 }}>
                {T.nombre} · Temporada 2025/26 · Jornada 31
              </p>
            </div>
            <div className="flex md:hidden gap-1 flex-wrap">
              {nav.map((n) => (
                <button key={n.id} onClick={() => ir(n.id)}
                  className="text-xs rounded border px-2 py-1"
                  style={{
                    borderColor: N.rule,
                    background: vista === n.id ? T.primary : "#FFF",
                    color: vista === n.id ? "#FFF" : N.ink70,
                  }}>{n.label}</button>
              ))}
            </div>
          </header>

          {vista === "panel" && <PanelInicio T={T} go={ir} />}
          {vista === "arbitros" && !sel && <Listado T={T} onPick={setSel} />}
          {vista === "arbitros" && sel && <Ficha T={T} a={sel} back={() => setSel(null)} />}
          {vista === "designacion" && <Designacion T={T} />}
          {vista === "economico" && <Economico T={T} />}
          {vista === "clasificacion" && <Clasificacion T={T} />}
        </main>
      </div>
    </div>
  );
}
