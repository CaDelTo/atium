# ADR-0023: Arquitectura del linter: capas, nombres, catálogo, documentación, `atium lint` y contexto de los analizadores

- Estado: Aceptada
- Fecha: 2026-10-13
- Diseño relacionado: 03-linter.md §11, 14-architecture.md §22.2, 15-storage.md §23.2.2, 16-repository-structure.md §24, 18-cli-config.md §26; 02-code-design.md, 07-public-api.md y 09-documentation.md (estándares). Precisa ADR-0005 y aplica ADR-0006, ADR-0019 y ADR-0020.

## Contexto

Las tareas del linter de V1 (v1-08 a v1-42) necesitaban decisiones que el diseño no tomaba:

- **Capas.** `02-code-design.md` dejaba a `eslint-plugin` depender solo de `core/model`, pero `@atium/core` no exporta ese subpath. Además, E2E012 necesita los patrones de `core/redact`. `suite-index` y `analyzers/lint-crossfile` necesitan la misma lógica E2E que el plugin (tests, acciones, assertions, selectores), y la tabla de capas no les deja depender de él.
- **Nombres de las reglas en ESLint.** Las reglas tienen código (`E2E001`), pero ESLint necesita un nombre (`atium/<nombre>`) y nada decía cuál.
- **Catálogo.** §11.3 y §11.4 no daban la severidad, la categoría ni la confianza del Finding de cada regla, ni cuáles entran en `recommended`.
- **Documentación.** §11.2 enlaza a `https://atium.dev/rules/e2e001`, pero ese dominio no es del proyecto, "Atium" es un codename provisional (ADR-0016) y el generador del sitio (Starlight o VitePress) no está decidido.
- **`atium lint`.** No estaba definido qué config de ESLint usa, qué archivos analiza, dónde van los umbrales cross-file ni con qué código sale cuando hay hallazgos; el 1 está reservado para `gate` (§26.2).
- **Contexto de los analizadores.** `AnalysisContext.storage` era obligatorio y `lint` no necesita historial, y el contexto no tenía forma de recibir el índice de la suite.

