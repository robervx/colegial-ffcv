# Quickstart: validar Persistencia real (Sprint 1 + Sprint 2 fusionados)

## Prerrequisitos

- `webapp/.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` del proyecto `colegial-ffcv` (ya configurado).
- Migraciones de `supabase/migrations/` aplicadas al proyecto (vía la integración GitHub↔Supabase que Roberto está conectando, o `supabase db push` si se usa la CLI directamente).
- `cd webapp && npm install` (añade `@supabase/supabase-js`).
- Comprobar que no hay ya un `next dev` corriendo de otra sesión (`ps aux | grep next`).

## Arrancar

```bash
cd webapp && npm run dev
```

## Escenarios a validar (uno por User Story de spec.md)

### US1 — Nota de seguimiento persistida

1. Abrir la ficha de un árbitro, añadir una nota de seguimiento.
2. Refrescar la página → la nota sigue ahí.
3. Abrir la misma ficha desde otro navegador/dispositivo → la nota es visible igual, con la misma fecha y autor.
4. En el dashboard de Supabase (Table Editor → `anotaciones`), confirmar que la fila existe con los campos esperados.

### US2 — Confirmar / cambiar candidato de designación

1. Abrir "Designación", expandir un partido con alternativas.
2. Pulsar "Confirmar" sobre el candidato sugerido → refrescar → sigue mostrando ese candidato como decidido, no vuelve a "pendiente de revisión".
3. En otro partido, elegir una alternativa distinta a la sugerida sin escribir motivo → comprobar que el sistema no deja guardar.
4. Repetir escribiendo un motivo → guardar → refrescar (incluso desde otro dispositivo) → la designación muestra el candidato elegido y el motivo.
5. Comprobar en Supabase (`designaciones`) que cada decisión es una fila nueva (append-only), no una actualización de la anterior.

### US3 — Disponibilidad de árbitro completa (desbloqueo de 002)

Repetir los escenarios ya documentados en `specs/002-disponibilidad-arbitro/quickstart.md`, ahora contra el repositorio real (ya no stub):

1. Declarar indisponibilidad para un árbitro en el ciclo activo → comprobar que el panel "Cobertura por categoría" del Dashboard (001) refleja esa declaración real.
2. Con el selector "ver como: comité", comprobar que se ve el resumen de patrón de implicación en una ficha con bajas no justificadas; con "ver como: árbitro", comprobar que no aparece en ningún punto.

### Transversal: errores y trazabilidad (FR-006, FR-007, FR-008)

1. Con las credenciales de Supabase temporalmente inválidas (o sin red), intentar guardar una nota o una designación → comprobar que aparece un mensaje de error claro, nunca una confirmación falsa.
2. Comprobar en cualquier fila de `anotaciones`, `designaciones` o `declaraciones_disponibilidad` que tiene autor (`autor_rol`/`decidido_por_rol`) y fecha.
3. Comprobar que el seed de notas/histórico sintético cargado inicialmente sigue distinguible como sintético (mismo criterio visual que ya usa el resto de la app).

## Verificación de lógica de cálculo

```bash
cd webapp && npx vitest run
```

Debe incluir, además de los tests ya existentes de 001/002: `lib/designacionesRepo.test.js` (sobre todo `conDecisionVigente`, función pura) y los tests actualizados de `lib/disponibilidadRepo.js` (ya no verifican `NoImplementadoError`, verifican el comportamiento real).
