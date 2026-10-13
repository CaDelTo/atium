# Interfaz `Analyzer` y orquestador

- ID: v1-23-analyzer-pipeline
- Fase: V1
- Paquete: packages/core/src/pipeline
- Depende de: v1-07

## Contexto

- Diseño: docs/design/14-architecture.md §22.1 y §22.2, docs/design/01-requirements.md §7
- ADRs: 0006 (fail-open) y el de v1-07 (contexto de los analizadores estáticos)
- Estándares: docs/engineering/02-code-design.md, 03-errors-logging.md, 04-testing.md, 07-public-api.md

`analyzers/lint-crossfile` (v1-32) es el primer analizador. Los de V3 en adelante usan la misma interfaz.

## Hacer

- Tipos `Analyzer`, `AnalysisContext`, `Capability` y `ResolvedProject` (§22.2), con los cambios que decida v1-07.
- `runAnalyzers(analyzers, context)`:
  - omite con motivo los analizadores cuyas `requires` no están disponibles;
  - ejecuta en paralelo los independientes, con p-limit;
  - aplica un timeout por analizador con `AbortSignal`; si se excede, omite con aviso y `ANALYZER_TIMEOUT`;
  - valida la config de cada analizador con su `configSchema`;
  - envuelve cada analizador con fail-open: un analizador que lanza se omite con aviso y no afecta a los demás;
  - valida los Findings devueltos con `FindingSchema` y los ordena con `compareFindings`.
- Devuelve los Findings y la lista de omitidos con su motivo.
- Valores (timeout y concurrencia) en `defaults.ts`.
- Documentar en §22.2 lo que no estaba definido.

## Decisiones abiertas en esta tarea

- El timeout por analizador por defecto y la concurrencia máxima: el diseño no los define.
- Qué hacer con un Finding inválido de un analizador: descartar ese Finding con aviso, o descartar todos los del analizador.

## Criterios de aceptación

- Tests con analizadores falsos:
  - `requires` no disponible → omitido con motivo;
  - timeout con reloj inyectado → omitido con `ANALYZER_TIMEOUT` y aviso;
  - un analizador que lanza no afecta a los demás;
  - un Finding inválido se trata según lo decidido;
  - la salida queda ordenada.
- Test de que la salida es la misma sea cual sea el orden en que terminan los analizadores.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Carga de analizadores desde plugins (§22.4).
- Comando `atium analyze`.
