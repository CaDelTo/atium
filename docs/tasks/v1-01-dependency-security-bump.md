# Actualizar dependencias con avisos de seguridad

- ID: v1-01-dependency-security-bump
- Fase: V1
- Paquete: raíz del monorepo (`package.json`, `pnpm-lock.yaml`)
- Depende de: ninguna
- Origen: `/audit` de cierre de V0 (#20) y handoff de #19

## Contexto

- Estándares: docs/engineering/06-security.md, docs/engineering/10-tooling.md
- Diseño: docs/design/17-tech-stack.md
- El job `audit` de `.github/workflows/verify.yml` (`pnpm audit --audit-level high`) falla en `main` desde #36.

## Hacer

- `shell-quote` (crítico), vía `@changesets/cli` y `launch-editor`: subir a 1.11.0 o posterior.
- `source-map-js` (alto), vía vite y postcss: subir a 1.2.2 o posterior. No cumple el `minimumReleaseAge` hasta el 2026-10-14T14:08Z.
- `esbuild` (bajo), 0.27.7 vía vite: 0.28.1 o posterior.
- `esbuild` (moderado), 0.18.20 vía `drizzle-kit` y `@esbuild-kit/core-utils`: evaluar si un override rompe `drizzle-kit` (`pnpm --filter @atium/storage-sqlite db:generate`). Si lo rompe, documentar por qué se acepta el aviso.
- Preferir subir el paquete directo; usar `overrides` solo si no hay versión directa que lo resuelva, con un comentario del motivo.

## Criterios de aceptación

- El job `audit` de CI pasa.
- `db:generate` sigue generando la misma migración.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Actualizar dependencias sin avisos de seguridad.
