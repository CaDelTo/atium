# Formato y comparación del baseline

- ID: v1-28-baseline-core
- Fase: V1
- Paquete: packages/core/src/findings
- Depende de: v1-22

## Contexto

- Diseño: docs/design/13-score-baseline-reports.md §21.3, docs/design/03-linter.md §11.5
- ADRs: 0004
- Estándares: docs/engineering/01-typescript.md, 04-testing.md, 07-public-api.md (esquemas versionados)

## Hacer

- Esquema Zod de `.atium/baseline.json`, con `schemaVersion`. El archivo se versiona en el repo del usuario, así que es un esquema persistido y público (07-public-api.md):
  - entradas ordenadas con `fingerprint`, `ruleId` y `file`, para que el diff en Git sea legible;
  - sin fechas ni números de línea, para que no cambie si no cambian los hallazgos.
- Funciones puras:
  - `compareWithBaseline(findings, baseline)` devuelve nuevos, en baseline y desaparecidos;
  - `updateBaseline(baseline, findings)` elimina los desaparecidos (§21.3).
- Serialización determinista con un salto de línea final. La lectura y la escritura del archivo las hace el CLI (v1-39).
- Documentar el formato en §21.3.

## Decisiones abiertas en esta tarea

- Si `atium baseline` solo congela Findings de lint o todos los que haya; en V1 solo hay de lint.
- Qué campos además del fingerprint guarda cada entrada.

## Criterios de aceptación

- Tests de `compareWithBaseline`:
  - Finding nuevo;
  - Finding en baseline que se movió de línea, que sigue en baseline;
  - Finding desaparecido.
- Property-based: `updateBaseline` es idempotente y su salida no depende del orden de entrada.
- Test de que un `schemaVersion` desconocido da un error con `hint`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Comando `atium baseline` (v1-39) y `gate` (V4).
