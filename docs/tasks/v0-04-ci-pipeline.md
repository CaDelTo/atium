# Pipeline de CI y plantillas del repositorio

- ID: v0-04-ci-pipeline
- Fase: V0
- Paquete: .github/
- Depende de: v0-03

## Contexto

- Diseño: docs/design/21-testing-strategy.md §29 (matriz)
- Estándares: 06-security.md (GitHub Actions), 08-git-workflow.md (PRs)

## Hacer

- Workflow `verify.yml`: `pnpm verify` en Node 22 y 24 × Linux, macOS y Windows, con caché de pnpm.
- Actions de terceros fijadas por SHA con comentario de la versión. Obtén los SHA de las releases oficiales; nunca los inventes. Si no puedes consultarlos, detente y pregunta.
- `permissions: contents: read` y `concurrency` para cancelar ejecuciones obsoletas del mismo PR.
- `pnpm audit` en CI.
- `renovate.json` (10-tooling.md).
- Plantilla de PR `.github/pull_request_template.md` (08-git-workflow.md).

## Criterios de aceptación

- El workflow pasa en los 6 entornos de la matriz.
- Ninguna Action de terceros está referenciada por tag.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Publicación, release y la GitHub Action del producto (V4).
