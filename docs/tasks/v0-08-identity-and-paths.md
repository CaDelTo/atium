# Identidad de tests y rutas

- ID: v0-08-identity-and-paths
- Fase: V0
- Paquete: packages/core
- Depende de: v0-06

## Contexto

- Diseño: docs/design/02-data-model.md §9.3
- Estándares: 06-security.md (Rutas de archivos), 07-public-api.md (Multiplataforma)

## Hacer

- `computeTestId({ project, file, titlePath })` según §9.3 con `node:crypto`.
- `toPosixRelative(root, absolutePath)`.
- `resolveInside(root, relative)` (06-security.md).
- Constante del separador de `titlePath` (` › `).

## Criterios de aceptación

- Property-based: el `testId` es estable para la misma entrada y siempre tiene 16 caracteres hex.
- Rutas de Windows (`C:\repo\tests\a.spec.ts`) se normalizan a `tests/a.spec.ts`.
- `resolveInside` rechaza `../`, rutas absolutas externas y prefijos engañosos (`/repo-evil` con raíz `/repo`).
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Detección de renombres con Git (V2).
