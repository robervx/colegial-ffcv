-- Declaraciones de disponibilidad de árbitro por ciclo (spec
-- 002-disponibilidad-arbitro). Append-only: la declaración "vigente" para
-- un (arbitro_id, ciclo_id) es la fila más reciente.
-- Ver specs/002-disponibilidad-arbitro/data-model.md y
-- specs/003-persistencia-real/data-model.md.

create table if not exists public.declaraciones_disponibilidad (
  id uuid primary key default gen_random_uuid(),
  arbitro_id integer not null,
  ciclo_id text not null,
  autor_rol text not null check (autor_rol in ('arbitro', 'comite')),
  tipo text not null check (tipo in ('disponible', 'no_disponible', 'solo_categoria_propia', 'festivo_solicitado')),
  motivo text check (motivo in ('lesion', 'baja', 'urgencia') or motivo is null),
  justificada boolean,
  creado_en timestamptz not null default now(),
  constraint motivo_obligatorio_si_no_disponible check (tipo <> 'no_disponible' or motivo is not null),
  constraint justificada_solo_si_baja check (motivo = 'baja' or justificada is null)
);

create index if not exists declaraciones_disponibilidad_vigente_idx
  on public.declaraciones_disponibilidad (arbitro_id, ciclo_id, creado_en desc);

alter table public.declaraciones_disponibilidad enable row level security;

create policy "declaraciones_disponibilidad: acceso completo sin auth (temporal)"
  on public.declaraciones_disponibilidad
  for all
  to anon
  using (true)
  with check (true);
