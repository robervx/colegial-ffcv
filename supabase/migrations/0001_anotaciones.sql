-- Notas de seguimiento del comité sobre un árbitro (ficha, panel "Seguimiento interno").
-- Append-only: nunca se actualiza ni se borra una fila.
-- Ver specs/003-persistencia-real/data-model.md.

create table if not exists public.anotaciones (
  id uuid primary key default gen_random_uuid(),
  arbitro_id integer not null,
  etiqueta text not null check (etiqueta in ('seguimiento', 'positiva', 'mejora', 'disciplinaria')),
  texto text not null check (length(trim(texto)) > 0),
  autor text not null,
  fuente text not null check (fuente in ('real', 'sintetico')),
  creado_en timestamptz not null default now()
);

create index if not exists anotaciones_arbitro_id_idx on public.anotaciones (arbitro_id, creado_en desc);

alter table public.anotaciones enable row level security;

-- Política permisiva deliberada: sin autenticación real todavía (ver
-- specs/003-persistencia-real/research.md §3). Estrechar cuando exista un
-- modelo de roles/autenticación real.
create policy "anotaciones: acceso completo sin auth (temporal)"
  on public.anotaciones
  for all
  to anon
  using (true)
  with check (true);
