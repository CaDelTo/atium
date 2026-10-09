# Bootstrap del monorepo

- ID: v0-01-monorepo-bootstrap
- Fase: V0
- Paquete: raíz del repositorio
- Depende de: ninguna

## Contexto

- Diseño: docs/design/16-repository-structure.md §24, docs/design/17-tech-stack.md §25
- ADRs: 0001, 0002, 0016
- Estándares: docs/engineering/01-typescript.md (tsconfig), 08-git-workflow.md

## Hacer

- `package.json` raíz privado con `packageManager` (pnpm) y `engines.node` `>=22`.
- `pnpm-workspace.yaml` con `packages/*`, `packages/*/*` y `examples/*`.
- `turbo.json` con las tareas `build`, `typecheck` y `test`, con caché de `dist/` y `coverage/`.
- `tsconfig.base.json` exactamente como en 01-typescript.md.
- `.nvmrc` (22), `.editorconfig`, `.gitignore` (node_modules, dist, coverage, reports, .turbo, .atium, .claude/settings.local.json).
- Changesets inicializado (`.changeset/config.json`). No se publica nada mientras el nombre sea provisional (ADR-0016).
- `onlyBuiltDependencies` de pnpm configurado como lista vacía (06-security.md).
- `README.md` raíz mínimo: qué es, estado (pre-alpha, V0), enlaces a docs/.

## Criterios de aceptación

- `pnpm install` funciona en un clon limpio.
- `pnpm turbo run build` termina sin error aunque todavía no haya paquetes.
- No hay archivo `LICENSE` (decisión abierta).
- `pnpm verify` todavía no existe (se crea en v0-03); deben pasar los comandos que ya existen
- `/review` sin hallazgos bloqueantes (los agentes omiten las herramientas que aún no están instaladas)

## Fuera de alcance

- Paquetes (v0-02), herramientas de calidad (v0-03), CI (v0-04).
