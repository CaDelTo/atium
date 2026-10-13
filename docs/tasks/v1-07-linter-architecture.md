# Decisiones de arquitectura del linter

- ID: v1-07-linter-architecture
- Fase: V1
- Paquete: docs (ADR, docs/design, docs/engineering)
- Depende de: ninguna
- Origen: `/plan-phase v1`

## Contexto

- Diseño: docs/design/03-linter.md §11, docs/design/13-score-baseline-reports.md §21.3, docs/design/14-architecture.md §22.2–§22.4, docs/design/18-cli-config.md §26
- ADRs: 0004 (Finding unificado), 0005 (linter como plugin de ESLint), 0019 y 0020 (idioma)
- Estándares: docs/engineering/02-code-design.md (capas), docs/engineering/07-public-api.md, docs/engineering/09-documentation.md

Varias tareas de V1 necesitan decisiones que el diseño no toma. Esta tarea las toma juntas, en un ADR, antes de escribir código. No escribe código.

## Hacer

- Escribir un ADR (con `/adr`) que fije:
  - **Capas:**
    - `eslint-plugin` solo puede depender de `core/model`, pero `@atium/core` no tiene ese subpath, y E2E012 necesita los patrones de `core/redact`.
    - `suite-index` y `analyzers/lint-crossfile` necesitan la misma lógica E2E que el plugin: detectar tests, acciones, assertions y selectores.
    - Propuesta:
      - `eslint-plugin` depende de las partes puras de `core`;
      - la lógica compartida se exporta en `@atium/eslint-plugin/syntax`;
      - `suite-index` y los analizadores pueden depender de ese subpath.
    - Actualizar la tabla de capas de 02-code-design.md y `.dependency-cruiser.cjs` en la tarea que cree cada paquete.
  - **Nombres de las reglas en ESLint**: por código (`atium/e2e001`) o descriptivo (`atium/no-hard-wait`), y dónde aparece el otro. 02-code-design.md pide constantes como `RULE_HARD_WAIT = "E2E001"`.
  - **Catálogo de reglas**: para cada regla de §11.3 y §11.4, `severity`, `category` y `confidence` del Finding, y si entra en `recommended`. Cómo se relaciona la severidad de ESLint (`warn`/`error`) con la del Finding. Añadir la tabla a 03-linter.md.
  - **Páginas de documentación y `docsUrl`**: `atium.dev` no existe y el generador del sitio (Starlight o VitePress) no está decidido. Dónde viven las páginas Markdown de cada regla y qué URL usa `meta.docs.url` hasta que exista el sitio.
  - **`atium lint`**:
    - si usa el `eslint.config.js` del usuario, un preset interno o ambos;
    - qué archivos analiza y de qué clave de config lo saca;
    - dónde se configuran los umbrales cross-file (propuesta: `analyzers["lint-crossfile"]`);
    - su código de salida cuando hay hallazgos (el 1 está reservado para `gate`, §26.2).
  - **Contexto de los analizadores estáticos**:
    - `AnalysisContext.storage` es obligatorio y `lint` no necesita historial;
    - el contexto no tiene forma de recibir el índice de la suite.

    Decidir si `storage` pasa a ser opcional según `requires`, y cómo un analizador obtiene el índice.
- Reflejar cada decisión en el archivo de diseño o de ingeniería que corresponda.

## Decisiones abiertas en esta tarea

Todas las anteriores. Presentarlas al usuario con una recomendación cada una, antes de escribir el ADR.

## Criterios de aceptación

- ADR nuevo aceptado por el usuario, con las seis decisiones de "Hacer"
- 03-linter.md tiene la tabla del catálogo de reglas (código, nombre en ESLint, severidad, categoría, confianza, preset)
- 02-code-design.md refleja las capas decididas
- 14-architecture.md §22.2 refleja la decisión sobre el contexto de los analizadores
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Código de cualquier paquete.
- El esquema del reporte JSON (v1-24) y el de `baseline.json` (v1-28).