El usuario aprobó todas las recomendaciones en el plan de v1-07 (#47).

## Decisión

### 1. Capas

- `@atium/core` añade una entrada `@atium/core/pure` que reexporta solo módulos sin I/O: `model/`, `findings/`, `redact/`, `identity`, `paths`, `errors` (`AtiumError`), `result`, `assert-never` y `zod-issues` (`describeIssues`, para los mensajes de error de `settings.atium`). Es interna, como `@atium/core/testing`: solo la usan paquetes de Atium.
- `eslint-plugin` solo importa `@atium/core/pure`, nunca la raíz de `@atium/core`, que arrastra `config/`, `ci/` y `storage/`. dependency-cruiser comprueba que el grafo de `@atium/core/pure` no llega a ningún módulo con I/O.
- La lógica E2E compartida (framework, estructura de tests, `titlePath`, acciones, assertions, locators, selectores) se exporta en `@atium/eslint-plugin/syntax`, también interna. Son funciones puras sobre el AST ESTree de typescript-eslint.
- `suite-index` y `analyzers/*` pueden importar `@atium/eslint-plugin/syntax`, y nada más del plugin. Dentro del plugin, `src/syntax/` no importa las reglas ni ESLint en runtime.
- La entrada `@atium/core/pure` y `syntax` se crean en v1-08 y v1-09, y las reglas de `.dependency-cruiser.cjs` se añaden en la tarea que crea cada paquete.

### 2. Nombres de las reglas en ESLint

- Cada regla por archivo tiene en ESLint un nombre descriptivo en kebab-case, como en `eslint-plugin-playwright`: `atium/no-hard-wait`.
- El código (`E2E001`) es el identificador estable: va en el Finding (`ruleId`), en SARIF, en el baseline, en el fingerprint (§11.5), en la URL de la documentación y en la constante `RULE_HARD_WAIT = "E2E001"` de 02-code-design.md.
- Las reglas cross-file no tienen nombre en ESLint: solo código.
- Los nombres de la tabla de 03-linter.md §11.8 son API pública (07-public-api.md). Renombrar una regla conserva el nombre anterior como alias deprecado.

### 3. Catálogo de reglas

- La tabla de 03-linter.md §11.8 fija, por regla, `severity`, `category`, `confidence` y `source` del Finding, y si entra en `recommended` (las reglas por archivo) o está activa por defecto (las cross-file).
- La severidad del Finding la fija el catálogo, no el nivel que el usuario dé a la regla en ESLint. En los presets, las reglas `error` se activan como `"error"` en ESLint y las `warning` e `info`, como `"warn"`. Desactivar una regla en ESLint (`"off"`) sí elimina sus Findings.
- Las reglas cross-file E2E011 (código sin usar) y E2E013 (tests casi duplicados) vienen desactivadas por defecto: tienen severidad `info`, su confianza es `medium` y son las de más falsos positivos (usos dinámicos, similitud heurística). Se activan en `analyzers["lint-crossfile"].rules` (sección 5).
- E2E012 usa la categoría `maintainability`: `Finding.category` no tiene `security`, y añadirla cambiaría el esquema.

### 4. Páginas de documentación y `docsUrl`

- Cada regla, por archivo o cross-file, tiene una página en inglés (ADR-0020) en `docs/rules/<código en minúsculas>.md`, por ejemplo `docs/rules/e2e001.md`, con las 5 secciones de 09-documentation.md. `docs/` es la raíz del futuro sitio (§24).
- `meta.docs.url` en ESLint y `Finding.docsUrl` los construye un único helper, `ruleDocsUrl(code)`, en `core/findings`. Mientras no haya sitio, apunta al archivo en GitHub: `https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e001.md`.
- Cuando exista el sitio, cambiar la URL es cambiar ese helper.

### 5. `atium lint`

- **Config de ESLint:**
  - Si ESLint encuentra un `eslint.config.*` desde el directorio de trabajo, usa ese. Así el editor y la CI dan los mismos hallazgos, y se respetan `settings.atium` (§11.1), los `files` y los comentarios `eslint-disable`.
  - Si no hay ninguno, usa un preset interno, `recommended`, y lo avisa por stderr.
  - Si la config del usuario no activa ninguna regla de Atium, lo avisa por stderr.
- **Archivos:**
  - Sección nueva y estricta `lint` en `atium.config`: `include` (por defecto `["."]`) y `exclude` (por defecto `[]`).
  - Los argumentos posicionales `atium lint [paths...]` reemplazan a `include`.
  - Se aplican además los `ignores` de ESLint. Las reglas solo se aplican a los archivos donde la config las activa.
  - El índice de la suite usa los mismos archivos.
  - Los ajustes de cada archivo, para el índice, son los `settings.atium` que ESLint resuelve para ese archivo, o los defaults con el preset interno.
- **Mensajes de ESLint:**
  - Los mensajes de reglas `atium/*` se convierten en Findings con el código de la regla.
  - Los mensajes de reglas externas que la tabla de equivalencias de los presets declara equivalentes a una regla propia se convierten en Findings con el código de esa regla. Si no se convirtieran, `recommended` perdería los casos que delega en el plugin externo.
  - Los mensajes de las demás reglas se ignoran.
  - Un error de parseo se avisa por stderr con el archivo y no es un Finding.
- **Tabla de equivalencias de los presets:** vive en `docs/rules/presets.md`, en inglés, y la crea v1-20. En el código, la misma tabla es la que usan los presets y `atium lint`.
- **Umbrales y reglas cross-file:** en `analyzers["lint-crossfile"]`, validados por el `configSchema` del analizador. `rules` decide cuáles se ejecutan: un objeto de código a `"on"` u `"off"` (por ejemplo, `{ E2E011: "on" }`); los códigos que no aparecen toman el valor por defecto del catálogo.
- **Código de salida:**
  - 1 si hay algún Finding nuevo (fuera del baseline) con severidad `error`.
  - 0 si solo hay `warning` e `info`.
  - Es el significado que §26.2 ya da al 1 ("Findings nuevos sobre el umbral"), con la severidad `error` como umbral.
  - Los errores de uso (2) y los internos (0 o 3) siguen §26.2.

### 6. Contexto de los analizadores estáticos

- `AnalysisContext.storage` pasa a ser opcional (`storage?: StorageReader`). El orquestador lo pasa solo cuando la capacidad `history` está disponible, y omite con motivo los analizadores que la piden en `requires` si no lo está.
- El índice de la suite no viaja en el `AnalysisContext`.
  - El CLI construye el índice (I/O en el borde) y crea el analizador con él: `createLintCrossfileAnalyzer({ index })`.
  - Si el índice no se puede construir, el CLI no registra el analizador y lo reporta como omitido con el motivo.

## Consecuencias

- El plugin no carga jiti, simple-git, env-ci ni `node:fs` al arrancar el editor.
- `@atium/core/pure` y `@atium/eslint-plugin/syntax` son dos entradas más que publicar y verificar con `publint` y `attw`, aunque no sean API pública.
- `suite-index` depende de un paquete que tiene ESLint como peer. Solo importa `syntax`, que no carga ESLint, pero el gestor de paquetes avisará del peer si falta.
- Hay dos identificadores por regla: el nombre de ESLint, para quien configura, y el código, para todo lo demás. El catálogo es la única correspondencia.
- La severidad de un Finding no depende de la config de ESLint del usuario: el score es comparable entre repos, pero pasar una regla de `"error"` a `"warn"` en ESLint no cambia su peso en el score.
- Los enlaces de documentación dan 404 mientras el repo sea privado, y cambiarán cuando se elija el nombre definitivo o el sitio.
- Sin `eslint.config.*`, `atium lint` funciona sin configuración, pero los `settings.atium` no se pueden ajustar: para eso hay que crear la config de ESLint.
- `atium lint` puede romper la CI antes de que exista `atium gate` (V4). Con `recommended`, E2E010 (`.only` olvidado) y E2E012 (secretos) son `error`, así que bastan para salir con 1.
- Un analizador de un plugin de terceros no puede pedir el índice de la suite. Se resolverá cuando haga falta.
- `atium.config` gana la sección `lint`. 03-linter.md, 14-architecture.md §22.2, 15-storage.md, 16-repository-structure.md, 18-cli-config.md, 02-code-design.md, 03-errors-logging.md, 07-public-api.md y 09-documentation.md se actualizaron en el mismo cambio que este ADR.

## Alternativas descartadas

- **`eslint-plugin` dependiendo de la raíz de `@atium/core`:** carga módulos con I/O y dependencias pesadas en el editor.
- **Varias entradas en core (`/model`, `/redact`, `/findings`):** más superficie que publicar para el mismo fin. `@atium/core/model` sola no cubre la redacción.
- **Un paquete `@atium/e2e-syntax`:** capas más limpias, pero un paquete publicado más y un cambio en §24 para código que solo tiene sentido junto a las reglas.
- **Nombres por código en ESLint (`atium/e2e001`):** opacos en el editor y en los comentarios `eslint-disable`.
- **Severidad del Finding derivada del nivel de ESLint:** no permite `info`, no sirve para las reglas cross-file y hace que el score dependa de la config de cada repo.
- **URL en `atium.dev`:** el dominio no es del proyecto y el nombre es provisional, así que el enlace podría llevar a un sitio ajeno.
- **Siempre el preset interno en `atium lint`:** el editor y la CI darían resultados distintos, y los `settings.atium` del diseño (§11.1) habría que duplicarlos en `atium.config`.
- **Siempre la config del usuario, sin preset interno:** `atium lint` no funcionaría sin configurar ESLint.
- **`atium lint` siempre con 0:** la CI no fallaría hasta V4. **Un código de salida nuevo:** más API pública para un significado que el 1 ya tiene.
- **El índice en el contexto como `unknown`:** obliga a un `as` en el analizador. **Definir el tipo del índice en `core`:** `core` pasaría a conocer la forma del índice, que es de `suite-index` (v1-29).
