-- Estrecha la política permisiva de 0001/0002/0003: las tres tablas son
-- append-only por diseño (ver research.md §4 de specs/003-persistencia-real)
-- y ninguna función de lib/*Repo.js hace UPDATE ni DELETE. Quitar esos dos
-- verbos a `anon` reduce el alcance de la clave publicable sin necesitar
-- todavía un modelo de roles/autenticación real (que sigue pendiente,
-- FR-012 de specs/002-disponibilidad-arbitro).
--
-- No sustituye la autenticación real — solo reduce el daño posible mientras
-- no exista. Pendiente de aplicar contra el proyecto Supabase real (mismo
-- paso manual que ya hizo Roberto para 0001-0003, ver T006 de
-- specs/003-persistencia-real/tasks.md).

drop policy if exists "anotaciones: acceso completo sin auth (temporal)" on public.anotaciones;
create policy "anotaciones: lectura e insercion sin auth (temporal)"
  on public.anotaciones
  for select
  to anon
  using (true);
create policy "anotaciones: insercion sin auth (temporal)"
  on public.anotaciones
  for insert
  to anon
  with check (true);

drop policy if exists "designaciones: acceso completo sin auth (temporal)" on public.designaciones;
create policy "designaciones: lectura sin auth (temporal)"
  on public.designaciones
  for select
  to anon
  using (true);
create policy "designaciones: insercion sin auth (temporal)"
  on public.designaciones
  for insert
  to anon
  with check (true);

drop policy if exists "declaraciones_disponibilidad: acceso completo sin auth (temporal)" on public.declaraciones_disponibilidad;
create policy "declaraciones_disponibilidad: lectura sin auth (temporal)"
  on public.declaraciones_disponibilidad
  for select
  to anon
  using (true);
create policy "declaraciones_disponibilidad: insercion sin auth (temporal)"
  on public.declaraciones_disponibilidad
  for insert
  to anon
  with check (true);
