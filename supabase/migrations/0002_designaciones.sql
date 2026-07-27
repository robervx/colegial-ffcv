-- Decisiones de designación (Confirmar / Cambiar candidato) tomadas por el
-- comité sobre los resultados calculados por el motor. Append-only: la
-- decisión "vigente" para un partido es la fila más reciente, no se
-- actualiza ni se borra ninguna anterior.
-- Ver specs/003-persistencia-real/data-model.md.

create table if not exists public.designaciones (
  id uuid primary key default gen_random_uuid(),
  ciclo_id text not null,
  partido_id text not null,
  arbitro_id integer not null,
  es_sugerido boolean not null,
  motivo text,
  decidido_por_rol text not null check (decidido_por_rol in ('arbitro', 'comite')),
  decidido_en timestamptz not null default now(),
  constraint motivo_obligatorio_si_no_sugerido check (es_sugerido = true or motivo is not null)
);

create index if not exists designaciones_partido_vigente_idx on public.designaciones (partido_id, decidido_en desc);
create index if not exists designaciones_ciclo_id_idx on public.designaciones (ciclo_id);

alter table public.designaciones enable row level security;

create policy "designaciones: acceso completo sin auth (temporal)"
  on public.designaciones
  for all
  to anon
  using (true)
  with check (true);
