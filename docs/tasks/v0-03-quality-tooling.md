# Herramientas de calidad y `pnpm verify`

- ID: v0-03-quality-tooling
- Fase: V0
- Paquete: raíz del repositorio
- Depende de: v0-02

## Contexto

- Estándares: docs/engineering/10-tooling.md (configuraciones completas), 11-code-review.md
- ADRs: 0014, 0015
- Agentes: .claude/hooks/format.mjs depende de que Prettier esté instalado

## Hacer

- ESLint (flat config) con typescript-eslint y sonarjs, exactamente como en 10-tooling.md.
- Prettier + `.prettierignore` (dist, coverage, fixtures, reports, pnpm-lock.yaml).
- dependency-cruiser (`.dependency-cruiser.cjs`) con las reglas de capas.
- knip configurado para el workspace.
- jscpd (`.jscpd.json`).
- commitlint con los scopes de 10-tooling.md.
- lefthook (`lefthook.yml`) con pre-commit, commit-msg y pre-push.
- Configuración de Vitest para el workspace.
- Scripts de la raíz: `format`, `format:check`, `lint`, `typecheck`, `test`, `test:coverage`, `deps:check`, `unused`, `dupes`, `pkg:check`, `bench`, `verify`.
- Script `bench` en `packages/core` con un benchmark de ejemplo en `bench/`, para que `perf-benchmarker` funcione desde el inicio.
- `publint` y `attw` como `pkg:check` en `packages/core`.

## Criterios de aceptación

- `pnpm verify` pasa.
- Verificado con cambios temporales (que no se commitean): un `any` falla lint; un `enum` falla lint; un import de `packages/core` a otro paquete falla `deps:check`; un mensaje de commit inválido es rechazado.
- El hook de formato de Claude Code formatea un archivo editado.
- El hook `test-guard` bloquea una edición de prueba que borra una assertion de un test (verificar y descartar el cambio).
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- CI (v0-04).
