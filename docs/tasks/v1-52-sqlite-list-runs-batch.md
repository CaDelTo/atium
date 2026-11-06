# Lectura por lotes en listRuns y tope de limit

- ID: v1-52-sqlite-list-runs-batch
- Fase: V1
- Paquete: packages/storage/sqlite
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 7

## Contexto

Diseño: docs/design/15-storage.md, docs/design/01-requirements.md (presupuestos de rendimiento)
ADRs: ninguno
Estándares: docs/engineering/04-testing.md

- `#assemble` (`sqlite-storage.ts:202-206`) hace dos consultas por ejecución (`resultsOf` y `attemptsOf`), así que `listRuns` hace 1 + 2·N consultas.
- `limit` acepta hasta `Number.MAX_SAFE_INTEGER`: con `limit: 5000` y ejecuciones de 5.000 tests son 10.000 consultas y millones de filas validadas en memoria.
- Hoy solo lo llaman los tests; lo usarán los analizadores de historial.

## Hacer

- Leer resultados e intentos de una página de ejecuciones con una consulta por tabla (`WHERE run_id IN (…)`) y agruparlos en memoria.
- Poner un tope a `limit` en `ListRunsQuery`, con el valor en `defaults.ts` y en el diseño.
- Agregar un benchmark de `listRuns` en `bench/` y compararlo con el actual.

## Decisiones abiertas en esta tarea

- El tope de `limit`: el diseño no lo define.

## Criterios de aceptación

- `listRuns` hace un número de consultas que no crece con el número de ejecuciones de la página.
- Un `limit` por encima del tope se rechaza o se recorta, según lo que diga el diseño.
- Los tests del contrato de storage siguen pasando.
- El benchmark muestra la diferencia con la versión actual.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Una vista ligera de ejecuciones (resúmenes) para los analizadores.
- Retención o borrado de ejecuciones antiguas.
