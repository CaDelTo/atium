# Anotaciones de lint en PRs de GitHub

- ID: v1-41-pr-annotations
- Fase: V1
- Paquete: .github/workflows
- Depende de: v1-21, v1-38

## Contexto

- Diseño: docs/design/22-roadmap.md §30 (criterio de V1: "anotaciones visibles en un PR de GitHub"), docs/design/03-linter.md §11.6, docs/design/19-ci-cd.md §27, docs/design/21-testing-strategy.md §29 (dogfooding)
- ADRs: 0006
- Estándares: docs/engineering/06-security.md (workflows), 08-git-workflow.md

## Hacer

- Workflow, o job en el CI existente, que en cada PR:
  - ejecuta `atium lint --format sarif` sobre `examples/playwright-demo`;
  - publica las anotaciones, con el mecanismo que se decida.
- Permisos mínimos (`security-events: write` solo si se usa code scanning) y acciones fijadas por SHA.
- Si se usa code scanning, una `category` propia para no mezclar los resultados con otros análisis.
- Documentar en §27 cómo se ve el resultado y cómo reproducirlo en el repo de un usuario.

## Decisiones abiertas en esta tarea

- **El repo `CaDelTo/atium` es privado.** Subir SARIF a code scanning en un repo privado requiere GitHub Advanced Security. Las opciones son:
  - hacer el repo público, lo que depende de la licencia, todavía abierta;
  - activar GitHub Advanced Security;
  - emitir anotaciones con comandos de workflow (`::warning file=...`), lo que añade un formato de salida que el diseño no define.

  La decisión es del usuario; esta tarea no la toma.

## Criterios de aceptación

- En un PR de prueba que introduce un problema en el demo, las anotaciones aparecen en la pestaña "Files changed", en las líneas sembradas (captura o enlace en el PR de la tarea).
- El job no falla el PR por los hallazgos sembrados del demo.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- GitHub Action publicable (`atium/action`, V4) y comentario en PR (V4).
