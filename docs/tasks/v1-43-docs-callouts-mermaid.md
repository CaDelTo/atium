# Callouts y diagramas Mermaid en la documentación

- ID: v1-43-docs-callouts-mermaid
- Fase: V1
- Paquete: docs
- Depende de: ninguna
- Origen: petición del usuario para leer `docs/` en GitHub y en Obsidian

## Contexto

Diseño: docs/design/00-overview.md, 03-linter.md, 07-flaky.md §15.7, 14-architecture.md, 19-ci-cd.md
ADRs: 0014 (estándares), 0020 (idioma)
Estándares: docs/engineering/09-documentation.md

## Hacer

- Añadir a `docs/engineering/09-documentation.md` una sección "Formato de Markdown":
  - Solo sintaxis que renderizan GitHub y Obsidian. Prohibido: `[[wikilinks]]`, `==resaltado==`, campos `::` de Dataview y callouts con título o plegables.
  - Avisos como callouts de GitHub (`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`), con el marcador solo en su línea y fuera de listas.
  - Diagramas de flujo, estados y dependencias en Mermaid (`flowchart` o `stateDiagram-v2`, sin `%%{init}%%`, sin formas `@{…}` ni tipos beta).
  - Maquetas de salida del producto, ilustraciones y árboles de directorios en bloques de texto.
- Convertir a callout los avisos de `docs/design/README.md:3-5` (`NOTE`) y `docs/engineering/12-ai-workflow.md:5` (`IMPORTANT`). Las migas de navegación de `docs/design/*.md` no cambian.
- Convertir a Mermaid los diagramas ASCII:
  - `docs/design/00-overview.md:17-45`
  - `docs/design/14-architecture.md:9-30`
  - `docs/design/19-ci-cd.md:9-13`
  - `docs/design/07-flaky.md:93-103` (`stateDiagram-v2`; "falla" va de `recovering` a `quarantined`, como dice su etiqueta)
  - `docs/design/03-linter.md:9-12`
  - `docs/engineering/12-ai-workflow.md:66-82` y `147-159`
  - `docs/tasks/README.md:86-97` y `155-179`
- Añadir a `.claude/commands/plan-phase.md` que el "Orden sugerido" de una fase nueva va en Mermaid.
- Un commit por archivo convertido.

## Criterios de aceptación

- Cada diagrama convertido conserva los mismos nodos, aristas y etiquetas que el ASCII, o la diferencia la aprobó una persona.
- Cada diagrama y callout se renderiza en la vista previa de GitHub del PR y en Obsidian; la descripción del PR lo confirma por archivo.
- `docs/` no contiene sintaxis exclusiva de Obsidian (`grep` de `[[`, `==`, `::`).
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Frontmatter de los ADRs (v1-44).
- Maquetas de salida del CLI, la ilustración de `docs/design/24-adoption.md:48-64` y los árboles de directorios.
- Cambiar el contenido o el comportamiento descrito en el diseño.
- Checks automáticos de Mermaid en CI (dependencia nueva).
