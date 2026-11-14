# Archivo de progreso

Entradas antiguas de [progress.md](progress.md), de la más reciente a la más antigua.

## Entradas

### 2026-11-10 — #50 v1-10-selector-parsing

- **Hecho:**
  - **#46 (misma sesión):** PR #138 mergeado por la persona; la #46 está cerrada.
  - **Rama y PR de #50:**
    - Rama `feat/50-selector-parsing`, creada desde `origin/main` (`5b3fb27`).
    - PR #139 en borrador, con `Closes #50` y sin mergear.
    - Plan aprobado por la persona, comentado en el issue bajo "## Plan aprobado", con la etiqueta `plan:approved`.
  - **Commits:**
    - `6e6cbdb` `test(eslint-plugin): specify selector parsing`: 119 tests AC en rojo contra stubs. Incluye `parsel-js` 1.2.3 y los patrones y niveles en `packages/eslint-plugin/src/defaults.ts`.
    - `f3bc0ab` `feat(eslint-plugin): analyze and classify selectors`:
      - `src/syntax/selectors.ts` con `analyzeSelector`, `classifyLocator`, `selectorText` y `normalizeSelector`;
      - `css-selector.ts`, que usa solo `tokenize` de parsel;
      - `xpath-selector.ts`, un escáner lineal.
    - `05f2a7e` `docs(docs)`: viñeta "Selectores" en `docs/design/03-linter.md` §11.3.1 y casos que faltaban en `06-selector-advisor.md` §14.1.
    - `aaf89b6` `test(eslint-plugin): cover selector edge cases` (`selectors.edge.test.ts`, de `test-writer`).
    - `6fd2c3a` `refactor`: `CssAnalysis extends CssSegment`, por un clon que detectó jscpd.
    - `5943701` `fix(eslint-plugin): cap selector length and address review findings`: tope `SELECTOR_MAX_LENGTH` y correcciones de `/review`. Añade `src/syntax/whitespace.ts` y exporta `isGetByMethod` en `locators.ts`.
    - `3f0d95d` `fix(eslint-plugin): keep xpath= normalization idempotent`.
  - **Puertas:**
    - `plan-reviewer`: REQUIERE PERSONA, resuelto con D1-D5.
    - Rojo verificado con 119 tests.
    - `/verify`: PASS sobre `3f0d95d`, con 446 tests en eslint-plugin. `pkg:check`: exit 0.
    - `/review`: sin bloqueantes; tercera pasada de `code-reviewer` APROBADO.
    - `delivery-auditor`: APROBADO.
    - Push con `push-branch.mjs` y resumen de entrega comentado en #50.
- **En curso:** PR #139 en borrador. Al crearlo, la CI todavía no había reportado ningún check. Falta `gh pr ready 139` cuando los 7 checks estén en verde.
- **Decisiones** (de la persona, 2026-11-10):
  - **D1-D5, en el comentario "Plan aprobado" de #50 y en el diseño:**
    - Ids numéricos: 3 o más dígitos seguidos.
    - Clases generadas: `css-` seguido de un hash con al menos un dígito, `sc-*`, y `jsx-` seguido de dígitos.
    - La normalización reserializa sin reordenar.
    - Huecos de la tabla de §14.1:
      - `getByRole` sin `name`, `getByAltText` y `getByTitle` son nivel 4.
      - Cinco atributos de test id.
      - Gana el peor nivel.
    - Con `i18n`, el texto visible baja al nivel 2.
    - Un solo PR.
  - **Durante `/review`, en el diseño, en `defaults.ts`, en el commit `5943701`, en el PR y en el comentario de entrega de #50:**
    - Tope de 2048 caracteres tras colapsar espacios.
    - La clasificación no cuenta los combinadores; el umbral lo fija v1-13.
    - Se corrige todo lo corregible.
    - El test de endurecimiento de 20 000 predicados anidados pasa a 500.
  - **Mías, en el diseño y en el PR:**
    - Se usa `tokenize` y no `parse`, que es cuadrático y se queda sin memoria con 1 MiB.
    - No se analizan los argumentos de pseudoclases como `:has(...)`.
    - `selectorText` no se unifica con `titleOf`, porque cambiaría cómo se detectan los títulos estáticos.
- **Problemas:**
  - El PR tiene unas 1600 líneas añadidas (unas 890 sin tests ni lockfile), el doble de lo estimado en el plan. La persona eligió un solo PR (D5); `delivery-auditor` recomienda confirmarlo.
  - `pkg:check` no corre en `pnpm verify` ni en la CI. El agente `verifier` tampoco tiene permiso para ejecutarlo; lo ejecuté a mano.
  - Pendientes heredados para v1-13 (E2E002):
    - fijar el umbral de combinadores, porque `03-linter.md` dice "≥ 3 combinadores" y también "Profundidad 3";
    - decidir si `:nth-last-child`, `:eq()` de jQuery y los atributos `[id=ember123]` cuentan como frágiles.
  - Pendiente para v1-29: normalizar los `getBy*` combinando método y texto, porque `normalizeSelector` solo cubre el texto.
  - `@atium/eslint-plugin` es `private` aunque ADR-0023 lo llama "paquete publicado". Es una inconsistencia anterior, sin issue.
  - El checkout principal está ahora en `feat/50-selector-parsing`. La rama local `docs/46-core-api-docs`, ya mergeada, se puede borrar.
- **Siguiente paso:** con la CI de #139 en verde, ejecutar `gh pr ready 139`; después, una persona revisa y mergea. La siguiente tarea de V1 por antigüedad es #51 (v1-11, regla E2E010 `.only`); hay que comprobar sus dependencias.

### 2026-11-10 — #46 v1-06-core-api-docs

- **Hecho:**
  - **Rama y PR:**
    - Rama `docs/46-core-api-docs`, creada desde `origin/main` (`ce8f01c`).
    - PR #138 en borrador, con `Closes #46` y sin mergear.
    - Plan aprobado por la persona, comentado en el issue bajo "## Plan aprobado", con la etiqueta `plan:approved`.
  - **`6f11883` `docs(core): document public schema members and entry points`:** TSDoc en cada miembro de los esquemas públicos, objetos anidados incluidos:
    - `findings/finding.ts`, `model/{run,test-result,attempt,error-occurrence,network,bdd}.ts` y `config/schema.ts` (`quarantine`).
    - `@packageDocumentation` en `src/index.ts` y `test-contracts/storage.contract.ts`.
  - **`37dbef8` `docs(core): list every export in the README`:**
    - La lista "Today it provides" de `packages/core/README.md` nombra exactamente las 129 exportaciones de `src/index.ts`.
    - La sección de testing nombra los tipos de los builders, `LogEntry` y `HEAVY_TEST_TIMEOUT_MS`.
  - **`5e00178` `build(core): build test-contracts as ESM only`:**
    - `test-contracts` se construye aparte con `packages/core/tsup.test-contracts.config.ts`, solo ESM y con `outDir: dist/test-contracts`.
    - `tsup.config.ts` exporta `sharedOptions` y ya no incluye esa entrada.
    - El script `build` corre las dos configs en serie: `tsup && tsup --config tsup.test-contracts.config.ts`. tsup ejecuta en paralelo las configs de un array y el `clean` de una borraría la salida de la otra.
  - **`d3d1732` `docs(core): document inline schema members and the ESM-only contracts`:** correcciones de `/review`.
    - I1 e I2: TSDoc de `llm.enabled` y de `TestCase.location.line/column`, objetos de una línea que el primer escaneo no detectó.
    - S1: redacción de `quarantine.auto` ajustada a 07-flaky.md §15.7.
    - S2: reajuste de líneas en el README.
    - S3: el README dice que `test-contracts` es solo ESM.
    - S4: comentario del orden del build.
  - **Puertas:**
    - `plan-reviewer`: APROBADO.
    - `test-writer`: sin tests nuevos; un guard de `dist/` o un test que lea el README serían frágiles.
    - `/verify`: PASS dos veces, la segunda sobre `d3d1732`. `pkg:check`: exit 0.
    - `/review`: sin bloqueantes; segunda pasada de `code-reviewer` APROBADO.
    - `delivery-auditor`: APROBADO.
    - Push con `push-branch.mjs` y resumen de entrega comentado en #46.
- **En curso:** PR #138 en borrador. Al crearlo, los 7 checks de CI estaban pendientes. Falta `gh pr ready 138` cuando estén en verde.
- **Decisiones:**
  - Sin TDD y sin tests nuevos, por ser documentación y configuración de build. Quedó en el plan aprobado (comentario de #46) y en el PR.
  - Dos builds de tsup en serie en lugar de un array de configs o de borrar los `.cjs` tras el build. Quedó en el plan, en el commit `5e00178` y en el comentario de `tsup.test-contracts.config.ts`.
  - `dist/test-contracts` deja de compartir chunks con `dist/index.js` y lleva su propia copia de los builders y tipos. Se aceptó por inofensivo; está en el PR.
  - Algunos miembros solo se documentan con lo que garantiza el código, porque el diseño no les da significado: `environment.os/arch/nodeVersion`, `framework.version`, `frameworkConfig.retries/workers`, `workerIndex`, `status` de los pasos BDD y `quarantine.auto`. Está en el PR, no en el diseño.
  - Los miembros de interfaces que no son esquemas Zod (`Logger`, `Storage`…) quedan fuera de AC-1, porque el criterio habla de "miembros de sus esquemas públicos". No quedó escrito salvo en este handoff.
- **Problemas:**
  - `pkg:check` no corre en `pnpm verify` ni en ningún workflow de CI. Una regresión del build de `test-contracts` (volver a emitir CJS) solo la detectaría la revisión.
  - `docs/engineering/10-tooling.md:54` muestra `pkg:check` sin el `--exclude-entrypoints ./test-contracts` que usa core. Fuera de alcance, sin issue.
  - El README de core no pasa `prettier --check`: tres bloques de código mal formateados que ya estaban en `main`. El hook de formato no revisa Markdown, así que no bloquea.
  - Avisos preexistentes: `max-lines` en `packages/core/src/storage/run-file.test.ts` (405 líneas) y 2 clones de `vitest.config.ts` en jscpd.
  - El milestone V0 sigue abierto con 0 issues abiertos; lo cierra una persona.
- **Siguiente paso:** con la CI de #138 en verde, ejecutar `gh pr ready 138`; después, una persona revisa y mergea. La siguiente tarea Pendiente de V1 por antigüedad es #50 (v1-10, análisis y clasificación de selectores); conviene comprobar sus dependencias. Las de auditoría más urgentes siguen siendo #116 (v1-46) y #118 (v1-48).

### 2026-11-06 — #45 v1-05-design-alignment

- **Hecho:**
  - **Rama y PR:**
    - Rama `docs/45-design-alignment`, creada desde `origin/main` (`c165711`).
    - PR #135 en borrador, con `Closes #45` y sin mergear.
    - Plan aprobado por la persona, comentado en el issue bajo "## Plan aprobado", con la etiqueta `plan:approved`.
  - **`a694d84` `docs(docs): align design with V0 implementation`:**
    - `17-tech-stack.md`, fila Compresión: los runs `.ndjson.gz` usan `node:zlib`; fflate queda previsto para los datos del reporte HTML.
    - `02-data-model.md`:
      - Tabla de CI: en GitLab, `CI_JOB_ID` es el `jobId`, no el intento.
      - §9.2: `message` 2 KiB y `stack` 8 KiB; tras la garantía final, la línea "nunca supera" 768 KiB.
      - §10.1: si hay variables de varios proveedores, gana el orden de la tabla.
      - §10.1: mapeo de env-ci `build` → `runId`, `job` → `jobId` y `pr` → `prNumber`.
      - §10.1: el payload de GitHub solo se lee con el proveedor `github`.
    - `15-storage.md` §23.2.1:
      - Endpoints: cuenta como fallo una clave de `statuses` ≥ 400 aunque su conteo sea 0, y los que tienen fallos se ordenan entre sí por `count`.
      - Una línea de exactamente 768 KiB no se recorta.
      - Los tres límites del lector (64 KiB de encabezado, 1 MiB por línea y 256 MiB en total) son inclusivos.
    - `20-security-privacy.md`: en `aws-key`, una letra mayúscula o un dígito tras `A3T`; la normalización de nombres conserva `\p{L}` y `\p{N}`.
    - `05-performance.md`: 2 KiB y 8 KiB.
    - `04-testing.md`: la tabla de cobertura es un mínimo.
    - `packages/cli/src/defaults.ts`: la cita pasa a `engineering/03-errors-logging.md`.
  - **`29fb3bf` `docs(docs): clarify compression, aws-key and coverage wording`:** corrige los hallazgos de `/review`.
    - I1 y I2: zlib no limita bytes, lo hace el lector de líneas; fflate es un uso previsto.
    - S1: el carácter extra de `aws-key` solo va tras `A3T`.
    - S2: "`jobId` solo en GitLab" vale para las reglas propias.
    - S3: 04-testing.md remite a `vitest.config.ts` en lugar de listar paquetes.
  - **Puertas:**
    - `plan-reviewer`: REQUIERE PERSONA, por las tres decisiones de abajo.
    - `/verify`: PASS.
    - `/review`: sin bloqueantes; segunda pasada de `code-reviewer` APROBADO.
    - `delivery-auditor`: APROBADO, con `pnpm verify` en exit 0 sobre `29fb3bf`.
    - Push con `push-branch.mjs` y resumen de entrega comentado en #45.
- **En curso:** PR #135 en borrador. Al crearlo, los 7 checks de CI estaban pendientes. Falta `gh pr ready 135` cuando estén en verde.
- **Decisiones** (de la persona, 2026-11-06; están en el comentario "Plan aprobado" de #45 y en el PR):
  - Documentar `node:zlib` en lugar de migrar a fflate.
  - La tabla de cobertura es un mínimo; no se tocan los `vitest.config.ts`, que exigen 90 %.
  - Documentar el comportamiento actual de los 8 puntos de la tarea, sin tareas de cambio de código.
  - ADR-0018 no se edita, aunque diga "2 KB"/"8 KB" y "queda por debajo": remite la unidad a §9.2 y su "supera 768 KiB" hace compatible el `<=`. Quedó escrito en el PR y en el comentario de entrega de #45.
- **Problemas:** imprecisiones que ya existían, fuera del alcance de #45. Las encontró `design-auditor` y no tienen issue:
  - La fila de Jenkins de `02-data-model.md` pone `GIT_BRANCH` / `CHANGE_BRANCH`, al revés que la precedencia del código.
  - "Paso 5" en `15-storage.md:46` es ambiguo junto a una lista de 4 pasos.
  - El encabezado del run no se mide contra los 64 KiB del lector (`run-file-writer.ts`).
  - Las claves de `statuses` se interpretan con `Number()` (`cap-run.ts`), así que `"4e2"` cuenta como 400.
  - Las fronteras de `aws-key` usan `[A-Za-z0-9]`, más amplio que base32.
  - Sigue el aviso de `max-lines` en `run-file.test.ts` (405 líneas).
- **Siguiente paso:** con la CI de #135 en verde, ejecutar `gh pr ready 135`; después, una persona revisa y mergea. Decidir si las imprecisiones de "Problemas" merecen una tarea.

### 2026-11-06 — #44 v1-04-run-context-robustness

- **Hecho:**
  - Rama `fix/44-run-context-robustness`, creada desde `origin/main` (`fdef091` más los merges de #133). PR #134 en borrador con `Closes #44`, sin mergear. Plan aprobado por la persona y comentado en el issue (etiqueta `plan:approved`).
  - `ad220a0` `test(core): specify run context robustness`: tests `AC-1:` en `packages/core/src/ci/detect-run-context.git.test.ts` (archivo nuevo, porque `detect-run-context.test.ts` pasaba de 400 líneas de `max-lines`) y `AC-2:` en `detect-run-context.test.ts`. Fake `RecordingGitClient` en `packages/core/src/ci/fakes.test-support.ts`: registra `start:`/`end:` de cada consulta con un `setImmediate` entre ambos. No se tocó `FakeGitClient` (`@atium/core/testing`). Rojo verificado: AC-1 por consultas solapadas, AC-2 por `MODEL_INVALID`.
  - `0c474be` `fix(core): query git in series and warn on an oversized head sha`:
    - `readGit` (`detect-run-context.ts`) consulta en serie: `headCommit`; `currentBranch` solo si la rama no se conoce; `isDirty` solo en run `local`. Ninguna consulta después de un fallo.
    - `github-event.ts`: `head.sha` usa `TextSchema.min(1)` (tope de 2 KiB, `MODEL_TEXT_CAPS_BYTES.default`). Uno más largo invalida el `pull_request`: aviso existente "unexpected pull request…" y run sin `prNumber` ni `headSha`.
    - `docs/design/02-data-model.md` §10.1: paso 3 (head commit demasiado largo = `pull_request` inválido), paso 5 (consultas a Git en serie) y caso límite de `MODEL_INVALID` (solo variables de entorno y Git, no el payload de GitHub).
  - `6b8e407` `test(core): cover git query order and head sha byte size edge cases` (`test-writer`): fallo en la segunda consulta, rama del entorno, sin Git si el entorno da el commit, `head.sha` que cabe en caracteres pero no en bytes escapados para JSON, y el aviso sin el valor.
  - `29e2951` `docs(core): clarify detectRunContext and pull request reader TSDoc`: correcciones de `/review` (`@returns` de `readGitHubPullRequest`, `@throws` de `detectRunContext`, TSDoc de `RecordingGitClient` y helper compartido `writeEvent(directory, payload)` en `fakes.test-support.ts`; el `writeEvent` local de `detect-run-context.test.ts` delega en él sin tocar las líneas de los tests AC).
  - Puertas: `plan-reviewer` APROBADO; `/verify` PASS dos veces (la segunda sobre `29e2951`); `/review` sin bloqueantes, segunda pasada de `code-reviewer` APROBADO; `delivery-auditor` APROBADO. Push con `push-branch.mjs`. Resumen de entrega comentado en #44.
  - Otros de la sesión, ya mergeados: #109 (`.obsidian/` en `.gitignore`), #114 (avisos de zod, vitest y fast-uri), #115 (handoff de #49), #112 (tareas v1-43 y v1-44) y #133 (tareas v1-46 a v1-62, issues #116 a #132, de la auditoría del repositorio del 2026-11-06).
- **En curso:** PR #134 en borrador: al crearlo, los 7 checks de CI (`verify` en 3 SO × Node 22/24 y `audit`) estaban pendientes. Falta pasarlo a listo (`gh pr ready 134`) cuando estén en verde.
- **Decisiones:**
  - `headSha` demasiado largo = aviso y run sin `prNumber` ni `headSha` (decidido por la persona el 2026-10-15, en la tarea; ahora también en 02-data-model.md §10.1).
  - Los tests de AC-1 van en `detect-run-context.git.test.ts` y el fake en `fakes.test-support.ts`, no en `@atium/core/testing`, para no cambiar API pública. No quedó en ningún documento salvo este handoff y el PR.
- **Problemas:**
  - No se reprodujo el bloqueo en Windows: los tests comprueban la causa (consultas solapadas), no el bloqueo.
  - Avisos preexistentes fuera de alcance: `max-lines` en `packages/core/src/storage/run-file.test.ts` (405 líneas) y 2 clones de `vitest.config.ts` en jscpd.
  - La rama local `docs/audit-tasks` (PR #133 ya mergeado) sigue en el checkout principal; se puede borrar.
- **Siguiente paso:** con la CI de #134 en verde, `gh pr ready 134` y que una persona lo revise y mergee. Después, la siguiente tarea Pendiente de V1 es #45 (v1-05 Alinear el diseño con lo implementado en V0); las de auditoría más urgentes son #116 (v1-46, carrera de migración SQLite) y #118 (v1-48, redacción de secretos).

### 2026-10-22 — #105 Avisos de seguridad en vite y launch-editor

- **Hecho:**
  - #105 no tiene archivo en `docs/tasks/`: la especificación es el cuerpo del issue. Se trabajó con `/task` en el worktree `atium-105`. `plan-reviewer` dio APROBADO, la persona aprobó el plan y este se comentó en el issue con la etiqueta `plan:approved`.
  - **Rama y PR:** rama `chore/105-vite-launch-editor-advisories`, con un solo commit `b92e404`, `chore(deps): resolve patched vite and launch-editor`. PR #108 con `Closes #105`, listo para revisión. Los 7 checks de CI pasan (`verify` ×6 y `audit`).
  - **Cambio:** solo `pnpm-lock.yaml`.
    - `vite` pasa de 8.3.1 a 8.3.4 y `launch-editor` de 2.14.1 a 2.14.2, por GHSA-587h-7wmj-h5pm (high).
    - Arrastra estas transitivas: `rolldown` 1.2.13, `@oxc-project/types` 0.153.0 y `postcss` 8.5.29.
    - El peer opcional `postcss` de tsup también pasa a 8.5.29, así que queda una sola versión de postcss.
    - Se hizo con `pnpm update -r vite launch-editor` y después `pnpm update -r postcss`.
  - **Verificación:**
    - `pnpm audit --audit-level high` sale con 0.
    - `TURBO_FORCE=true pnpm verify` pasa.
    - `pnpm install --frozen-lockfile` pasa.
    - `/review`: `code-reviewer` aprobó en 2 rondas y `docs-checker` dio OK.
    - `delivery-auditor`: APROBADO.
- **En curso:** nada. Falta que una persona revise y mergee el PR #108.
- **Decisiones:**
  - **Sin `overrides`:**
    - `vitest` y `@vitest/mocker` 5.0.2 aceptan vite `^8.0.0`, y `@changesets/cli` 3.0.3 acepta launch-editor `^2.14.1`.
    - 06-security.md (sección Dependencias) solo permite overrides cuando ningún padre elegible corrige el aviso.
    - Dónde quedó escrito: el commit `b92e404` y el PR #108.
  - **postcss unificado en 8.5.29:**
    - Lo encontró `duplication-auditor` y la persona dejó corregirlo a criterio de la sesión.
    - `pnpm dedupe` no lo resolvía porque postcss es un peer opcional de tsup.
    - La 8.5.30 (2026-10-12) todavía no cumple los 14 días.
    - Dónde quedó escrito: el commit `b92e404` y el PR #108.
  - **Sugerencias de `/review` descartadas:**
    - Dudaba de que el padre de launch-editor fuera `@changesets/cli`; `pnpm why` lo confirma.
    - Proponía cambiar el trailer de atribución; la atribución de la sesión es Claude Opus 5.5.
    - Dónde quedó escrito: solo en esta entrada.
- **Problemas:**
  - Siguen 2 avisos moderate en `vitest` <5.0.3, que es dependencia directa y se pinea a 5.0.2 en la raíz, core, eslint-plugin, cli, storage-sqlite y playwright-demo.
    - No bloquean el job `audit`, que solo bloquea en high.
    - No hay issue para ellos.
    - vitest 5.0.3 (2026-09-30) ya cumple los 14 días. Subirlo junto con `@vitest/coverage-v8` es una tarea aparte.
  - En pnpm 12, `--depth` no acepta `Infinity` y su valor por defecto ya es ilimitado: basta `pnpm update -r <paquete>`.
  - Siguen pendientes los puntos de la entrada anterior:
    - Pasar PR #103 a listo. Ahora el `audit` debería pasar al rebasar sobre `main` con #108.
    - Mover el test AC-2 de `run-file.test.ts` (405 líneas, aviso `max-lines`).
- **Siguiente paso:**
  - Una persona revisa y mergea #108.
  - Después, volver a lanzar la CI de #103 (o actualizar su rama) para que `audit` pase, y ejecutar `gh pr ready 103` si todo pasa.
  - Decidir si se abre un issue para subir `vitest` a >=5.0.3.

### 2026-10-22 — dev-loop V1

- **Hecho:**
  - Ejecución de `/dev-loop` en la fase V1, iniciada el 2026-10-15 con max-tasks=3, max-open-prs=4, max-failures=2 y max-idle=8.
  - La persona pidió terminar #43 hasta `/deliver --loop`, cerrar con `/handoff` y detener el loop sin empezar más tareas ni vueltas.
  - **#43 v1-03-run-file-defaults, entregado: PR #103 en borrador, rama `fix/43-run-file-defaults`, etiqueta `loop`.**
    - Commits:
      - `e92e542` diseño §23.2.1 y test AC-2. El rojo se verificó: `0o755 ≠ 0o700`.
      - `6acaa65` implementación.
      - `4b7fc8a` tests de endurecimiento.
      - `ebd7901` quita un test duplicado.
    - `pnpm verify` pasa en `ebd7901`. `delivery-auditor` dio APROBADO. Hay un comentario de entrega en #43.
  - PRs mantenidos: ninguno.
  - Tareas detenidas: ninguna.
  - Contadores: 1 tarea entregada, 0 fallidas seguidas, 0 vueltas sin cambios.
- **En curso:**
  - PR #103 sigue en borrador porque los 7 checks de CI (`verify` ×6 y `audit`) estaban pendientes al entregarlo.
  - Si pasan todos, hay que ejecutar `gh pr ready 103`.
  - Si alguno falla, hay que compararlo con el mismo check del último PR mergeado, como dice `/deliver`, paso 8.
  - Estado de la CI de #103 al cerrar la sesión:
    - `verify` pasa en ubuntu (Node 22 y 24) y en macOS con Node 24; los de Windows y macOS con Node 22 siguen pendientes.
    - **`audit` falla por una advisory nueva, no por esta tarea:**
      - Es GHSA-587h-7wmj-h5pm (alta), contra `vite` 8.3.0–8.3.2 y `launch-editor` ≤2.14.1; las dos son dependencias de desarrollo.
      - Se publicó después de que pasara #101, y `main` tiene el mismo lockfile, así que también fallaría.
      - #43 no toca `pnpm-lock.yaml` ni ningún `package.json`.
      - Hace falta un issue de bump de dependencias. Hasta entonces, el `audit` de cualquier PR fallará.
- **Decisiones:**
  - La persona aprobó quitar el tercer test de `run-file-modes.test.ts`, que repetía AC-2 y el test de `0600`. El hook `test-guard` bloqueó la edición, así que la persona aplicó el parche ella misma.
    - Dónde quedó escrito: el cuerpo del commit `ebd7901`, el PR #103 y `.atium-loop/current.md`. No hay ADR ni cambio de diseño.
  - Se justificó en lugar de corregir el aviso `max-lines` de `packages/core/src/storage/run-file.test.ts`, que tiene 405 líneas para un máximo de 400.
    - Lo causa el test de especificación AC-2. Moverlo lo decide `spec-tester` o una persona (04-testing.md, "TDD").
    - Dónde quedó escrito: el PR #103 y el comentario en #43.
  - El loop se detuvo por instrucción de la persona. Dónde quedó escrito: solo en `.atium-loop/current.md`, que no se versiona.
- **Problemas:**
  - En las rondas 1 y 2 de `/verify` del 2026-10-15, varios tests de archivos que la tarea no tocó superaron el timeout bajo carga (load 20-46). En la ronda 3 y el 2026-10-22, con carga normal, todo pasó. Si se repite en CI, tratarlo como flaky preexistente.
  - La spec de v1-03 dice que los reintentos de `fs.rm` esperan "unos 0,3 s". Con el retraso lineal de Node (100, 200 y 300 ms) son unos 0,6 s en el peor caso. El diseño no da cifra, así que no cambia nada.
  - Sugerencias de `/review` que ya existían antes y no son de esta tarea, sin issue:
    - `REDACT_PATTERN_IDS` no está congelado en tiempo de ejecución.
    - Antes de escribir no se comprueba con `realpath` si `.atium/runs` es un symlink (06-security.md:33).
- **Siguiente paso:**
  - Pedir a la persona que cree el issue del bump de `vite` (≥8.3.3) y `launch-editor` (≥2.14.2) por GHSA-587h-7wmj-h5pm.
  - Revisar la CI de PR #103. Si los `verify` pasan, decide la persona: el `audit` no lo causa la tarea, pero `/deliver` solo da el PR por listo cuando el mismo check también falla en el último PR mergeado.
  - Una persona revisa y mergea #103.
  - Decidir si se mueve el test AC-2 a `run-file-modes.test.ts` y si las dos sugerencias de seguridad merecen un issue.
  - Para reanudar el loop: `/loop /dev-loop`.

### 2026-10-15 — #99 Test de propiedades de context.test.ts supera el timeout en CI

- **Hecho:**
  - **#42 cerrada:** la persona mergeó el PR #98 (`0811ac3`).
  - **#99 abierto en esta sesión** a petición de la persona, con etiqueta `bug` y milestone V1. No tiene archivo en `docs/tasks/`.
    - Trabajado con el flujo de `/task` en el worktree `atium-loop`. `plan-reviewer` agotó sus 2 rondas con `CAMBIOS`; su último cambio se aplicó y la persona aprobó el plan.
    - Rama `test/99-property-test-timeout`. PR #100 con `Closes #99`, listo para revisión, con los 7 checks de CI en verde.
  - **Diagnóstico:**
    - `packages/eslint-plugin/src/syntax/context.test.ts:174` ya tenía semilla fija (`20261013`) y 300 ejecuciones.
    - En local tarda de 0,4 a 0,6 s aislado y de 1,2 a 3,8 s con todas las suites en paralelo. En `verify (ubuntu-latest, Node 22)` de #97 superó el timeout de 5 s.
    - Causa: un runner de CI cargado, no una entrada patológica.
    - Corrección del handoff anterior: la entrada de #42 decía que el test no tenía semilla fija y hacía 100 ejecuciones; no es así.
  - **Commits:**
    - `d187a9f` (eslint-plugin), `95e0745` (core), `eaf2f62` (core) y `0d03185` (storage-sqlite): `HEAVY_TEST_TIMEOUT_MS` (60 s) como tercer argumento de `it` en seis tests:
      - context "is stable when spaces and line breaks change…";
      - stderr-logger "writes exactly one line…";
      - en cap-run: "keeps pending calls first…", "keeps the testId computed…" y "leaves texts at their cap as they are";
      - run-rows "rebuild a run without adding or losing keys…".
    - `d8370b5` (correcciones de `/review`): la constante pasa de `core/src/storage/samples.test-support.ts` a `core/src/testing/timeouts.ts` y se exporta desde `@atium/core/testing`, sin copias locales. Los comentarios citan #99, sin duraciones medidas.
    - `603d949`: viñeta en `docs/engineering/04-testing.md`, "Determinismo", con la convención y el umbral.
  - **Verificado:**
    - `pnpm verify` con exit 0.
    - `/review` (code-reviewer, duplication-auditor, docs-checker): sin bloqueantes; todo aplicado y aprobado en una segunda pasada.
    - `delivery-auditor` dio APROBADO en la segunda ronda. En la primera rechazó por el umbral escrito, por tres tests sin proteger y por el cambio al plan sin registrar.
- **En curso:** nada. El PR #100 espera revisión y merge.
- **Decisiones:**
  - **Convención:** todo test que tarda 0,8 s o más en alguna ejecución de `pnpm test --force` recibe `HEAVY_TEST_TIMEOUT_MS`. Nunca se sube el `testTimeout` global ni se reducen las ejecuciones o la semilla de una propiedad. Está escrito en `04-testing.md` y en el TSDoc de `core/src/testing/timeouts.ts`.
  - **Ubicación de la constante:** `@atium/core/testing` (interno), aprobado por la persona en `/review` ("Corrige todo").
  - **Cambios al plan:** registrados en #99 bajo "Cambio al plan aprobado".
- **Problemas:**
  - **Tests de propiedades sin semilla fija** (`04-testing.md` la exige): `packages/core/src/ci/env.test.ts` y `packages/storage/sqlite/src/run-rows.test.ts`. No hay issue abierto.
  - **Candidatos a proteger:** en el `pnpm verify` del auditor, con más carga, tres propiedades sin timeout pasaron de 0,8 s, aunque lejos de 5 s: `core/src/redact/fields.test.ts:114` (1,87 s), `core/src/findings/fingerprint-of.test.ts:52` (1,21 s) y `cli/src/doctor/checks/node.test.ts:37` (1,03 s). En esa misma ejecución, `context.test.ts` tardó 9,5 s.
  - **Margen del test más pesado:** `cap-run.test.ts` "gives a result that passes the schema…", que ya tenía 60 s de timeout, llegó a 35 s en local con carga. Hay que vigilarlo.
  - **Permisos y scratchpad:** sigue denegado `git commit --amend`, `gh run view` y `gh api`, y el scratchpad no está disponible.
  - **Worktree del loop ocupado:** `atium-loop` quedó en la rama `test/99-property-test-timeout`.
- **Siguiente paso:**
  1. Revisar y mergear el PR #100.
  2. `git -C ../atium-loop switch --detach origin/main`.
  3. Abrir el issue de las semillas que faltan.
  4. Contestar las decisiones abiertas de #43 (reintentos del borrado temporal y modo del directorio de runs) y de #44 (si un `headSha` que no cabe es un aviso o `MODEL_INVALID`) antes de lanzar `/dev-loop V1`.

### 2026-10-15 — #42 v1-02-shared-fs-and-path-helpers

- **Hecho:**
  - **#41 cerrada.** La persona mergeó el PR #97 (`090de39`). Los checks `audit` y los 6 `verify` pasaron, salvo un timeout de `verify (ubuntu-latest, Node 22)`; ver "Problemas". Después, el worktree `atium-loop` volvió a detached sobre `origin/main`.
  - **#42 con `/task 42`,** en el worktree `atium-loop`:
    - La persona tomó las decisiones abiertas de la tarea. El plan pasó dos rondas de `plan-reviewer` y lo aprobó la persona; está comentado en el issue bajo `## Plan aprobado`, con la etiqueta `plan:approved`.
    - Rama `refactor/42-shared-fs-and-path-helpers`. PR #98 con `Closes #42`, listo para revisión.
    - Los 7 checks de CI están en verde: los 6 `verify` y `audit`.
  - **Commits:**
    - `b860348`: especificación TDD.
      - Stubs de `isMissingFileError` y `displayPath`.
      - 18 tests `AC-n` en rojo: 17 por el stub y 1 por assertion. Este último es el test de `loadConfig` con `..foo.json`, que reproduce el bug.
    - `e07a5a5` (core): mueve `isMissingFileError` a `errno.ts` y `displayPath` a `paths.ts`, y define `ATIUM_DIRECTORY` en `defaults.ts`.
      - `RUNS_DIRECTORY` se construye a partir de `ATIUM_DIRECTORY` con `as const`.
      - Exporta `LOCAL_PROVIDER` desde `ci/detect-run-context.ts`.
      - Los cinco helpers y constantes se exportan desde la raíz de `@atium/core` y se documentan en el README de core.
      - `loadConfig` usa el `displayPath` compartido, lo que corrige el caso `..foo.json`.
    - `7677d09` (cli): importa los helpers de core. `ATIUM_DIRECTORY` se queda duplicado, con un test que lo iguala al de core.
    - `30dc27d` (sqlite): `SQLITE_DATABASE_PATH` se construye a partir del `ATIUM_DIRECTORY` de core.
    - `21be247`: endurecimiento de `test-writer`.
      - `packages/core/src/display-path.test.ts`: tests de propiedades con semilla fija, separadores redundantes e `isMissingFileError` con errores reales del sistema de archivos.
      - Dos tests del check `config` de doctor.
    - `40b52f9`, `7c9882e` y `ab67916`: correcciones de `/review` y del primer rechazo de `delivery-auditor`.
  - **Verificado:**
    - `pnpm verify` con exit 0 sobre `ab67916`.
    - `/review` con code-reviewer, duplication-auditor, docs-checker, security-reviewer, design-auditor (CONFORME) y perf-benchmarker: sin bloqueantes. `atium --help` tarda 40,3 ms frente a un presupuesto de 300 ms. No se pudo comparar con `main` porque no hay permiso para crear un worktree.
    - `delivery-auditor` dio APROBADO en la segunda ronda.
- **En curso:** nada. El PR #98 espera revisión y merge.
- **Decisiones** (todas escritas en `docs/tasks/v1-02-shared-fs-and-path-helpers.md`, "Decisiones abiertas en esta tarea"):
  - **Exports:** `errnoCode`, `isMissingFileError`, `displayPath`, `ATIUM_DIRECTORY` y `LOCAL_PROVIDER` se exportan desde la raíz de `@atium/core`, no desde `pure` ni desde un subpath nuevo. Sin ADR ni changeset: el cambio es aditivo y los paquetes son `private`.
  - **`ATIUM_DIRECTORY` en cli:** se queda duplicado, porque `messages.ts` lo usa en `--help`, que no puede cargar core. `packages/cli/src/defaults.test.ts` los mantiene iguales.
  - **`errnoCode` en cli:** no se reexporta, en contra del plan. `project-files.test.ts` solo cambia su import a `@atium/core`. La persona lo aprobó en `/review` con "Corrige todo"; la cita la escribió el agente, no la persona.
  - **`LOCAL_PROVIDER`:** se queda en `ci/detect-run-context.ts` y no en `defaults.ts`, porque es un valor del modelo, no un default. Esto solo está escrito aquí y en el cuerpo del PR.
- **Problemas:**
  - **Test inestable** `packages/eslint-plugin/src/syntax/context.test.ts:174`. Es de propiedades con fast-check, sin semilla fija y con 100 ejecuciones. Superó los 5000 ms en `verify (ubuntu-latest, Node 22)` del PR #97; en local tarda entre 0,4 y 0,6 s. No hay issue abierto.
  - **Sugerencias no aplicadas:**
    - `displayPath(cwd, cwd)` devuelve `""`, igual que antes, y no está especificado.
    - Mover el test de `isMissingFileError` con errores reales de `display-path.test.ts` a `errno.test.ts`. `test-guard` bloqueó quitarlo del primero.
  - **Permisos de la sesión:** está denegado `git commit --amend`, `gh run view` y `gh api`. El scratchpad dejó de estar disponible a mitad de sesión; los textos temporales se escribieron en un directorio de `$TMPDIR`.
  - **Worktree del loop ocupado:** `atium-loop` quedó en la rama `refactor/42-shared-fs-and-path-helpers`.
- **Siguiente paso:**
  1. Revisar y mergear el PR #98.
  2. Antes de lanzar `/dev-loop`: `git -C ../atium-loop switch --detach origin/main`.
  3. Abrir un issue para el test inestable de `context.test.ts:174`, con las opciones de semilla fija, `numRuns` o un timeout explícito.
  4. Siguiente tarea de V1: #43 (v1-03, valores de los archivos de run en `defaults.ts`).

### 2026-10-15 — #41 v1-01-dependency-security-bump

- **Hecho:**
  - **Dry run de `/dev-loop V1 --dry-run`** al empezar la sesión. No escribió nada en GitHub ni en el registro.
    - No había PRs con la etiqueta `loop`.
    - Faltaban `plan:approved`, `loop:blocked` y `loop`. En esta sesión se creó `plan:approved`; las otras dos siguen sin existir.
    - `plan-reviewer` dio `REQUIERE PERSONA` a #41, porque cambia dependencias y el loop no las toca.
    - También a #42, por dos bloqueos verificados en el código:
      - `packages/core/src/pure/index.test.ts:6` exige que `@atium/core/pure` solo exporte lo que también exporta la raíz de core, así que exportar los helpers desde `pure` amplía la API pública.
      - `packages/cli/src/messages.ts` usa `ATIUM_DIRECTORY` y no puede importar `@atium/core`, porque lo carga `--help`.
    - Ni #41 ni #42 recibieron comentario ni etiqueta.
  - **#41 con `/task 41`,** en el worktree `atium-loop`:
    - Plan aprobado por la persona tras dos rondas de `plan-reviewer`. Está comentado en el issue bajo `## Plan aprobado` y el issue tiene `plan:approved`.
    - Rama `chore/41-dependency-security-bump`. PR #97 en borrador con `Closes #41`. Resumen comentado en el issue.
  - **Commits:**
    - `c95a7d3` `chore(deps): resolve patched shell-quote and source-map-js`. Solo cambia el lockfile: shell-quote 1.10.0 → 1.11.0 (crítico) y source-map-js 1.2.1 → 1.2.2 (alto). Las versiones parcheadas ya cabían en los rangos de `launch-editor`, `postcss` y `magicast`.
    - `5a91fdb` `chore(deps): override esbuild to patched versions`. Añade a `pnpm-workspace.yaml` los overrides `tsup>esbuild: ^0.28.2` (aviso bajo, GHSA-g7r4-m6w7-qqqr) y `@esbuild-kit/core-utils>esbuild: ^0.25.12` (aviso moderado, GHSA-67mh-4wv8-2f99, vía drizzle-kit). Cada uno lleva un comentario con la condición para quitarlo. También actualiza el lockfile y añade la viñeta de `overrides` en `docs/engineering/06-security.md`, sección "Dependencias".
    - `f636de4` `docs(design): …`. Corrige lo que salió en `/review`:
      - la frase sobre `overrides` en `docs/design/17-tech-stack.md:40`;
      - "elegible (según `minimumReleaseAge`)" en `06-security.md`.
  - **Verificado:**
    - `pnpm audit` no encuentra ningún aviso, y `pnpm why -r esbuild` solo muestra 0.25.12 y 0.28.2.
    - `dist/` de cli, core, eslint-plugin y storage-sqlite es idéntico byte a byte al de antes del cambio (`pnpm build --force` y `diff -r`), y `pnpm pkg:check` pasa.
    - `drizzle-kit generate` desde cero, antes y después, produce el mismo `.sql` y el mismo snapshot (sin `id` ni `prevId`), igual a `0000_initial.sql`.
    - `pnpm verify` en verde, ejecutado por `verifier` y por `delivery-auditor`.
    - `/review` sin bloqueantes; `code-reviewer` aprobó las correcciones en una segunda pasada. `delivery-auditor` dio APROBADO.
    - En CI, el check `audit` ya está en verde.
- **En curso:** PR #97 en borrador, esperando los 6 checks `verify (…)`, que seguían en curso al cerrar la sesión.
- **Decisiones:**
  - **shell-quote y source-map-js sin overrides:** solo se refresca el lockfile, con `pnpm update -r --no-save <paquete>`. pnpm 12 no acepta `--depth Infinity`, y su profundidad por defecto ya es ilimitada.
  - **esbuild:** overrides acotados `padre>hijo` en `pnpm-workspace.yaml`. La política está escrita en `06-security.md`, "Dependencias", y referenciada desde `17-tech-stack.md`.
  - **El peer opcional de vite:** el override no lo movía, y vite@8.3.1 seguía recibiendo esbuild 0.27.7 porque pnpm conservaba la resolución anterior. Hizo falta `pnpm update -r --no-save esbuild`. Solo está escrito aquí y en el mensaje de `5a91fdb`.
  - **AC-3 y la CI:** el AC-3 se evalúa con el criterio del paso 8 de `/deliver`, porque la entrada del 2026-10-14 dice que los `verify` fallan también en `main`. `plan-reviewer` lo aceptó en la segunda ronda.
- **Problemas:**
  - **Permisos:** en esta sesión, la edición de `pnpm-workspace.yaml` está denegada, y también leer `.claude/settings*.json`, así que no sé qué regla lo bloquea. La persona añadió el bloque `overrides` con un comando `!`. Cualquier tarea que toque ese archivo necesita a la persona.
  - **Comentario impreciso:** el comentario del override `tsup>esbuild` dice "esbuild <0.28.1", pero el rango exacto del aviso es `>=0.27.3 <0.28.1`. Lo señaló `delivery-auditor` y no está corregido.
  - **Overrides que habrá que quitar:**
    - `tsup>esbuild`, al subir a tsup 9, que es major y cumple `minimumReleaseAge` el 2026-10-28;
    - `@esbuild-kit/core-utils>esbuild`, cuando drizzle-kit deje `@esbuild-kit`.

    Ningún mecanismo lo recuerda.
  - **Worktree del loop ocupado:** `atium-loop`, que es el de `/dev-loop`, quedó en la rama `chore/41-dependency-security-bump`.
  - **Sugerencias de `/review` fuera de alcance, no aplicadas:** un recordatorio de overrides en `/audit` y documentar `pnpm-workspace.yaml` en `docs/engineering/10-tooling.md`.
- **Siguiente paso:**
  1. `gh pr checks 97 --json name,bucket`:
     - si los 6 `verify (…)` están en `pass`, `gh pr ready 97`;
     - si alguno falla, compararlo con el último PR mergeado a `main` (paso 8 de `/deliver`).
  2. Decidir en #42 dónde se exportan los helpers (raíz de core con changeset, un subpath `internal` nuevo, o `pure` con un ADR que reemplace la lista de ADR-0023) y qué hacer con `ATIUM_DIRECTORY` en cli.
  3. Antes de lanzar `/dev-loop`: `git -C ../atium-loop switch --detach origin/main`, y crear las etiquetas `loop:blocked` y `loop` o dejar que las cree el loop.

### 2026-10-14 — #91 Loop de desarrollo, pipeline de entrega y push del agente

- **Hecho:**
  - **Issue y PRs.** Issue de seguimiento #91. El trabajo se divide en tres PRs apilados, ninguno mergeado y todos con push hecho por el usuario mediante el script:
    - #92 (`chore/91-push-script`, `0eb7ae8`, base `main`): ADR-0025, `.claude/scripts/push-branch.mjs` con 31 tests (`pnpm test:claude`, dentro de `pnpm verify`) y `.claude/settings.json`. El usuario editó los permisos: permite el script y los comandos de git y gh del pipeline, deniega editar `.claude/scripts/**` y `.claude/loop-settings.json`, y mantiene el `deny` de `git push`.
    - #93 (`chore/91-delivery-pipeline`, `953c846`, base `chore/91-push-script`): pipeline de entrega. Incluye `plan-reviewer`, `spec-tester` (TDD), `delivery-auditor`, `test-writer` como endurecimiento, `/deliver`, `/task`, la sección TDD de `04-testing.md` y dos puntos nuevos en la DoD.
    - #94 (`chore/91-dev-loop`, `cef5b34`, base `chore/91-delivery-pipeline`, `Closes #91`): `/dev-loop`, `.claude/loop-settings.json`, el modo loop de `/handoff`, las etiquetas `loop:blocked` y `loop`, y la sección "Loop de desarrollo" de `12-ai-workflow.md`.
  - **Antes, en esta misma sesión:** PR #29 (`/parallel`), mergeado.
  - **Verificado:**
    - `pnpm verify` en verde.
    - Dos rondas de `/review` con code-reviewer, security-reviewer y docs-checker: sin bloqueantes; los importantes, corregidos.
    - `delivery-auditor`, ejecutado con un agente genérico porque el agente no existe en `main`, dio RECHAZADO por tres motivos. Los dos primeros ya están resueltos (los permisos en #92 y el texto del ruleset). Queda pendiente el motivo 3; ver "Problemas".
- **En curso:** nada en código. Los tres PRs esperan revisión y merge.
- **Decisiones:**
  - **En ADR-0025:**
    - el agente solo hace push con el script, que valida la rama y construye el refspec;
    - aprobación del plan humana en `/task` y por `plan-reviewer` en `/dev-loop`;
    - TDD con `spec-tester`;
    - el loop usa un token fine-grained sin Administration, Workflows ni Secrets.
  - **Del usuario, escritas en `dev-loop.md` y `12-ai-workflow.md`:** sin límite de hora; `--max-idle 8`; `--max-failures` solo cuenta tareas que agotan intentos; tres PRs.
  - **Ruleset `protect-main`:** sin bypass y sin checks requeridos, porque `verify` falla también en `main` por causas preexistentes (el usuario dice que tienen que ver con fechas). Está escrito en `08-git-workflow.md` "Ramas". `/deliver` y el loop tratan como preexistente un fallo que también ocurre en el último PR mergeado a `main`.
- **Problemas:**
  - **Pregunta abierta para el usuario (motivo 3 del auditor):** ¿un test `AC-n` que falla por el `not implemented` de un stub cuenta como rojo válido? El criterio AC-2 de #91 dice "falla por assertions". Hasta que conteste, no está escrito en ningún lado.
  - **La CI de `main` está en rojo** en todos los `verify` desde al menos #87. No se investigó.
  - **Orden de merge:** #92, #93 y #94, seguidos. Tras cada squash merge, la rama siguiente necesita `git merge origin/main` y push con el script para que su diff quede limpio.
  - **El loop no se ha probado contra un issue real.**
  - **El worktree `~/Projects/atium-dev-loop` sigue existiendo.** En la rama `chore/91-delivery-pipeline` hay un `git stash` de respaldo de esta sesión ("A-full backup") que ya no hace falta.
- **Siguiente paso:**
  1. Responder la pregunta del rojo con stub.
  2. Revisar y mergear #92, #93 y #94 en orden, actualizando cada rama siguiente después de cada merge.
  3. Preparar el worktree `../atium-loop` y el token del loop (`12-ai-workflow.md`, "Loop de desarrollo").
  4. Lanzar `/dev-loop V1 --dry-run`.

### 2026-10-14 — #49 v1-09-e2e-syntax

- **Hecho:**
  - **Al empezar la sesión, en el repo principal:**
    - `/parallel 48 63 61`: worktrees `atium-48`, `atium-63` y `atium-61`.
    - `/parallel --cleanup`, con los PRs #88, #87 y #85 mergeados: los tres worktrees retirados. Las ramas no se borraron.
    - `git pull` de `main` a `8abd59e`. Después hizo falta `pnpm install`, porque faltaba `p-limit` y el build de core fallaba.
  - **Rama, commit y PR:**
    - Rama `feat/49-e2e-syntax`, creada desde `origin/main` en `8abd59e`, en el repo principal (sin worktree).
    - Commit `0c23523` `feat(eslint-plugin): add the shared E2E syntax helpers`. El push lo hizo el usuario.
    - PR #89 con `Closes #49`, sin mergear.
  - **`@atium/eslint-plugin/syntax`** (`packages/eslint-plugin/src/syntax/`): funciones puras sobre el AST de typescript-eslint.
    - `ast.ts`:
      - `unwrap` hace transparentes `!`, `as`, `<T>`, `satisfies` y `ChainExpression`;
      - `memberPath`, `calleePath`, `calleeName`;
      - `chainOf` devuelve las llamadas anteriores de la cadena y su raíz;
      - `isMethodCall`, `isCypressChain`, `isOneOf`, `isFunctionNode`, `isStringLiteral`.
    - `framework.ts`: `detectFramework(program, configured?)` y `FRAMEWORKS`, que se reexporta desde `defaults.ts`. `settings.ts` usa ahora esta lista.
    - `structure.ts`: `classifyBlock(call)` devuelve un `TestBlock` con `kind`, `name`, `runner` (`playwright` o `mocha`), `modifiers`, `title` y `callback`.
    - `context.ts`: `enclosingBlocks`, `titlePathOf` y `testContextOf`, que dan `titles`, `fullTitle` (unido con `TITLE_PATH_SEPARATOR` de `@atium/core/pure`) e `isStatic`.
    - `title.ts`: `titleOf(expr)`. Un título no estático se reconstruye desde el AST.
    - `actions.ts` (`actionOf`), `assertions.ts` (`assertionOf` y `createNameMatcher`, con `*` como único comodín), `locators.ts` (`locatorOf`, que da query o refinement con `base` y `hasName`) y `waits.ts` (`fixedWaitOf`).
    - `index.ts`: la entrada, con `@packageDocumentation`.
  - **Listas de nombres en `src/defaults.ts`**, en un bloque al final y cada una con su cita: `FRAMEWORKS`, `FRAMEWORK_MODULES`, `PLAYWRIGHT_ROOT`, `TEST_DECLARATIONS`, `DESCRIBE_DECLARATIONS`, `HOOK_DECLARATIONS`, `STEP_DECLARATIONS`, `BLOCK_MODIFIERS`, `PLAYWRIGHT_ACTIONS`, `CYPRESS_ROOT`, `EXPECT_CALLS`, `CHAINED_ASSERTIONS`, `LOCATOR_QUERIES`, `GET_BY_PREFIX`, `CYPRESS_QUERY`, `ROLE_LOCATOR`, `LOCATOR_REFINEMENTS`, `INDEXED_REFINEMENT` y `FIXED_WAITS`.
  - **Paquete:**
    - export `./syntax` en `package.json`, y entrada `syntax/index` en `tsup.config.ts`;
    - dependencia `@typescript-eslint/types` 8.70.1;
    - devDependencies `@typescript-eslint/typescript-estree` 8.70.1 y `fast-check` 4.10.2.
  - **Capas:**
    - `.dependency-cruiser.cjs`: regla `eslint-plugin-syntax-no-rules`, con `reachable`. `src/syntax/` no alcanza `rules/`, `plugin.ts`, `create-rule.ts`, `settings.ts` ni `index.ts`.
    - `eslint.config.js`: override de `no-restricted-imports` para `packages/eslint-plugin/src/syntax/**`, con `allowTypeImports`. Prohíbe `eslint`, `@typescript-eslint/utils`, `@typescript-eslint/parser` y `@typescript-eslint/typescript-estree`.
    - La regla de npm va en ESLint porque `exclude` saca `node_modules` del grafo de dependency-cruiser. Está explicado en `10-tooling.md`.
  - **Tests:**
    - Un `*.test.ts` por helper, 237 tests en el plugin.
    - `test/parse.ts`: `parseSource(code)` parsea con typescript-estree, fija los `parent` con `simpleTraverse(..., true)` y busca nodos por su texto exacto.
    - Property-based en `context.test.ts`: el `titlePath` es estable ante espacios y saltos de línea entre tokens.
  - **Documentación:**
    - `03-linter.md` §11.3.1 "Reconocimiento de sintaxis", nueva;
    - `17-tech-stack.md`;
    - `02-code-design.md`, que ahora dice que los selectores llegan en v1-10;
    - `10-tooling.md`;
    - el README del plugin.
  - **Verificado:**
    - `pnpm verify` en verde: core 958, cli 220, sqlite 61 y eslint-plugin 237 tests; `src/syntax` con 100 % de líneas.
    - `pnpm --filter @atium/eslint-plugin pkg:check` en verde para `./syntax`.
    - Las dos reglas de capas fallan con imports prohibidos temporales.
    - `dist/syntax/index.js` solo importa `@typescript-eslint/types` y `@atium/core/pure`.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, design-auditor): sin bloqueantes. El usuario pidió "Corrige todo lo que puedas" y se corrigieron los 4 importantes y las sugerencias.
- **En curso:** nada.
- **Decisiones:**
  - **Aprobadas por el usuario en el plan ("si"):** las escribí en `03-linter.md` §11.3.1.
    - un título no estático se reconstruye desde el AST, en lugar de un marcador fijo;
    - el framework se detecta por imports y la estructura no depende de él;
    - las listas de nombres y modificadores;
    - solo las 6 acciones de §11.3, y cada comando de una cadena `cy`;
    - `fixedWaitOf` mínimo aquí; la regla es v1-12;
    - las assertions y los globs con `*`;
    - `testContextOf` da `undefined` fuera de un test.
  - **Propuesta mía, aplicada tras "Corrige todo lo que puedas"** (escrita en §11.3.1): un describe de Playwright titulado `""` no añade nivel, como hace Playwright 1.63 (comprobado en `lib/runner/index.js`, `Suite.titlePath`). En Mocha sí lo añade.
    - Lo de Mocha es de memoria; no se comprobó en código porque Mocha no está instalado.
  - **Tomadas por mí**, escritas en §11.3.1:
    - los envoltorios TS son transparentes;
    - un `+` solo une texto si un lado es texto;
    - `test.step(title, body, { box: true })` no es step;
    - solo cuentan las declaraciones `import`;
    - `.wait(n)` vale en cualquier punto de una cadena `cy`;
    - E2E009 no tiene helper.
  - **Solo en el código y en el PR:** `@typescript-eslint/types` en lugar de `@typescript-eslint/utils`, porque la raíz de `utils` carga `eslint` vía `TSESLint`. También está en 17-tech-stack.
- **Problemas:**
  - **Tamaño del PR:** #89 tiene unas 2 100 líneas, unas 870 de tests y lockfile, frente a la guía de 400 de 08-git-workflow. Sigue abierta la decisión del usuario sobre esa guía, que ya anotó #63.
  - **Test ajustado:** la propiedad de `titlePath` falló al aplicar la regla del `""` y se ajustó lo que esperaba. Es un test de esta misma tarea, no uno que existiera en `main`.
  - **Logs de turbo:** al repetir logs de caché, turbo muestra rutas de `atium-63`. Son de la caché, no un problema de resolución.
  - **CI del PR #89:** no se comprobó. `audit` seguirá en rojo como en `main` (v1-01).
  - **Sin consumidores todavía:** los exports de `syntax` solo los usan sus tests hasta v1-10 y v1-11.
- **Siguiente paso:**
  1. Revisar `gh pr checks 89` y corregir lo que falle, salvo `audit`.
  2. Cuando una persona mergee #89, empezar el siguiente issue de V1 con `/task`. Con #49 cerrado se desbloquean v1-10 (#50) y las reglas por archivo (#51 a #58).
  3. v1-10 trabaja en el mismo módulo `syntax/`: no conviene en paralelo con reglas que lo modifiquen.

### 2026-10-13 — #63 v1-23-analyzer-pipeline

- **Hecho:**
  - **Rama, commits y PR:**
    - Rama `feat/63-analyzer-pipeline`, creada desde `origin/main` en `15abdf6`, en el worktree `atium-63`. Se trabajó en paralelo con #48 y #61.
    - Commit `a0690ee` `feat(core): add the analyzer interface and orchestrator`.
    - Commit `032924b`: merge de `origin/main` después de #85 (#61) y #86 (#48).
      - Hubo un solo conflicto, en `packages/core/src/defaults.ts`, entre bloques añadidos al final. Se conservaron los dos: primero `RULE_DOCS_BASE_URL`, luego `ANALYZER_TIMEOUT_MS` y `ANALYZER_CONCURRENCY`.
    - El push lo hizo el usuario.
    - PR #87 abierto con `Closes #63`. Sin mergear; al cerrar la sesión, la CI estaba en curso.
  - **Código en `packages/core`:**
    - `src/pipeline/analyzer.ts`: `Analyzer<C>`, `AnalysisContext<C>`, `Capability`/`CAPABILITIES`, `AnalyzerKind`/`ANALYZER_KINDS` y `ResolvedProject` (solo `root`).
      - `analyze` usa sintaxis de método a propósito: su parámetro es bivariante y así un `Analyzer<C>` cabe en `readonly Analyzer[]`.
    - `src/pipeline/run-analyzers.ts`: `runAnalyzers(analyzers, context)`, con los tipos `RunAnalyzersContext`, `AnalysisResult`, `SkippedAnalyzer` y `SkipReason`. `SkipReason` es una unión: `missing-capabilities`, `duplicate-id`, `invalid-config`, `timeout`, `failed`, `aborted`.
      - El timer y el listener de abort se arman antes de validar la config. La validación cuenta dentro del timeout.
      - No usa `failOpen`, porque su fallback fijo y su aviso incondicional no encajan con el timeout. El motivo está en un comentario sobre `runOne`.
    - `src/scheduler.ts`: `Scheduler` y `systemScheduler`.
    - `src/testing/manual-scheduler.ts`: `ManualScheduler`, con `advance(ms)`, `elapsed` y `pending`.
    - `defaults.ts`: `ANALYZER_TIMEOUT_MS = 60_000` y `ANALYZER_CONCURRENCY = 4`.
    - Dependencia `p-limit` 7.3.3. Es solo ESM, igual que `env-ci`.
    - Exports añadidos en `src/index.ts` y `src/testing/index.ts`.
  - **Tests:**
    - `pipeline/run-analyzers.test.ts`: selección, capacidades, config, ids duplicados, Findings inválidos y `RangeError`.
    - `pipeline/run-analyzers.resilience.test.ts`: timeout, fail-open, cancelación (incluida la que ocurre mientras se valida la config), concurrencia, y un test property-based de que el orden de terminación no cambia la salida.
    - `pipeline/run-analyzers.cleanup.test.ts`: liberación del hueco tras un timeout, resultados tardíos ignorados y retirada de los listeners.
    - Fakes en `pipeline/fakes.test-support.ts`.
  - **Documentación:**
    - `docs/design/14-architecture.md` §22.2: subsección "Implementación" y tabla "Valores del orquestador".
    - `docs/design/01-requirements.md` §8: el "aviso" por capacidades que faltan es la lista de omitidos que muestra el comando.
    - `packages/core/README.md`.
  - **Verificado:**
    - `pnpm verify` en verde antes y después del merge con `main`: core 953 tests, cli 220, sqlite 61 y demo 15.
    - `/review` con code-reviewer, duplication-auditor, docs-checker y design-auditor, sin bloqueantes. Se corrigieron los 4 importantes y las 9 sugerencias.
    - Una segunda pasada de code-reviewer sobre las correcciones no dio bloqueantes ni importantes.
- **En curso:** nada.
- **Decisiones:**
  - **Aprobadas por el usuario en el plan ("Si"):** las tres quedaron en §22.2 y en el TSDoc.
    - Timeout de 60 000 ms y concurrencia 4.
    - Un Finding inválido descarta solo ese Finding, con un aviso `MODEL_INVALID` por analizador.
    - Una config de analizador inválida omite el analizador con aviso y `CONFIG_INVALID`.
  - **Elegida por el usuario en el review (opción B):** el orquestador no avisa cuando faltan capacidades. El aviso es la lista `skipped` que mostrará el CLI. Escrito en §22.2 y en 01-requirements §8.
  - **Tomadas por mí:**
    - `ResolvedProject` solo con `root`. El plan decía `{ root, frameworks }`, pero `FrameworkName` incluye `junit` y `ctrf`, que son formatos de reporte. `git`, `currentRun`, los frameworks y CODEOWNERS los añaden las tareas que los definan. Escrito en §22.2.
    - Un `Scheduler` nuevo en lugar de ampliar `Clock`.
    - El tope de `timeoutMs` es 2^31 - 1, el máximo de un timer de Node.
    - Al vencer el timeout se libera el hueco de p-limit aunque el analizador siga trabajando.
    - Las dos últimas están escritas en §22.2 y en el TSDoc.
  - **Sin escribir en ningún lado:** el PR supera la guía de 400 líneas de 08-git-workflow (unas 1 700, de ellas unas 1 060 de tests). Se dejó en un solo PR, como los PRs de features anteriores, y se explica en la descripción de #87.
- **Problemas y dudas abiertas:**
  - **Tamaño de los PRs:** conviene que el usuario decida si la guía de 400 líneas sigue vigente para las features (08-git-workflow.md, "Pull requests") o si se ajusta.
  - **Atribución de Findings:** `Finding.analyzer` no se compara con `analyzer.id`, así que un plugin puede atribuir Findings a otro analizador. Falta decidirlo; no está escrito en ninguna tarea.
  - **Omitidos del CLI:** ningún `SkipReason` sirve para que el CLI reporte un `lint-crossfile` sin índice (§22.2). Habrá que ampliar la unión, que es API pública, o que el CLI use su propio tipo. Afecta a v1-32 y v1-37.
  - **Aviso en el CLI:** el CLI tendrá que mostrar `skipped` con su motivo, que es el aviso de 01-requirements §8.
  - **Límites conocidos, ya documentados en §22.2:**
    - el timeout no interrumpe bloqueos síncronos;
    - los avisos propios de cada analizador salen cuando los emite.
  - **`test-guard`:** bloqueó la división de `run-analyzers.test.ts` en dos archivos, aunque no se perdía ningún caso. El usuario lo aprobó y copió el archivo él mismo con `!`.
  - **Archivo de progreso:** esta entrada movió a `docs/progress-archive.md` la de #13 (v0-12-config).
- **Siguiente paso:** revisar la CI del PR #87 y, cuando una persona lo mergee, retirar el worktree con `/parallel --cleanup`. Después, empezar la siguiente tarea Pendiente de V1 con `/task`. v1-32 (`lint-crossfile`) ya puede usar `runAnalyzers`.

### 2026-10-13 — #48 v1-08-eslint-plugin-skeleton

- **Hecho:**
  - **Rama, commits y PR:**
    - `/task 48 en paralelo con #63 #61`, en el worktree `atium-48`.
    - Rama `feat/48-eslint-plugin-skeleton`, creada desde `origin/main` en `15abdf6`.
    - Commit `e0c0691` `feat(core): add the pure entry point and ruleDocsUrl`.
    - Commit `e83322c` `feat(eslint-plugin): add the plugin skeleton`.
    - Merge de `origin/main` (`e4475e3`), que trae #61 ya mergeado (PR #85). No hubo conflictos.
    - Los dos push los hizo el usuario.
    - PR #86 con `Closes #48`. El usuario lo mergeó (`402f6b1`, 2026-10-14T03:41Z) y el issue #48 está cerrado.
  - **`@atium/core`:**
    - `src/pure/index.ts`: entrada interna `@atium/core/pure`.
      - Reexporta `model/`, `findings/`, `redact/`, `identity`, `paths`, `errors`, `result`, `assert-never` y `zod-issues`.
      - Tiene su entrada en `tsup.config.ts` y el export `./pure` en `package.json`.
      - `src/pure/index.test.ts` comprueba que cada export de `pure` existe en la raíz con el mismo valor.
    - `src/findings/docs-url.ts`: `ruleDocsUrl(code)` = `RULE_DOCS_BASE_URL` + código en minúsculas + `.md`, sin codificar.
      - `RULE_DOCS_BASE_URL` está en un bloque al final de `defaults.ts`.
      - Se exporta desde la raíz y desde `pure`.
    - `samples.test-support.ts` usa `ruleDocsUrl("E2E001")` en lugar de `atium.dev`.
  - **`packages/eslint-plugin`** (`@atium/eslint-plugin`, privado):
    - Dependencias: peer `eslint ^9.0.0` y `typescript >=4.8.4 <6.1.0`, este último igual que `@typescript-eslint/utils`.
    - El build es tsup en ESM y CJS, con `cjsInterop: true` y `splitting: true` para que `require()` devuelva el objeto del plugin.
    - `src/settings.ts`: `readSettings(context.settings)`.
      - Zod con `strictObject`.
      - `framework` es `"playwright" | "cypress"` y opcional; `undefined` cuenta como ausente.
      - Cada problema sale con su ruta completa (`settings.atium.<clave>`), también cada clave desconocida.
      - Un valor inválido lanza `AtiumError("CONFIG_INVALID")` con un hint que lista las claves válidas.
    - `src/defaults.ts`: `SETTINGS_DEFAULTS` = `pageObjectDirs: []`, `assertFunctionNames: []`, `i18n: false`.
    - `src/create-rule.ts`: `createRule`, con `ESLintUtils.RuleCreator`.
      - Fija `meta.docs.url = ruleDocsUrl(meta.docs.code)`.
      - `AtiumRuleDocs` exige `code`.
    - `src/plugin.ts`: `createPlugin(rules)` y `plugin`, con `{ meta: { name, version }, rules, configs: {} }`.
      - Las reglas se exponen como `Rule.RuleModule` de ESLint mediante `toEslintRule`, el único cast `as unknown as`, documentado.
      - `src/index.ts` hace `export default plugin`, con `eslint-disable-next-line no-restricted-syntax` y su motivo.
    - `src/rules/index.ts`: `rules = {}`.
    - `src/rules/rule-docs.test.ts` comprueba en cada regla:
      - que tiene página en `docs/rules/<código>.md`, con el nombre de archivo sacado de la URL;
      - que la página tiene las 5 secciones;
      - que `meta.docs.url` y `meta.messages` son correctos.
      El comprobador se prueba con reglas ficticias.
    - `test/rule-tester.ts`: `createRuleTester(settings)`, sobre `@typescript-eslint/rule-tester` y conectado a Vitest.
    - README en inglés.
  - **Raíz y docs:**
    - `.dependency-cruiser.cjs`:
      - regla `core-pure-has-no-io`, con `reachable`, que excluye los `.test.ts`;
      - regla `eslint-plugin-only-core-pure`, cuyos tests pueden usar `@atium/core/testing`;
      - la constante `TEST_FILE`, que también usa ahora `no-test-code-in-src`.
    - `docs/rules/_template.md`: tabla con nombre, severidad, categoría, confianza, `Source` y presets, más las 5 secciones en inglés.
    - Diseño actualizado:
      - `03-linter.md` §11.1: defaults y validación;
      - `16-repository-structure.md`: `core/src/pure/`, el subárbol de `eslint-plugin/` y la plantilla;
      - `17-tech-stack.md`: `@typescript-eslint/rule-tester` y `RuleCreator`;
      - ADR-0023 §1 y `02-code-design.md`: `zod-issues` en `pure`;
      - README de core.
  - **Verificado:**
    - `pnpm verify` en verde después del merge con `main` (Node 22): core 912 tests, eslint-plugin 25 (100 % de cobertura), cli 220, sqlite 61 y demo 15.
    - `pnpm pkg:check` en verde: 8 de 8 tareas, con publint y attw.
    - Las dos reglas de dependency-cruiser fallan con imports temporales de `node:fs`, `stderr-logger`, `config/` y la raíz de `@atium/core`. Esos imports ya se quitaron.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, design-auditor):
      - Se descartó un bloqueante: el export de `ruleDocsUrl` en la raíz es un añadido y v1-37 lo necesita.
      - Se corrigieron el importante (16-repository-structure) y las sugerencias 1 a 8 y 10.
- **En curso:** nada.
- **Decisiones:**
  - **Aprobadas por el usuario en el plan** ("si"):
    - los defaults de `settings.atium`;
    - el esquema estricto;
    - `describeIssues` en `pure`, con ADR-0023 enmendado;
    - `export default plugin`;
    - reutilizar `CONFIG_INVALID`.
  - **Tomadas por mí tras "Corrige todo lo que puedas"**, escritas en 03-linter.md §11.1:
    - `framework: undefined` cuenta como ausente;
    - las claves desconocidas salen cada una con su ruta;
    - `ruleDocsUrl` sin `encodeURIComponent`, como en §11.9.
  - **Solo en el código, en los comentarios de `plugin.ts` y `tsup.config.ts`, y en este PR:**
    - usar `@typescript-eslint/rule-tester` en lugar del `RuleTester` de ESLint (también en 17-tech-stack);
    - el cast en el borde hacia `Rule.RuleModule`;
    - `cjsInterop` + `splitting`.
  - **Sin escribir en ningún documento:** `readSettings` no tiene caché. Cada regla validará en cada archivo; si cuesta, se medirá en las tareas de reglas.
- **Problemas:**
  - **CI del PR #86:** estaba `pending` al mergear y no se comprobó. `audit` sigue en rojo en `main`, por `shell-quote` y `source-map-js` (v1-01).
  - **Umbral de cobertura del plugin:** está en 90 % y `04-testing.md` pide al menos 85 %. Sigue ligado a la decisión abierta sobre el umbral de cli.
  - **`settings.atium` inválido:** no se detecta hasta que exista una regla que llame a `readSettings`, desde v1-09.
  - **`@atium/core/pure`:** reexporta símbolos que todavía nadie consume; está previsto en ADR-0023.
- **Siguiente paso:**
  1. `/parallel --cleanup` desde el repo principal, para retirar el worktree `atium-48` (PR #86 y el PR de esta entrada mergeados).
  2. `git fetch origin` y `/task` con el siguiente issue de V1 cuyas dependencias estén cerradas. v1-09 (`@atium/eslint-plugin/syntax`) ya está desbloqueado.
     - Al crear `src/syntax/`, añadir en `.dependency-cruiser.cjs` la regla de ADR-0023: `syntax` no importa las reglas ni ESLint en runtime.
     - Exportar `./syntax` en `package.json` y en `tsup.config.ts`.

### 2026-10-13 — #61 v1-21-playwright-demo

- **Hecho:**
  - **Rama, commit y PR:**
    - `/task 61 en paralelo con #48 #63`, en el worktree `atium-61`.
    - Rama `feat/61-playwright-demo`, creada desde `origin/main` en `15abdf6`.
    - Commit `861e997` `feat(repo): add the Playwright demo with seeded problems`. El push lo hizo el usuario.
    - PR #85 con `Closes #61`, sin mergear. Su CI estaba `pending` al cerrar la sesión.
  - **`examples/playwright-demo`** (`@atium/example-playwright-demo`, privado):
    - `tests/*.spec.ts`, Page Objects en `tests/pages/` (`pageObjectDirs`) y helpers en `tests/helpers/`.
    - `tsconfig.json` autónomo, con `moduleResolution: Bundler`, para el project service.
    - 17 hallazgos sembrados que cubren las 14 reglas, más casos "no detecta" y archivos limpios (`home.spec.ts`, `pages/cart-page.ts`, `helpers/assertions.ts`).
    - `expected-findings.json` con `{ findings: [{ ruleId, file, line, titlePath }] }`. `file` es relativo al demo y el orden es `file`, `line`, `ruleId`.
    - README en inglés: problema por archivo, casos que no deben reportarse, configuración supuesta, convenciones y cómo ejecutar los scripts.
  - **`verify/`**, código del repo dentro del demo:
    - `expected-findings.test.ts` (15 tests) comprueba:
      - el formato, con un esquema Zod y casos negativos;
      - que están exactamente las 14 reglas;
      - el orden y que no hay duplicados;
      - que el archivo existe y la línea no está vacía;
      - que el `titlePath` es el del `test(` más cercano antes de la línea y que los `test.describe` previos existen.
    - `tsconfig.json`, que extiende `tsconfig.base.json`.
    - `vitest.config.ts`, con `root: import.meta.dirname` para no recoger los `*.spec.ts` de Playwright.
  - **Configuración raíz:**
    - `eslint.config.js` ignora `examples/*/*` salvo `!examples/*/verify/`.
    - `knip.json` ignora `examples/*/tests/**`.
    - `vitest.config.ts` añade `examples/*/verify/vitest.config.ts` a `projects`.
    - `turbo.json` añade `@atium/example-playwright-demo#test` con `outputs: []`.
  - **Dependencias del demo:** `@playwright/test` 1.63.0, `@types/node`, `typescript`, `vitest` y `zod`, con las mismas versiones que el resto del repo.
  - **Docs:** `10-tooling.md` (exclusiones y override de turbo), `04-testing.md` (fila End-to-end), `16-repository-structure.md` §24 (la app llega en V2, `verify/`) y la tarea v1-21 (sección "Decisiones tomadas en esta tarea").
  - **Verificado:**
    - `pnpm verify` pasa en Node 22: core 907 tests, cli 220, storage-sqlite 61 y demo 15.
    - Mutaciones del JSON (línea, título, describe o archivo inexistente) hacen fallar el test con el hallazgo nombrado.
    - Una pasada de `eslint` sin la exclusión mostró que las reglas de sonarjs detectan varios problemas sembrados.
    - `/review` (code-reviewer, duplication-auditor, docs-checker) sin bloqueantes. Se corrigieron los 2 importantes:
      - `login.spec.ts` "signs in with valid credentials" ahora solo tiene el assert en un helper importado a 2 niveles;
      - `CartPage.checkout` pasó a `private`.
      También se corrigieron las 8 sugerencias.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan:
    - `@playwright/test` como devDependency exacta.
    - Los casos de Cypress, en `examples/cypress-demo` (V6).
    - El demo no trae `eslint.config.js` ni `atium.config`: los crea v1-38 con preset `strict`, `pageObjectDirs: ["tests/pages/**"]` y `E2E011`/`E2E013` en `"on"`.
    Están en `docs/tasks/v1-21-playwright-demo.md` y en el README del demo.
  - Convenciones de `expected-findings.json` que el diseño no fija, también aprobadas. Solo están en el README del demo y en la tarea, no en el diseño:
    - `line` es la del nodo, o la del `test(` en las reglas de test (E2E005, E2E006, E2E006b, E2E013).
    - `titlePath` es `[]` fuera de un test (v1-22 lo tiene abierto).
    - E2E007 genera un hallazgo por uso.
    - E2E013 se reporta en el segundo test del par.
    - Un test cuyos asserts solo están en helpers importados lo decide E2E006b, no E2E006 (v1-33 lo tiene abierto).
    Las tareas v1-22, v1-32, v1-33, v1-35 y v1-36 deben actualizar el JSON y el README si deciden otra cosa.
  - Sin decisión del usuario: el override de `turbo.json` y la estructura `verify/` dentro del demo. Quedaron en `10-tooling.md` y `16-repository-structure.md`.
- **Problemas:**
  - El CI del PR #85 estaba `pending` al cerrar. `audit` fallará como en `main`, por `shell-quote` y `source-map-js` (v1-01).
  - El hook de pre-commit lanza ESLint sobre los archivos en stage y da avisos "File ignored" con los archivos del demo. No falla. Se arregla con `--no-warn-ignored` en `lefthook.yml`; no se hizo porque está fuera de alcance.
  - jscpd reporta un clon `core/vitest.config.ts` ↔ `storage/sqlite/vitest.config.ts`. No es de esta tarea y no hace fallar `verify`.
  - Conflictos esperados con #48 y #63, que van en paralelo: `pnpm-lock.yaml`, `knip.json` y `docs/progress.md`/`docs/progress-archive.md`.
- **Siguiente paso:**
  1. Revisar `gh pr checks 85` y corregir lo que falle, salvo `audit`.
  2. Si otra tarea paralela se mergea antes: `git fetch origin && git merge origin/main`, resolver según 12-ai-workflow.md "Cuando otra tarea se mergea antes" y luego `/verify`.
  3. Cuando el PR #85 esté mergeado: `/parallel --cleanup` en el repo principal y `/task` con el siguiente issue de V1 según CLAUDE.md.

### 2026-10-13 — #47 v1-07-linter-architecture

- **Hecho:**
  - **Rama, PR y merge:**
    - Rama `docs/47-linter-architecture`, creada desde `origin/main` en `1eaeb06` (merge de #83, `/plan-phase v1`).
    - Commit `38b16cd` `docs(repo): decide the linter architecture in ADR-0023`. El push lo hizo esta sesión con `git -C <repo> push -u origin <rama>`.
    - PR #84 con `Closes #47`. El usuario ya lo mergeó (`25f1140`, 2026-10-13T20:35Z) y el issue #47 está cerrado.
  - **CI del PR #84 al consultarla:**
    - Pasan 5 de los 6 jobs `verify`.
    - `verify (windows-latest, Node 22)` seguía `IN_PROGRESS` cuando se mergeó.
    - `audit` falla, igual que en `main`; ver Problemas.
  - **ADR-0023** (`docs/adr/0023-arquitectura-linter.md`), en estado Aceptada e indexado en `docs/adr/README.md`. Fija las seis decisiones de v1-07:
    1. **Capas:**
       - Entrada interna `@atium/core/pure`, solo con módulos sin I/O: `model/`, `findings/`, `redact/`, `identity`, `paths`, `errors`, `result` y `assert-never`. El plugin de ESLint solo importa esa entrada.
       - `@atium/eslint-plugin/syntax`, también interna, guarda la lógica E2E compartida. `suite-index` y `analyzers/*` solo pueden importar ese subpath del plugin.
    2. **Nombres en ESLint:** descriptivos (`atium/no-hard-wait`, etc.). El código (`E2E001`) es el ID estable. Las reglas cross-file no tienen nombre en ESLint.
    3. **Catálogo:**
       - Tabla en `docs/design/03-linter.md` §11.8.
       - La severidad del Finding sale del catálogo, no del nivel de ESLint. Los presets activan las reglas `error` como `"error"` y las `warning` e `info` como `"warn"`.
       - E2E011 y E2E013 vienen desactivadas por defecto.
       - E2E012 usa la categoría `maintainability`, porque no existe `security`.
    4. **Documentación:**
       - Páginas en inglés en `docs/rules/<código en minúsculas>.md`.
       - La tabla de equivalencias de los presets va en `docs/rules/presets.md`.
       - La URL la construye `ruleDocsUrl(code)` en `core/findings` y apunta a `https://github.com/CaDelTo/atium/blob/main/docs/rules/<código>.md`.
    5. **`atium lint`:**
       - Usa el `eslint.config.*` del usuario. Si no hay ninguno, usa el preset interno `recommended` y lo avisa por stderr.
       - Sección nueva y estricta `lint: { include, exclude }` en `atium.config`, con defaults `["."]` y `[]`. Los argumentos `[paths...]` reemplazan a `include`.
       - Los mensajes de reglas externas equivalentes (según la tabla de los presets) se convierten al código propio; los demás se ignoran. Los errores de parseo se avisan por stderr.
       - Las reglas cross-file van en `analyzers["lint-crossfile"]`, con `rules: { E2E011: "on" }`.
       - Sale con 1 si hay Findings nuevos de severidad `error`.
    6. **Contexto de los analizadores:**
       - `AnalysisContext.storage` pasa a ser opcional y solo está presente con la capacidad `history`.
       - El índice no va en el contexto: el CLI crea `createLintCrossfileAnalyzer({ index })`.
  - **Diseño y estándares actualizados:**
    - `03-linter.md`: §11.1, el ejemplo de §11.2 y las secciones nuevas §11.8 a §11.10.
    - `14-architecture.md` §22.2.
    - `15-storage.md` §23.2.2.
    - `16-repository-structure.md` §24.
    - `18-cli-config.md` §26.2 y §26.3.
    - `engineering/02-code-design.md`: tabla de capas y nombres.
    - `03-errors-logging.md`: se quitó `atium.dev` del ejemplo.
    - `07-public-api.md`: nombres de ESLint públicos, subpaths internos y alias de reglas renombradas.
    - `09-documentation.md`: ruta de las páginas.
  - **Tareas V1:**
    - v1-08 a v1-38 citan ADR-0023 o §11.8 en lugar de "v1-07"; las líneas `Depende de: v1-07` se mantienen.
    - v1-08 añade crear `@atium/core/pure` y `ruleDocsUrl`, y cambiar `atium.dev` en `packages/core/src/findings/samples.test-support.ts`.
    - v1-37 añade:
      - la sección `lint` del esquema;
      - los avisos y el `overrideConfigFile`;
      - el comentario de `gateFailed` en `packages/cli/src/exit-codes.ts`.
    - v1-38 añade los `settings.atium` por archivo para el índice.
    - v1-32 añade la clave `rules`.
    - v1-20 añade `docs/rules/presets.md`.
  - **Verificado:**
    - `pnpm verify` en verde dos veces, antes y después de las correcciones del review: core 907 tests, cli 220 y sqlite 61.
    - `/review` con code-reviewer, duplication-auditor y docs-checker, sin bloqueantes. Se corrigieron los 5 importantes y las 8 sugerencias.
    - Se descartaron:
      - repetir valores entre el ADR y el diseño (mismo patrón que ADR-0022);
      - añadir la firma `atium lint [paths...]` a §26.1 (lo hace v1-37);
      - el riesgo de I/O en `findings/` por el baseline (v1-28 solo define el esquema, y la regla de dependency-cruiser sobre `pure` lo detectaría).
- **En curso:** nada. El repo principal quedó en la rama `docs/47-linter-architecture`, ya mergeada. Esta entrada está sin commitear.
- **Decisiones:**
  - **Aprobadas por el usuario en el plan** ("Apruebo todo"):
    - las seis recomendaciones;
    - los valores del catálogo;
    - los defaults de `lint`;
    - el nombre `@atium/core/pure`;
    - actualizar las referencias de las tareas.
    Todo quedó en ADR-0023 y en el diseño.
  - **Tomadas por mí tras "Corrige todo lo que puedas" en el review**, también escritas en ADR-0023, `03-linter.md` §11.8 a §11.10 y las tareas:
    - la forma de `analyzers["lint-crossfile"].rules` (código a `"on"` u `"off"`, con los defaults del catálogo);
    - el motivo de que E2E011 y E2E013 vengan desactivadas;
    - la ubicación `docs/rules/presets.md`;
    - reexportar `errors`, `result` y `assert-never` en `pure`.
  - **No decidido:** cómo muestra el reporter de consola los hallazgos que ya están en el baseline. Quedó como "Decisión abierta" en `docs/tasks/v1-25-reporter-console.md`.
- **Problemas:**
  - **El job `audit` de CI sigue en rojo en `main`:** `shell-quote` es crítico y `source-map-js` es alto. `source-map-js` no cumple `minimumReleaseAge` hasta el 2026-10-14T14:08Z. El detalle está en `docs/tasks/v1-01-dependency-security-bump.md`.
  - **Job de Windows sin terminar:** `verify (windows-latest, Node 22)` del PR #84 no había terminado al mergear. Como el cambio es solo de docs, no se espera fallo, pero no está comprobado.
  - **Enlaces de documentación:** dan 404 mientras el repo sea privado (ADR-0023, Consecuencias).
  - **Umbral de cobertura de cli** (de la entrada de #20): sigue sin decidir si se alinea en 80 % (`04-testing.md`) o en 90 % (`vitest.config.ts`).
- **Siguiente paso:**
  1. `git fetch origin` y empezar la siguiente tarea con `/task 41` (v1-01, el issue abierto más antiguo de V1, sin dependencias).
  2. Commitear esta entrada en la rama de esa tarea.
  3. Antes del 2026-10-14T14:08Z, `source-map-js` todavía no cumple `minimumReleaseAge`; si se empieza antes, revisar el plan de v1-01.

### 2026-10-13 — #20 v0-19-v0-acceptance

- **Hecho:**
  - **Rama, PR y merge:**
    - Rama `test/20-v0-acceptance`, creada desde `origin/main` en `d2887bc`.
    - PR #40 con `Closes #20`, que el usuario ya mergeó (`5960c18`). El issue #20 está cerrado.
    - El push lo hizo esta sesión con `git -C <repo> push -u origin <rama>`. La forma `git push ... 2>&1 | tail` fue denegada dos veces.
  - **CI del PR #40:** pasan los 6 jobs `verify` (ubuntu, macos y windows, con Node 22 y 24). `audit` falla por `shell-quote`, igual que en `main`; ver Problemas.
  - **Commits:**
    - `0ce87aa` `docs(repo): add handoff entry for #19`: la entrada de #19, que estaba sin commitear al empezar.
    - `695318f` `test(cli): add the V0 acceptance test`.
    - `d0cc000` `docs(repo): add the V1 tasks from the V0 phase audit`.
    - `ab670e9` `test(core): share unwrap in @atium/core/testing`.
    - `26cb2e7` `test(cli): tighten the V0 acceptance test`.
    - `eba899d` `docs(repo): fix the references and the template of the task files`.
  - **Test de aceptación** (`packages/cli/test/v0-acceptance.test.ts`):
    - Un `it.each` recorre 6 escenarios: GitHub, GitLab, Jenkins, CircleCI, Azure y local.
    - En cada uno llama a `detectRunContext` con un `env` explícito y con `FakeGitClient`, que el escenario crea con una fábrica. Construye el run con `aRun().with(context)` y tres resultados: `passed`, `failedThenPassed` y `failedAllAttempts(2)`.
    - Escribe y lee el run con `writeRunFile` y `readRunFile`.
    - Lo escribe en SQLite, cierra, reabre y lo lee con `getRun`.
    - Compara las dos lecturas con `toStrictEqual`. Comprueba también el contexto esperado, `git.queries` (vacío en CI y `headCommit`, `currentBranch` e `isDirty` en local) y que no hay logs por encima de `debug`.
    - El `event.json` de GitHub se escribe en `<root>/runner/`.
  - **Dependencias y helpers:**
    - `@atium/storage-sqlite: workspace:*` en `devDependencies` de cli.
    - `unwrap(result)` nuevo en `packages/core/src/testing/unwrap.ts`, con su test, exportado por `@atium/core/testing` y listado en el README de core. Sustituye las copias de `test-contracts/storage.contract.ts` y `storage/sqlite/src/sqlite-storage.test.ts`.
  - **`/audit` de cierre de V0** (duplication-auditor, design-auditor y docs-checker): no hay bloqueantes. Los hallazgos son ahora 6 tareas, listadas en una tabla nueva de la sección V1 de `docs/tasks/README.md`, sin issue:
    - `v1-01-dependency-security-bump`
    - `v1-02-shared-fs-and-path-helpers`
    - `v1-03-run-file-defaults`
    - `v1-04-run-context-robustness`
    - `v1-05-design-alignment`
    - `v1-06-core-api-docs`
  - **Plantilla de `docs/tasks/README.md`:** se añadieron `ID`, `Origen` (opcional) y la sección opcional "Decisiones abiertas en esta tarea".
  - **`v0-19-v0-acceptance.md`:** se aclaró que "6 entornos" es la matriz de CI, y que el test cubre los 5 proveedores y el run local.
  - **Comprobado en GitHub:** los issues #5–#19 están cerrados. v0-01 a v0-03 no tienen issue y son Hechas; #2 y #3 son PR mergeados.
  - **Verificado:**
    - `pnpm verify` local en verde: core 907 tests, sqlite 61 y cli 220.
    - Cobertura, con umbral de 90 % en todo:

      | Paquete | Líneas | Ramas | Funciones |
      |---|---|---|---|
      | core | 99,1 % | 96,3 % | 100 % |
      | sqlite | 96,1 % | 94,4 % | 93,75 % |
      | cli | 98 % | 96,6 % | 100 % |

    - `/review` con 5 agentes, sin bloqueantes. Se corrigieron los 2 importantes (la copia de `unwrap` y una cita de ADR-0018 en v1-05) y las 5 sugerencias. Se descartaron 2 hallazgos falsos.
    - Benchmark: `atium --help` tarda 61,7 ms (presupuesto: 300 ms) y no carga SQLite.
    - Tras el merge, probado a mano en un repo temporal: `init` y `doctor` dan los 6 checks en `pass`, `--format json` funciona y un GitHub Actions simulado se detecta. El config generado necesita `@atium/core` en `node_modules`; como no está publicado, se enlazó con un symlink a `packages/core`.
- **En curso:** nada. El repo principal quedó en `main`, en `5960c18`. Esta entrada está sin commitear.
- **Decisiones:**
  - **Aprobadas en el plan ("Si"):**
    - `FakeGitClient` también en el caso local, sin Git real.
    - Los hallazgos del audit van a V1.
    - No hubo bloqueantes que dejar en V0.
  - **Tomadas por mí, porque el usuario no respondió esas dudas del plan:**
    - No se crearon issues para las tareas v1-01 a v1-06; los crea `/plan-phase v1`. Está escrito en `docs/tasks/README.md`.
    - El umbral de cobertura de cli se dejó en 90 %, aunque `docs/engineering/04-testing.md` dice 80 % para "resto". **No quedó escrito en ningún sitio.**
  - **Con "Recomienda todo lo que puedas" tras `/review`:** lo interpreté como corregir todo. La extracción de `unwrap` tocó dos tests existentes sin cambiar ninguna aserción, y el hook `test-guard` no bloqueó.
  - **Sin tarea:** el resumen de errores internos de ADR-0006 no se convirtió en tarea, porque es una funcionalidad y no un hallazgo del audit. Queda para `/plan-phase v1`. §26.1 sigue diciendo "Ninguna tarea lo recoge todavía".
- **Problemas:**
  - **El job `audit` de CI sigue en rojo en `main`:**
    - `shell-quote` es crítico.
    - `source-map-js` es alto y no cumple `minimumReleaseAge` hasta el 2026-10-14T14:08Z.
    - Hay dos avisos de `esbuild`.
    - El detalle y el plan están en `docs/tasks/v1-01-dependency-security-bump.md`.
  - **V0 no muestra nada útil al usuario final más allá de `init` y `doctor`.** El `atium.config.ts` que genera `init` importa `@atium/core`, que no se puede instalar desde npm porque el paquete es privado. `doctor` da `fail` en `config` hasta que existe ese paquete. Es lo esperado en V0, pero conviene tenerlo en cuenta en la tarea de publicación.
  - **Fecha de las tareas del audit:** son de 2026-10-13. Sus números de línea pueden desplazarse si cambia el código antes de trabajarlas.
- **Siguiente paso:**
  1. Commitear esta entrada en la rama de la próxima tarea.
  2. Ejecutar `/plan-phase v1`. Debe integrar las 6 tareas v1-01 a v1-06 que ya existen, sin renumerarlas, y crear sus issues junto con los del linter.
  3. Decidir en ese plan la fase de la tarea del resumen de errores internos de ADR-0006.
  4. Preguntar al usuario si alinea el umbral de cobertura de cli en `04-testing.md` (80 %) o en `vitest.config.ts` (90 %).

### 2026-10-13 — #19 v0-18-doctor

- **Hecho:**
  - **Rama y PR:** rama `feat/19-doctor`, creada desde `origin/main` en `2cd7620`. PR #39 abierto con `Closes #19`, sin mergear. Los push los hizo el usuario con `! git push`.
  - **CI del PR #39 en `518c2b2`:** pasan los 6 jobs `verify` (ubuntu, macos y windows, con Node 22 y 24). `audit` falla por `shell-quote`; ver Problemas.
  - **Commits:**
    - `e1d01cf` `docs(repo): add handoff entry for #18`.
    - `a7ea23f` `feat(cli): add the doctor command`.
    - `c2a8141` `fix(repo): stop passing --coverage twice in test:coverage`.
    - `44233dc` `test(cli): run the doctor storage symlink tests on Windows`.
    - `518c2b2` `fix(cli): leave no git process running after the doctor git check`.
  - **Orquestación:** `src/commands/doctor.ts` es la definición ligera e importa `../doctor/run-doctor.js` con `await import`. `src/doctor/run-doctor.ts` contiene `runDoctor` y `diagnose`:
    - valida `--format` (`text|json`) antes de comprobar nada;
    - ejecuta los checks;
    - redacta el informe completo con `createCliRedactor().redactFields(...)` y lo valida con `DoctorReportSchema.parse`;
    - si algún check falla, escribe el informe y después lanza `UsageError`, que da el código 2. Así no cambia la interfaz `CliCommand`.
  - **Checks**, en `src/doctor/checks/`:
    - `node.ts`: `parseVersion` y `compareVersions`; una prerelease cuenta como anterior a su versión final. Exige `MIN_NODE_VERSION = "22.12.0"`.
    - `config.ts`: `loadConfig` con `--config` y el nivel de log del flag.
    - `git.ts`: consultas en serie; falla solo si `needed`, y si no, da `warn` con `DOCTOR.git.notNeededHint`.
    - `ci.ts`: devuelve `{ check, needsGit }`, donde `needsGit` es `true` solo con `GIT_UNAVAILABLE`.
    - `storage.ts`: `lstat` y `realpath`; prueba de escritura con `mkdtemp` y `rm`; no crea `.atium` ni abre SQLite.
    - `frameworks.ts`.
    - `error-outcome.ts`: helper compartido por config, git y ci.
  - **Salida:** `report.ts` contiene el esquema Zod, que exige los 6 ids en orden y un hint en todo lo que no sea `pass`. `format-text.ts` arma la tabla.
  - **Refactor en `src/project/`:**
    - `detect-frameworks.*` y `project-files.*` se movieron sin cambios desde `src/init/`, con sus tests. El usuario ejecutó el movimiento porque el hook `test-guard` lo bloqueaba.
    - Nuevo `manifest.ts` con `readProjectManifest` y `manifestProblem`, que comparten init y doctor.
    - En `messages.ts`, los textos de `package.json` pasaron de `INIT` a un grupo `MANIFEST`.
  - **Defaults y messages:**
    - `defaults.ts`: `MIN_NODE_VERSION`, `ATIUM_DIRECTORY` y `DOCTOR_FORMATS`.
    - `messages.ts`: `HELP.doctor`, `DOCTOR` y el helper `quotedNames`.
  - **Tests:**
    - Helper `test/temp-dir.ts` (`useTempDir`), con `maxRetries` en `rm` para el `EBUSY` de Windows.
    - Tests de aceptación en `run-doctor.test.ts`: proyecto sano, config inválida, sin Git, sin permisos, JSON validado con el esquema y redacción en JSON. Usan Git real con `GIT_CEILING_DIRECTORIES` vía `vi.stubEnv`.
    - En Windows, los symlinks de directorio son junctions.
    - Se añadió `fast-check@4.10.2` como devDependency de cli.
  - **Docs:**
    - `18-cli-config.md` §26.1: bloque `atium doctor` con la tabla de checks, y la línea 11.
    - `18-cli-config.md` §26.2: el código 2 de doctor.
    - `15-storage.md`: en el CLI, la raíz es el directorio de trabajo.
    - `07-public-api.md`: el JSON de doctor es interno.
    - `10-tooling.md`: `test:coverage` es un alias.
    - README de cli.
  - **Verificado:**
    - `pnpm verify` local en verde con Node 22: core 905 tests, sqlite 61, cli 214. Cobertura de cli: 98 % de líneas y 96,6 % de ramas.
    - `/review` con 6 agentes, sin bloqueantes. Se corrigieron los 7 importantes y casi todas las sugerencias.
    - Medición de `atium --help`: main 83 ms y esta rama 61–67 ms, con la máquina cargada. No carga core ni doctor. `doctor` tarda unos 310 ms.
- **En curso:** nada. El PR #39 espera la revisión y el merge del usuario.
- **Decisiones:**
  - **Aprobadas en el plan ("Si") y escritas en §26.1 y §26.2:**
    - Código de salida 2 si algún check falla; `warn` no afecta al código.
    - `storage` solo prueba la escritura y no abre SQLite.
    - `MIN_NODE_VERSION` es 22.12.0.
    - Sin config, el check da `warn`.
    - El JSON de doctor no es API pública y no lleva `schemaVersion`.
  - **Aprobada tras `/review` (opción "a" del punto 7):** en el CLI, la raíz de `.atium/` es el directorio de trabajo. Escrita en §26.1, `15-storage.md` y `defaults.ts`.
  - **Tomadas por mí durante `/review` con "Corrige todo", escritas en §26.1 y el README:**
    - Se redacta todo el informe, incluido `details`.
    - `.atium` como symlink: se resuelve con `realpath`; da `fail` si está roto, si lleva fuera del directorio de trabajo o si lleva a él mismo.
    - `git` da `fail` solo si `ci` falló con `GIT_UNAVAILABLE`.
    - El esquema exige orden y unicidad de los checks.
  - **Tomadas por mí, solo en el código y en commits:**
    - `UsageError` en lugar de cambiar `CliCommand.run`, para no tocar los tests de `run.test.ts`.
    - Consultas de Git en serie en `checkGit`.
  - **Sin cambios, con justificación:**
    - `displayPath` sigue duplicado con el privado de `load-config.ts`, porque unificarlo requiere ampliar la API de core.
    - `errnoCode` e `isMissing` duplican core desde #18.
  - **No quedó escrito en ninguna tarea ni ADR:** el resumen de errores internos que menciona ADR-0006. §26.1 dice "Ninguna tarea lo recoge todavía"; falta que el usuario decida la fase.
- **Problemas:**
  - **`audit` falla en CI**, también en `main` desde #36:
    - `shell-quote` (crítico), vía `@changesets/cli` y `launch-editor`; la 1.11.0 ya cumple el `minimumReleaseAge`.
    - `source-map-js` (alto), vía vite y postcss; la 1.2.2 no lo cumple hasta el 2026-10-14T14:08Z.
    - `esbuild` (bajo): 0.27.7 vía vite; se arregla con 0.28.1 o posterior.
    - `esbuild` (moderado): 0.18.20 vía `drizzle-kit` y `@esbuild-kit/core-utils`. Forzarlo con un override puede romper `drizzle-kit`.
    - Hace falta un issue y una rama aparte; el usuario no lo ha pedido aún.
  - **`detectRunContext` (core)** lanza `headCommit`, `currentBranch` e `isDirty` con `Promise.all`. En Windows puede dejar procesos `git` vivos que bloquean el directorio, como pasó en `checkGit`. Propuesto como mejora; no está en ninguna tarea.
  - **Hook `test-guard`:**
    - Bloqueó el movimiento de tests a `src/project/`; lo ejecutó el usuario con su aprobación.
    - Bloqueó también una reescritura de `git.test.ts` que quitaba una aserción. Se rehízo con ediciones mínimas que conservan todas las aserciones.
    - Dio un falso positivo al escribir este handoff con un heredoc en bash, porque el texto mencionaba ese movimiento. Con aprobación del usuario se escribió con Write y Edit.
  - **Commit del movimiento:** no se pudo hacer aparte de `a7ea23f`. El lint de lefthook revisa el commit intermedio contra el `messages.ts` del working tree y falla.
  - **Flake de CI en Windows con Node 22:** la descarga del binario de `better-sqlite3` se cortó (`TypeError: terminated`), pasó a `node-gyp` y falló. Se resolvió volviendo a lanzar el job.
  - **Tamaño del PR #39:** unas 2.550 líneas, por encima de las 400 de `08-git-workflow.md`, igual que #38. Está indicado en el PR.
  - **Push:** esta sesión no puede hacer `git push`; lo hace el usuario.
- **Siguiente paso:**
  1. Cuando el usuario mergee #39: commitear este handoff en la rama de la próxima tarea y ejecutar `/task` con el siguiente issue abierto del milestone V0 que tenga las dependencias cerradas.
  2. Preguntar al usuario si crea el issue del bump de dependencias (`shell-quote`, `source-map-js` y `esbuild`) y trabajarlo después del 2026-10-14T14:08Z, para incluir `source-map-js`.
  3. Preguntar en qué fase va la tarea del resumen de errores internos (ADR-0006) y la de `detectRunContext` sin `Promise.all`.

### 2026-10-12 — #18 v0-17-cli-skeleton

- **Hecho:**
  - Rama `feat/18-cli-skeleton`, desde `origin/main` en `ae7dd27`. El push lo hizo el usuario con `! git push -u origin feat/18-cli-skeleton`. PR #38 con `Closes #18`, abierto; sin mergear al cerrar la sesión.
  - Commit `1d68c8b` `docs(repo): add handoff entry for #17`: la entrada de #17 que estaba sin commitear al empezar.
  - Commit `fcf4a78` `feat(core): export the config file names`: `CONFIG_FILE_NAMES` exportado desde `packages/core/src/index.ts` y listado en el README de core.
  - Commit `96ddb2d` `feat(cli): add the CLI base and the init command`. Paquete privado `@atium/cli` en `packages/cli/`:
    - Configuración: `commander@15.0.0` y `zod@4.6.5`, `engines >=22.12` (lo exige Commander 15), solo ESM, `bin: atium` → `dist/bin.js` y `exports` solo con `./package.json`. tsup con un único entry, `splitting` y shebang; `pkg:check` es solo `publint`.
    - `src/run.ts`: `run({ argv, cwd, env, stdout, stderr, commands? })` devuelve el código de salida; `commands` es inyectable para los tests.
    - Errores de Commander: con `exitOverride`, su código 0 se mantiene y cualquier otro se convierte en 2. Su `writeErr` pasa por `terminalText`.
    - `reportFailure`: si `report-error.js` no se puede importar o falla, escribe un aviso mínimo y devuelve 0, o 3 con `--strict`.
    - `src/report-error.ts`: un error de usuario se escribe como mensaje más `  Hint: ...`, redactado con `createCliRedactor()` y escapado con `terminalText`; si stderr falla, el error se ignora y se devuelve 2 igualmente. Un error interno se registra con `logger.error` y el contexto `{ error }`.
    - `src/error-kind.ts`: `isUserError` (`UsageError`, o `CONFIG_INVALID`/`CONFIG_NOT_FOUND`, con `switch` exhaustivo sobre `ErrorCode`) y `exitCodeFor`.
    - `src/exit-codes.ts`: `EXIT_CODES` (0, 1, 2, 3).
    - `src/global-options.ts`: las 7 opciones; `--quiet` y `--verbose` declaradas con `.conflicts`.
    - `src/command-context.ts`: `createCommandContext`, `createCliLogger` y `createCliRedactor` (redacción por defecto).
    - `src/terminal-text.ts`: escapa C0, DEL, C1, U+2028/2029 y los caracteres bidi, salvo `\n` y `\t`.
    - `src/messages.ts`: todos los textos, con TSDoc. `src/defaults.ts`: `LOG_NAMESPACE`, `INIT_CONFIG_FILE`, `FRAMEWORK_PACKAGES`, `CONFIG_PACKAGE` y `MANIFEST_MAX_BYTES` (1 MiB).
    - `src/commands/`: interfaz `CliCommand` y `initCommand`, que carga `../init/run-init.js` con `await import`.
    - `src/init/run-init.ts`: orquesta `init`. `src/init/project-files.ts`: `entryKind` (`lstat`), `isRegularFile` (`stat`, igual que `loadConfig`), `readCapped`, `createFile` (`wx`), `replaceFile` (`mkdtemp` junto al archivo y `rename`) y `errnoCode`. `src/init/detect-frameworks.ts` (Zod `looseObject`) y `src/init/config-template.ts`.
    - Tests: 9 archivos y 130 tests, entre ellos `bin.test.ts`, que ejecuta `dist/bin.js`. Benchmark en `bench/help.bench.ts`. `coverage` excluye `src/bin.ts`.
    - `turbo.json`: `@atium/cli#test` y `@atium/cli#bench` dependen también de su propio `build`.
    - Docs:
      - `18-cli-config.md` §26.1: opciones globales y comportamiento de `init`.
      - `18-cli-config.md` §26.2: clasificación de errores, redacción y escape, fallback del reporte y `atium` sin comando, que sale con 2.
      - `18-cli-config.md` §26.3: tabla del nivel de log.
      - `03-errors-logging.md` (nivel de log y salida del CLI), `05-performance.md` (el presupuesto se mide sobre la media), `07-public-api.md` (excepción del CLI sin `src/index.ts`), `10-tooling.md` (`pkg:check` y turbo).
      - ADR-0022: nota posterior sobre `--quiet`.
      - READMEs de cli y core.
  - Verificado:
    - `pnpm verify` local en verde: 1.096 tests (905 de core, 61 de sqlite, 130 de cli); cli con 98 % de líneas y 95,5 % de ramas. `pkg:check` pasa.
    - Benchmark: `atium --help` tarda 41 ms de media y 51 ms en p99 (presupuesto: 300 ms) y no carga `@atium/core`. `init` tarda unos 72 ms.
    - `/review` con 6 agentes. Bloqueante corregido: el código 1 cuando falla el reporte. Importantes corregidos:
      - errores de usuario sin redactar ni escapar;
      - lectura de `package.json` sin tope;
      - `lstat` frente al `stat` de `loadConfig`;
      - `--force` no atómico.
    - Sugerencias aplicadas: TSDoc de `messages.ts`, literales sustituidos por `CONFIG_PACKAGE` y `EXIT_CODES`, fuente de `FRAMEWORK_PACKAGES`, `sideEffects` eliminado, documentación, aviso de `package.json` solo con el código de error y aviso de `ATIUM_CONFIG`.
    - CI del PR #38: estaba en `pending` al cerrar la sesión; no se vio el resultado.
- **En curso:** nada. El PR #38 espera CI y la revisión del usuario.
- **Decisiones:**
  - Aprobadas por el usuario en el plan ("Si") y escritas en §26.1:
    - `--quiet` → `error`.
    - `--format`, `--output` y `--ci` llegan tipadas a los comandos, sin validar ni usar en V0.
    - `init --config` es un error de uso (2).
    - `--force` con otro `atium.config.*` existente es un error de uso (2).
    - La detección usa `@playwright/test`, `playwright` y `cypress`.
    - Export de `CONFIG_FILE_NAMES` **sin ADR**: queda en el README de core, no en un ADR.
  - Tomada tras `/review` con "Arregla todo lo que puedas": tope de 1 MiB para `package.json` (`MANIFEST_MAX_BYTES`). El diseño no lo definía; lo propuse yo y el usuario no confirmó el valor de forma explícita. Escrito en §26.1 y `defaults.ts`.
  - Tomadas por mí y documentadas en §26.1, §26.2, `05-performance.md` y el README de cli:
    - `UsageError` es interna del CLI; no se añadió un `ErrorCode` público.
    - `init` no carga la config ni lee `ATIUM_LOG_LEVEL`.
    - Un error de I/O en `init` es interno, no `CONFIG_NOT_FOUND`.
    - `atium` sin comando sale con 2.
    - El benchmark compara la media.
    - `engines >=22.12` en cli.
  - Sin changeset: los paquetes son `private`.
- **Problemas:**
  - `audit` seguirá fallando en CI por `shell-quote` y `source-map-js` (problema conocido; el bump es posible desde el 2026-10-14T14:08Z).
  - Pendientes sin cambio:
    - Construir el logger con el `redact` de la config cuando un comando cargue la config.
    - Validar `--output` con `resolveInside` cuando algún comando lo use.
    - Base compartida de `vitest.config` (ya hay tres copias; jscpd marca el clon core/sqlite).
  - Los tests de symlinks y permisos de cli se saltan en Windows. La cobertura de ramas local es 95,5 %, pero no se ha visto la de Windows en CI.
  - Esta sesión no puede hacer `git push`; lo hace el usuario con `! git push`.
- **Siguiente paso:**
  1. Revisar el CI del PR #38 (`gh pr checks 38`), sobre todo `verify` en Windows y la cobertura de cli. Si falla, arreglarlo en `feat/18-cli-skeleton`.
  2. Cuando el usuario mergee #38: commitear este handoff en la rama de la próxima tarea y ejecutar `/task 19` (v0-18, comando `doctor`).
  3. A partir del 2026-10-14T14:08Z, proponer un PR aparte que suba `shell-quote` y `source-map-js`.

### 2026-10-12 — #17 v0-16-storage-sqlite

- **Hecho:**
  - Rama `feat/17-storage-sqlite`, desde `origin/main` en `abaf852`. El push lo hizo el usuario con `! git push`. PR #37 con `Closes #17`, mergeado por el usuario (merge `ae7dd27`); el issue #17 quedó cerrado.
  - Commit `cc42eb0` `feat(core): share the storage contract and query checks with backends`:
    - `packages/core/src/storage/list-runs-query.ts`: `parseListRunsQuery(query)` exportada (devuelve `ParsedListRunsQuery` `{ branch?, sinceMs?, limit }` o lanza `RangeError`); `runSelector` la usa. Tests en `list-runs-query.test.ts`.
    - `@atium/core` exporta además `describeIssues` y `quoteForMessage`; `@atium/core/testing` exporta `FIXED_START` y `fixedTimePlus`.
    - Subpath `@atium/core/test-contracts` (solo ESM, entrada en `tsup.config.ts` con `external: ["vitest"]`, excluido de attw con `--exclude-entrypoints`). Documentado como interno en `07-public-api.md`.
  - Commit `f7604d8` `feat(storage-sqlite): add the local SQLite storage backend`: paquete privado `@atium/storage-sqlite` en `packages/storage/sqlite/`:
    - better-sqlite3 13.0.3, drizzle-orm 0.45.3, drizzle-kit 0.31.11 (dev), fast-check (dev). `better-sqlite3: true` en `allowBuilds` de `pnpm-workspace.yaml`.
    - `src/schema.ts`: tablas `runs`, `test_cases`, `test_results`, `attempts`, `errors` con los índices de §23.6. Migración generada en `drizzle/0000_initial.sql` (ignorada por Prettier); se aplica al abrir.
    - `src/database-file.ts`: `prepareDatabaseFile` (ruta dentro de `rootDir` también tras `realpath`, rechaza symlinks, crea el archivo con `O_NOFOLLOW` y modo 0600, directorio 0700).
    - `src/sqlite-storage.ts`: `openSqliteStorage({ rootDir, path?, logger })`. WAL (avisa por logger si no se puede), `foreign_keys`, `busy_timeout` 5000 ms, escrituras en transacción `IMMEDIATE` con sentencias preparadas, validación con `RunSchema` al escribir y al leer (`MODEL_INVALID`), `close` idempotente que nunca lanza.
    - `src/run-rows.ts`, `src/statements.ts`, `src/invalid-run.ts`, `src/defaults.ts` (`SQLITE_DATABASE_PATH`, `SQLITE_BUSY_TIMEOUT_MS`, `SQLITE_FILE_MODE`, `SQLITE_DIRECTORY_MODE`).
    - Tests: contrato de storage + casos propios (permisos, symlinks, base dañada, ids repetidos, round trip estricto, property-based de campos opcionales). Benchmark `bench/write-run.bench.ts`.
    - Docs: `15-storage.md` §23.2.2 y §23.6 completa, `04-testing.md`, `06-security.md`, `07-public-api.md`, `10-tooling.md`, `16-repository-structure.md`, README de core y del paquete.
  - Commit `a7fffe9` `build(repo): build workspace packages before linting`: el script `lint` raíz es `turbo run build && eslint .`, porque en CI el checkout limpio no tiene `dist/` y el lint con tipos fallaba en los tres sistemas.
  - Commit `ef8b772` `test(storage-sqlite): cover symlinks and read failures on every platform`: en Windows la cobertura de ramas bajaba a 88,76 % porque se saltaban los tests de symlinks; ahora el de directorio usa una junction, el de archivo se salta en tiempo de ejecución si da `EPERM`, y hay tres tests más.
  - Verificado:
    - `pnpm verify` local en verde; 61 tests en el paquete, 94,38 % de ramas.
    - Benchmark: escribir un run de 1.000 tests tarda 29–76 ms de media (presupuesto 1 s); 5.000 tests, 217–335 ms.
    - `/review` con los 6 agentes: sin bloqueantes. Se corrigieron los importantes (symlinks, mensajes que podían filtrar texto de JSON o Zod, rutas largas con `quoteForMessage`, docs) a petición del usuario.
    - CI del PR #37: `verify` pasa en ubuntu, macos y windows con Node 22 y 24. `audit` falla por el problema conocido (ver Problemas); el usuario mergeó igualmente, como con el PR #36.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan ("Apruebo todo y las sugerencias que me diste en las dudas"):
    - Nuevos exports de core (`parseListRunsQuery`, `ParsedListRunsQuery`, `describeIssues`, `quoteForMessage`, `FIXED_START`, `fixedTimePlus`, subpath `test-contracts`) **sin ADR**. Quedaron en `07-public-api.md` y en el README de core, pero no en un ADR.
    - `logger` es obligatorio en `OpenSqliteStorageOptions`: escrito en el README del paquete y en §23.6.
    - `SQLITE_DIRECTORY_MODE = 0o700`: valor no definido antes en el diseño; ahora está en §23.6 y `defaults.ts`.
  - Tomadas tras `/review` ("Lo que tanto tu como los otros agentes consideren mejor"):
    - Se mantiene `better-sqlite3: true` en `allowBuilds` (la tarea lo exige y pnpm ejecuta node-gyp de todas formas; solo compila sin prebuild). Escrito en `06-security.md`.
    - `detail_truncated` es un entero plano (no booleano de Drizzle) porque Drizzle convierte NULL en `false` y rompía el round trip. Escrito en §23.6.
  - Cambio del script `lint` raíz: escrito en `10-tooling.md`.
  - Sin changeset: los paquetes son `private`.
- **Problemas:**
  - `audit` falla en CI por advisories preexistentes: `shell-quote` crítica (vía `@changesets/cli` > `launch-editor`) y `source-map-js` alta (vía tsup/vitest/postcss). `06-security.md` dice que una advisory alta o crítica bloquea el merge; los PR #36 y #37 se mergearon como excepción. El bump solo es posible desde el 2026-10-14T14:08Z por `minimumReleaseAge`.
  - Pendientes sin test ni decisión:
    - La carrera entre procesos al abrir (dos `migrate` a la vez) y la transacción `IMMEDIATE` entre procesos no tienen test.
    - Las ramas de aviso de WAL no disponible y de fallo al cerrar no tienen test.
    - `atium stress --repeat-each` produciría `testId` repetidos en un run, que SQLite rechaza con `MODEL_INVALID`; falta decidir el modelo (abierto en §23.6).
    - `closedError` y el modo 0600 están duplicados entre run files y SQLite.
    - `listRuns` lee cada run con varias consultas (N+1); no hay benchmark de lectura.
  - En local, `pnpm verify` desde limpio tuvo timeouts en tests de core con la máquina muy cargada (load ~13); pasan solos y en CI.
  - Esta sesión no puede hacer `git push`; lo hace el usuario con `! git push`.
- **Siguiente paso:**
  1. Commitear este handoff (`docs/progress.md` y `docs/progress-archive.md`) en la rama de la próxima tarea.
  2. Ejecutar `/task 18` (v0-17-cli-skeleton, que depende de v0-12, ya cerrada).
  3. A partir del 2026-10-14T14:08Z, proponer al usuario un PR aparte que suba `shell-quote` y `source-map-js` para que `audit` vuelva a pasar.

### 2026-10-12 — #16 v0-15-storage-contract

- **Hecho:**
  - Rama `feat/16-storage-contract`, creada desde `origin/main` en `b91646a` (ya incluye el merge del PR #35). El push lo hizo el usuario con `! git push -u origin feat/16-storage-contract`. PR #36 abierto con `Closes #16`, sin mergear.
  - Commit `aa2892b` `docs(repo): add handoff entry for #15`: el handoff de #15 que estaba sin commitear.
  - Commit `23b5ee3` `feat(core): add storage interfaces, contract suite and in-memory fake`:
    - `packages/core/src/storage/storage.ts`: interfaces `StorageReader` (`getRun`, `listRuns`), `StorageWriter` (`writeRun`), `Storage` (los dos lados más `close`) y `ListRunsQuery`. Se exportan como tipos desde `@atium/core`.
    - `packages/core/src/storage/list-runs-query.ts`: `runSelector(query)`, interna de core. Valida la consulta (lanza `RangeError`) y devuelve la función que filtra, ordena y aplica `limit`. Valida `since` con `z.iso.datetime({ offset: true })` y calcula `Date.parse` una vez por run.
    - `packages/core/src/testing/in-memory-storage.ts`: `InMemoryStorage`, exportado desde `@atium/core/testing`.
      - Copia con `structuredClone` al escribir y al leer.
      - Usa el helper privado `#whenOpen`, que cede una vez (`await Promise.resolve()`) y comprueba si está cerrado.
      - `listRuns` valida la consulta antes de ceder.
    - `packages/core/test-contracts/storage.contract.ts`: `storageContract(create)` con 28 casos, divididos en `describeWriteAndGet`, `describeListRunsOrder`, `describeListRunsFilters`, `describeListRunsInvalidQuery`, `describeConcurrency` y `describeClose`. Importa de `../src/...` con rutas relativas.
    - `packages/core/src/testing/in-memory-storage.test.ts`: ejecuta el contrato contra el fake y comprueba que dos instancias no comparten runs.
    - `packages/core/tsconfig.json`: `include` con `test-contracts`. `eslint.config.js` no cambia: el lint pasa sin overrides para esa carpeta.
    - Docs:
      - `docs/design/15-storage.md` §23.2.2 "Interfaces", nueva.
      - `docs/design/16-repository-structure.md`: añade `test-contracts/`.
      - `docs/engineering/04-testing.md`: corrige el ejemplo del contrato y la línea de `InMemoryStorage`.
      - README de core.
  - Verificado:
    - `pnpm verify` sale con 0: 894 tests. Core tiene un 99,12 % de líneas y un 96,29 % de ramas. `in-memory-storage.ts` tiene el 100 %; en `list-runs-query.ts` solo queda sin cubrir la línea 70 (`return 0` con ids iguales, que no se da).
    - Cinco mutaciones del fake rompen el contrato: `since` exclusivo, empate por id ascendente, guardar sin copiar, aceptar ids repetidos y `Date.parse` sin validar ISO.
    - Calculé los ids de las semillas 1, 2 y 3: en orden descendente quedan 2, 3, 1, así que el test de empate distingue el orden de inserción, el inverso y el ascendente.
    - `/review` con code-reviewer, duplication-auditor y docs-checker (security, design y perf no aplicaban por las rutas):
      - Sin bloqueantes.
      - Se corrigió el importante: `since` aceptaba fechas no ISO y fechas sin zona, que dependen de la zona horaria de la máquina.
      - Se corrigieron todas las sugerencias a petición del usuario ("Corrige todo").
    - CI del PR #36 al cerrar: `verify` pasa en ubuntu, macos y windows con Node 22 y 24. `audit` falla por el problema conocido.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan ("Si, aprobados"):
    - Orden de `listRuns`: `startedAt` descendente y, en empate, `id` descendente.
    - `since`: ISO 8601 e inclusivo.
    - `branch`: coincidencia exacta; los runs sin rama se excluyen.
    - `limit`: obligatorio, entero ≥ 1; un `limit` o un `since` inválidos lanzan `RangeError`.
    - Después de `close`, todo devuelve `STORAGE_UNAVAILABLE`.
    - Un run inexistente es `ok(undefined)`; no hay códigos de error nuevos.
    - `close` solo está en `Storage`.
  - Tomadas tras `/review`, aprobadas con "Corrige todo":
    - `since` exige `Z` o un offset.
    - Una consulta inválida lanza `RangeError` aunque el storage esté cerrado.
    - El máximo de `limit` es `Number.MAX_SAFE_INTEGER`.
  - Todas quedaron escritas en `15-storage.md` §23.2.2 y en el TSDoc de `storage.ts`. No hay ADR nuevo.
  - Sin changeset porque `@atium/core` es `private`.
- **Problemas:**
  - El hook `test-guard` bloqueó un comando que creaba y borraba un `.test.ts` temporal en el scratchpad para imprimir ids. No se creó nada; los ids se calcularon con `node -e`.
  - Deuda para v0-16 (SQLite) y los backends de archivos: el `writeRunFile` de #15 comprueba con `lstat` y luego hace `rename`. Un backend de archivos podría fallar el caso "accepts exactly one of several concurrent writes of the same id". No se relajó el contrato.
  - Los backends de `packages/storage/*` no pueden importar `test-contracts/` con rutas relativas a `../src`. Hará falta exponer el contrato por nombre de paquete (por ejemplo `@atium/core/test-contracts`) y cambiar sus imports. No está decidido.
  - Esta sesión no puede hacer `git push`; lo hace el usuario con `! git push`.
- **Siguiente paso:**
  1. Commitear este handoff (`docs/progress.md` y `docs/progress-archive.md`) en la rama de la próxima tarea.
  2. Cuando una persona mergee el PR #36, ejecutar `/task 17` (v0-16-storage-sqlite, que depende de v0-15). Antes, decidir con el usuario cómo importa el paquete de SQLite la suite de contrato.
  3. Si el PR #36 sigue sin mergear, la siguiente tarea disponible es #18 (v0-17-cli-skeleton, que depende de v0-12, ya cerrada).

### 2026-10-12 — #15 v0-14-run-files

- **Hecho:**
  - Rama `feat/15-run-files`, creada desde `origin/main` en `d3651bd` (ya incluye el merge del PR #34). El push lo hizo el usuario con `! git push -u origin feat/15-run-files`. PR #35 abierto con `Closes #15`, sin mergear.
  - Commit `4cd34b1` `docs(repo): add handoff entry for #14`: el handoff de #14 que estaba sin commitear.
  - Commit `e392dc3` `feat(core): write and read run files`, en `packages/core/src/`:
    - `storage/select.ts`: `keepFirst`, `keepLast`, `keepFirstAndLast` y `keepRanked`. Los cuatro devuelven `{ items, dropped }` con los elementos en su orden original; en `keepRanked`, un empate lo gana el índice menor.
    - `storage/cap-run.ts`: `capTestResult`, `capRunHeader` y `bddReferenceIndex`.
      - Quita ANSI con `util.stripVTControlCharacters` de `message`, `stack`, las muestras de consola y `pageErrors`.
      - Aplica todos los topes de listas y de textos de ADR-0018 con `truncateUtf8` y suma los conteos `*Dropped`.
      - No toca el `testId`.
    - `storage/fit-line.ts`: `fitTestResultLine(result, { targetBytes?, maxBytes? })`.
      - Aplica los pasos 1 a 5 de la garantía final de ADR-0018 y vuelve a medir tras cada uno.
      - Si después del paso 5 la línea sigue por encima de 1 MiB, lanza un `Error` (bug).
    - `storage/line-reader.ts`: `splitLines(chunks, limits)`. Divide sobre bytes y comprueba los límites de línea 1, de las demás líneas y del total antes de juntar la línea. Decodifica UTF-8 en modo `fatal` y emite eventos `line`, `exceeded` e `invalidUtf8`.
    - `storage/run-file-format.ts`: `RunHeaderSchema` (privado), `RUN_FILE_SCHEMAS` (mapa versión → esquemas; hoy solo la 1), `CURRENT_RUN_FILE_SCHEMAS` y `SchemaVersionProbe`.
    - `storage/run-file-reader.ts`:
      - `readRunFileEntries(file)`: generador que entrega el encabezado y luego cada resultado con su número de línea.
      - `readRunFile(file)`: devuelve el `Run` completo.
      - `readRunFileEntriesWithin(file, limits)`: interna, para que los tests usen límites pequeños.
      - Errores: `STORAGE_UNAVAILABLE` para E/S. `MODEL_INVALID` para gzip `Z_*`, UTF-8, JSON, esquema, límite, versión o archivo vacío.
      - Ni el `ZodError` ni el error de `JSON.parse` se adjuntan como `cause`.
    - `storage/run-file-writer.ts`:
      - `writeRunFile(run, { rootDir, logger })` escribe en `<rootDir>/.atium/runs/<runId>.ndjson.gz`. `runFilePath` construye esa ruta. `writeRunFileWith(run, options, remove)` es interna y permite inyectar el borrado del temporal.
      - Valida el encabezado antes de tocar el disco y hace streaming de gzip a `.tmp-*/` con `mkdtemp`, `flags: "wx"`, `flush` y `mode: 0o600`.
      - Antes de publicar comprueba con `lstat` si el destino existe (si existe, `STORAGE_CONFLICT`) y luego hace `rename`.
      - El borrado del temporal es best-effort, con `maxRetries: 3`; si falla, avisa en el `logger`.
    - `errno.ts` (`errnoCode`) y `zod-issues.ts` (`describeIssues`: cita y recorta la ruta y el mensaje, y muestra como mucho `ZOD_ISSUES_SHOWN` problemas). Ahora los usan también `config/config-file.ts` y `ci/detect-run-context.ts`.
    - `defaults.ts`: `RUN_FILE_READ_LIMITS` (64 KiB, 1 MiB, 256 MiB), `RUN_FILE_LINE_TARGET_BYTES` (768 KiB), `BDD_TRUNCATION_WINDOW_STEPS` (10), `RUNS_DIRECTORY` (`.atium/runs`), `ENDPOINT_FAILURE_MIN_STATUS` (400) y `ZOD_ISSUES_SHOWN` (5).
    - Exports nuevos en `index.ts`: `writeRunFile`, `WriteRunFileOptions`, `runFilePath`, `readRunFile`, `readRunFileEntries`, `RunFileEntry` y `RunHeader`.
    - Tests: `select`, `cap-run`, `fit-line`, `line-reader`, `run-file`, `errno` y `zod-issues`, con el soporte en `storage/samples.test-support.ts` (`trickyText`, `maxedResult`, `HEAVY_TEST_TIMEOUT_MS = 60 s`).
    - Docs:
      - `15-storage.md` §23.2.1, nueva: layout local, escritura atómica, casos que el ADR no fija, lectura y errores.
      - `02-code-design.md:25`: los archivos de run son un borde de I/O de core.
      - README de core.
  - Verificado:
    - `pnpm verify` sale con 0 con Node 22: 865 tests. Core tiene un 99,19 % de líneas y un 96,31 % de ramas, y todo `src/storage` supera el 92 % de ramas salvo `run-file-reader.ts` (88,9 %) y `run-file-writer.ts` (75 %); la cobertura global sigue por encima de los umbrales de 90 %. `errno.ts` y `zod-issues.ts` tienen el 100 %.
    - Todos los criterios de aceptación del issue tienen test:
      - Gzip bomb real de 64 MiB.
      - Flujos infinitos que demuestran que no se lee todo.
      - Tests property-based con semilla fija para los topes.
      - 10 intentos al tope, y un resultado con todo por encima del tope por debajo de 768 KiB.
    - El test de cierre del archivo usa `/dev/fd`, se omite en Windows y se comprobó que falla si se quita el cierre.
    - `/review` con code-reviewer, duplication-auditor, docs-checker, security-reviewer (lanzado aunque las rutas no lo exigían) y design-auditor:
      - Se corrigió el bloqueante: publicar con un enlace duro contradecía ADR-0018 ("temporal + rename").
      - Se corrigieron los importantes 2 a 6 y, a petición del usuario ("Haz las sugerencias"), las sugerencias 7 a 11.
    - CI del PR #35 al cerrar: `verify` en macOS (Node 22 y 24) pasa; ubuntu y windows estaban en curso; `audit` falla por el problema conocido.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan ("Si"):
    - Las muestras de consola por encima de 5 conservan las 5 últimas.
    - En los pasos 2 y 3 de la garantía final, `callsDropped` y `pageErrorsDropped` se eliminan junto con su lista, y `samples` queda en `[]`.
    - Si la entrada ya trae `*Dropped`, se les suma lo descartado, y `detailTruncated` se conserva.
    - Las claves de `statuses` que coinciden al truncarlas suman sus conteos.
    - Los IDs con formato y las fechas no se truncan.
    - ANSI con `stripVTControlCharacters`.
    - Sin códigos de error nuevos.
  - Cambiada tras `/review`, con la opción que recomendó el agente ("Corrige lo importante"): publicar con `rename` y comprobación previa en lugar del enlace duro del plan, para cumplir ADR-0018.
  - Tomadas por el agente al implementar:
    - Un valor justo en el límite se acepta.
    - El `\n` no cuenta en el tamaño de una línea.
    - Los endpoints con fallos también se ordenan entre sí por `count`.
    - Una clave de `statuses` ≥ 400 cuenta aunque su conteo sea 0.
    - `commitSha`, `ci.runId` y `ci.jobId` se truncan a 2 KiB como texto.
    - `logger` obligatorio en `writeRunFile`.
    - Permisos `0600`.
  - Todas quedaron escritas en `15-storage.md` §23.2.1 y en `defaults.ts`, salvo el orden de los endpoints con fallos, el valor justo en el límite y la clave de `statuses` con conteo 0, que solo están en el código. Están listadas en el PR #35 para que las confirme quien revise. No hay ADR nuevo.
  - Sin changeset porque `@atium/core` es `private`.
- **Problemas:**
  - El hook `test-guard` bloqueó el borrado de un test temporal (`storage/smoke.test.ts`) que creó el agente. El usuario lo aprobó y lo borró con `! rm`.
  - El hook también da un falso positivo con cualquier comando que contenga `rm(`, incluido un `grep`.
  - `readRunFileEntries` puede entregar resultados válidos antes de rechazar un archivo que luego supera un límite. Está documentado en el PR; `readRunFile` rechaza el archivo entero.
  - Un `.tmp-*` puede quedar en `.atium/runs/` si el proceso muere a mitad: quien liste ese directorio (v0-15 y v0-16) debe ignorarlo.
  - El PR #35 tiene unas 3.100 líneas, más de la mitad de tests.
  - Sin cambios desde sesiones anteriores:
    - `audit` falla por `shell-quote`, `source-map-js` y `esbuild`; el bump se puede hacer desde el 2026-10-14T14:08Z.
    - Hay que usar `source ~/.nvm/nvm.sh && nvm use 22`.
    - `CLAUDE.md` dice que el repositorio no tiene código.
    - Contradicción sobre changesets entre `11-code-review.md:70` y el DoD.
    - Tope de líneas de `CONFIG_INVALID` sin definir.
    - Significado de omitir `quarantine.auto` sin definir.
  - Esta sesión no puede hacer `git push`; lo hace el usuario con `! git push`.
- **Siguiente paso:**
  1. Revisar con `gh pr checks 35` que `verify` pasa en ubuntu y windows. En Windows hay que fijarse en `rename` y en los tests omitidos de `/dev/fd` y del modo.
  2. Commitear este handoff (`docs/progress.md` y `docs/progress-archive.md`) en la rama de la próxima tarea.
  3. Cuando una persona mergee el PR #35, ejecutar `/task 16` (v0-15-storage-contract, que depende de v0-14). Usar `readRunFile` y `readRunFileEntries` desde el fake o la suite de contrato si hace falta, e ignorar `.tmp-*` al listar.

### 2026-10-12 — #14 v0-13-ci-context

- **Hecho:**
  - Rama `feat/14-ci-context`, creada desde `origin/main` en `1b417ec`. El push lo hizo el usuario con `! git push`. PR #34 abierto con `Closes #14`, sin mergear.
  - Commit `acd4e72` `docs(repo): add handoff entry for #13`: el handoff de #13 que estaba sin commitear.
  - Commit `c643c8a` `feat(core): detect the git and CI context of a run`, en `packages/core/src/`:
    - `ci/detect-run-context.ts`: `detectRunContext({ env, cwd, git, logger })` devuelve `{ git, ci }`, validados con los subesquemas de `RunSchema`.
      - Proveedor: primero `detectKnownProvider`; si no hay ninguno y `CI` está definida, `detectWithEnvCi`; si no, `local`.
      - Se aplican los overrides `ATIUM_COMMIT_SHA` y `ATIUM_BRANCH`.
      - Git solo se consulta si no hay commit en el entorno, y `dirty` solo en local.
      - Un valor que no cabe en el `Run` da `MODEL_INVALID`.
    - `ci/providers.ts`: reglas propias de GitHub, GitLab, Jenkins, CircleCI y Azure, detectados por `GITHUB_ACTIONS`, `GITLAB_CI`, `JENKINS_URL`, `CIRCLECI` y `BUILD_BUILDURI`. También `CiDetection` y `unknownCiDetection`.
    - `ci/github-event.ts`: `readGitHubPullRequest`. Abre el payload una sola vez, mide su tamaño con el mismo descriptor (tope `GITHUB_EVENT_MAX_BYTES`), lo parsea y lo valida con Zod.
      - Ilegible, demasiado grande, JSON inválido o `pull_request` inválido: aviso en el logger y se devuelve `undefined`.
      - Si es JSON inválido, solo se registra el nombre del error.
    - `ci/env-ci-fallback.ts`: `detectWithEnvCi`, con import diferido de env-ci y resultado validado con Zod. En un PR, `prBranch` es la rama y `branch` la base. La opción `envCi` es inyectable para tests.
    - `ci/env-ci.d.ts`: declaración del módulo `env-ci`, que no trae tipos. El resultado se tipa como `unknown`.
    - `ci/git-client.ts`: interfaz `GitClient` (`headCommit`, `currentBranch`, `isDirty`) y `createGitClient({ cwd, env? })` sobre simple-git, con import diferido.
      - Errores, todos `GIT_UNAVAILABLE` con hint propio: binario ausente (`ENOENT`), no es un repositorio o no hay commits, o una variable bloqueada por la guarda de simple-git. Esto último solo pasa si se pasa `env` explícito.
    - `ci/env.ts`: `envPositiveInt` y `toPositiveInt`, que solo aceptan decimales sin ceros a la izquierda y enteros seguros.
    - `env.ts`, nuevo: `EnvVars`, `nonEmpty` y `envValue`, la regla "vacía = no definida". También la usa `config/resolve-config.ts`, donde `ConfigEnv` pasa a ser un alias de `EnvVars`.
    - `defaults.ts`: `GITHUB_EVENT_MAX_BYTES = 10 MiB`.
    - `testing/fake-git-client.ts`: `FakeGitClient` (`FakeGitState`, `GitQuery`, `new FakeGitClient("unavailable")`), exportado en `@atium/core/testing`.
    - Nuevos exports en `index.ts`: `detectRunContext`, `DetectRunContextOptions`, `RunContext`, `EnvVars`, `createGitClient`, `CreateGitClientOptions` y `GitClient`.
    - Dependencias nuevas de core, con versión exacta: `simple-git` 4.0.2 y `env-ci` 11.2.0. env-ci es solo ESM y depende de `execa` 8.
    - Docs:
      - `02-data-model.md` §10.1, nueva: reglas de detección y casos límite.
      - `02-code-design.md`: `ci/git-client.ts`, `ci/github-event.ts` y `ci/env-ci-fallback.ts` son bordes de I/O de core.
      - `18-cli-config.md:141`: quién lee `ATIUM_COMMIT_SHA` y `ATIUM_BRANCH`.
      - README de core.
  - Verificado:
    - `pnpm verify` sale con 0 con Node 22: 769 tests, 100 % de líneas en `src/ci` y `src/env.ts`.
    - Tests: uno por proveedor; PR y push de GitHub con payload; payload en el tope y por encima; overrides; `dirty`; Git ausente. Además, `createGitClient` contra git real en repositorios temporales.
    - `/review` con code-reviewer, duplication-auditor, docs-checker y security-reviewer. Se corrigió el bloqueante (TSDoc de campos), los importantes 2 a 5 y las sugerencias 8, 9 y 10.
    - CI del PR #34: `verify` pasa en ubuntu, macOS y Windows con Node 22 y 24. `audit` falla, por el problema ya conocido.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan ("Si"):
    - env-ci solo como respaldo cuando `CI` está definida, porque no coincide con la tabla de §10 y ejecuta `git` por su cuenta.
    - En CI, `dirty` es `false` y no se consulta git.
    - `dirty` incluye archivos sin seguimiento (`git status --porcelain`).
    - En local, `ci` es `{ provider: "local" }` sin `runId`.
    - GitLab: `CI_PIPELINE_ID` va a `runId` y `CI_JOB_ID` a `jobId`. Jenkins: `BUILD_TAG` va a `runId`.
    - Un payload ilegible se registra como aviso, sin fallar.
    - Con `pull_request_target`, `commitSha` sigue siendo `GITHUB_SHA`.
  - Tomadas por el agente al implementar:
    - `baseBranch` desde las variables estándar de cada proveedor.
    - Rama de PR en Jenkins (`CHANGE_BRANCH`) y en Azure (`SYSTEM_PULLREQUEST_SOURCEBRANCH`).
    - `MODEL_INVALID` para valores fuera de tope.
    - `logger` obligatorio en `detectRunContext`.
    - Con `ATIUM_COMMIT_SHA` en local, no se consulta git.
  - Tomada por el agente con permiso del usuario ("haz lo que consideres"): tope de 10 MiB para el payload del evento.
  - Todas quedaron escritas en `02-data-model.md` §10.1 y en `defaults.ts`. No hay ADR nuevo.
  - Sin changeset porque `@atium/core` es `private`.
- **Problemas:**
  - Sugerencias de la revisión sin aplicar:
    - Sacar `prNumber` de `GITHUB_REF` (`refs/pull/<n>/merge`) cuando no hay payload. Es una regla de diseño nueva.
    - Redactar el stderr de git en los mensajes de `GIT_UNAVAILABLE`. Hoy el riesgo es bajo porque solo hay comandos locales.
  - Se descartó saltarse env-ci cuando están los dos overrides, porque se perderían el proveedor y el `runId`.
  - El PR #34 tiene unas 1.880 líneas: 846 de tests, 185 de docs y 139 del lockfile. Está explicado en el PR.
  - Sin cambios desde sesiones anteriores:
    - `audit` falla por `shell-quote`, `source-map-js` y `esbuild`; el bump se puede hacer desde el 2026-10-14T14:08Z.
    - Hay que usar `source ~/.nvm/nvm.sh && nvm use 22`.
    - `CLAUDE.md` dice que el repositorio no tiene código.
    - Contradicción sobre changesets entre `11-code-review.md:70` y el DoD.
    - Tope de líneas de `CONFIG_INVALID` sin definir.
    - Significado de omitir `quarantine.auto` sin definir.
  - Esta sesión no puede hacer `git push`; lo hace el usuario con `! git push`.
- **Siguiente paso:** commitear este handoff (`docs/progress.md` y `docs/progress-archive.md`) en la rama de la próxima tarea, como se hizo con #12 y #13. Cuando una persona mergee el PR #34, empezar la siguiente tarea con `/task` (el issue Pendiente más antiguo del milestone V0; previsiblemente #15, v0-14-run-files).

### 2026-10-12 — #13 v0-12-config

- **Hecho:**
  - Rama `feat/13-config`, creada desde `origin/main` en `f714562`. El push lo hizo el usuario; la sesión tiene `git push` denegado. PR #33 abierto con `Closes #13`, sin mergear.
  - Commits pendientes del handoff de #12: `d26e55a` `docs(adr): accept ADR-0022` y `c34b49e` `docs(repo): add handoff entry for #12`.
  - Commit `b88a2b6` `feat(core): load and validate the config with precedence`, en `packages/core/src/`:
    - `config/schema.ts`: `AtiumConfigSchema`, `AtiumConfig`, `AtiumConfigInput`, `QUARANTINE_MODES` (`run-and-ignore`, `skip`) y `defineConfig`, que devuelve lo mismo que recibe pero con tipos.
      - Estrictos: el nivel superior, `quarantine` (`mode`, `auto`) y `redact` (el `RedactConfigSchema` existente).
      - Abiertos: `storage`, `network`, `gate`, cada `analyzers.<nombre>` y `llm` salvo `enabled`.
      - `adapters` y `plugins` son listas de strings no vacíos.
      - Defaults: `quarantine.mode` y `llm.enabled` mediante `.default`; `quarantine`, `redact` y `llm` mediante `.prefault({})`.
    - `config/config-file.ts`: es el único I/O de core.
      - `findConfigFile`: la ruta explícita se resuelve contra `cwd`, se comprueba primero la extensión y luego que exista y sea archivo. Si no hay ruta explícita, se busca entre los 5 nombres de `cwd`. Más de uno da `CONFIG_INVALID`; un error de `stat` distinto de ENOENT/ENOTDIR da `CONFIG_NOT_FOUND`.
      - `loadConfigFile`: `await import("jiti")` con `moduleCache: false` y `fsCache: false`. Usa `.default` del módulo; jiti también lo da para `.json`.
    - `config/resolve-config.ts`: `explicitConfigFile` (`--config` > `ATIUM_CONFIG`; una variable vacía cuenta como no definida) y `resolveConfig`, que es puro (nivel: flag > `ATIUM_LOG_LEVEL` > `info`; luego valida el archivo).
    - `config/load-config.ts`: `loadConfig({ cwd, env, flags })` devuelve `{ config, logLevel, configPath }`. El archivo se muestra en los mensajes relativo a `cwd`, entre comillas.
    - `config/issues.ts`: `configInvalidError`.
      - Una línea por issue: `"ruta" must be a/an <tipo> (received …)`, o el mensaje de Zod para el resto de códigos.
      - El hint cubre todas las claves desconocidas: sugerencia para las que la tienen y "Remove … or use a key valid …" para las demás.
      - Recorre el esquema (optional, default, prefault, readonly, record, array) para saber qué claves son válidas en cada objeto.
    - `config/suggest.ts`: `suggestKey` (fastest-levenshtein, comparación en minúsculas, distancia ≤ 2, en empate gana la primera) y `didYouMean`.
    - `config/quote-received.ts`: `createReceivedQuoter`, que redacta con los patrones por defecto y luego cita con `quoteForMessage`.
    - `quote.ts`: `quoteForMessage` (sale de `paths.ts`) y `quoteList`.
    - `logger.ts`: `LOG_LEVELS`.
    - `stderr-logger.ts`: opción `level`, por defecto `info`. `debug` se activa con `level: "debug"`, con `verbose` o con `DEBUG`, sea cual sea el nivel.
    - `defaults.ts`: `CONFIG_FILE_NAMES`, `CONFIG_SUGGESTION_MAX_DISTANCE = 2`, `DEFAULT_LOG_LEVEL = "info"`, `QUARANTINE_DEFAULTS` y `LLM_DEFAULTS`.
    - `testing/thrown-error.ts`: `thrownAtiumError` y `rejectedAtiumError`, exportados en `@atium/core/testing`.
    - Dependencias nuevas de core, con versión exacta: `jiti` 2.7.0 y `fastest-levenshtein` 1.0.16.
    - Docs:
      - `18-cli-config.md` §26.3: búsqueda, carga, esquema, tabla de precedencia de V0, `ATIUM_LOG_LEVEL`, formato del error y casos límite.
      - `02-code-design.md`: core/config como único I/O de core.
      - `03-errors-logging.md`: `level` y `LOG_LEVELS`.
      - ADR-0022:32: nota de que v0-12 resolvió `ATIUM_LOG_LEVEL`.
      - README de core.
  - Verificado:
    - `pnpm verify` sale con 0 con Node 22: 714 tests y 99.65 % de cobertura en core. `src/config` cubre el 100 % de las líneas; quedan dos ramas inalcanzables en `issues.ts`.
    - Prueba de punta a punta con el build CJS: un `.ts` con `storgae` da `Did you mean "storage"?`. jiti solo se importa de forma diferida, tanto en ESM como en CJS.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, design-auditor): sin bloqueantes. El usuario pidió "Arregla todo lo que puedas": se corrigieron los 4 importantes y las sugerencias 5, 6, 8, 9, 10, 11 y 12.
    - CI del PR #33: sin revisar al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan ("Aprueba"):
    - Umbral de sugerencia: Levenshtein ≤ 2 en minúsculas.
    - Más de un archivo de configuración en la raíz da error.
    - Valor recibido: redactado y recortado a 200 bytes; los contenedores se describen por su tipo.
    - `ATIUM_LOG_LEVEL` acepta valores exactos, y vacía cuenta como no definida.
    - Opción `level` en el logger.
    - jiti también para `.json`.
    - Secciones sin esquema en el diseño: objetos abiertos.
  - Tomadas por el agente al implementar o al corregir la revisión:
    - Una ruta explícita con extensión no soportada da `CONFIG_INVALID`.
    - Con un flag de nivel, `ATIUM_LOG_LEVEL` no se lee.
    - `--config ""` da error.
    - Las claves y las rutas también se redactan.
    - Formato del hint con varias claves.
    - El nivel del logger no tiene clave en el archivo, porque el esquema no la define.
  - Todas quedaron escritas en `18-cli-config.md` §26.3. No hay ADR nuevo.
  - El conflicto "I/O solo en los bordes" frente a ADR-0017 se resolvió a favor del ADR, actualizando `02-code-design.md`.
  - Sin changeset porque `@atium/core` es `private`; solo consta aquí y en el PR.
- **Problemas:**
  - Sin aplicar, porque el diseño no da el valor: tope de líneas del mensaje de `CONFIG_INVALID`. Hoy se listan todos los issues, y §26.3 lo dice. Hay que preguntar N al usuario si se quiere un tope.
  - Abierto para la fase de cuarentena: `quarantine.auto` no tiene default y nadie ha definido qué significa omitirla.
  - `paths.test.ts` sigue con su helper `thrownBy` propio. No se tocó porque es un test existente fuera del alcance; podría usar `thrownAtiumError`.
  - El PR #33 tiene unas 1.970 líneas, frente a las 400 de `08-git-workflow.md`: 852 son tests, 208 documentación y unas 900 código, sobre todo TSDoc. Está explicado en el PR.
  - Sin cambios desde sesiones anteriores:
    - `audit` falla por `shell-quote` y `source-map-js`; el bump se puede hacer desde el 2026-10-14T14:08Z.
    - Hay que usar `source ~/.nvm/nvm.sh && nvm use 22`.
    - `CLAUDE.md` dice que el repositorio no tiene código.
    - Contradicción sobre changesets entre `11-code-review.md:70` y el DoD.
  - Esta sesión no puede hacer `git push`; lo hace el usuario con `! git push`.
- **Siguiente paso:**
  1. Revisar el CI del PR #33 (`gh pr checks 33`) y corregir lo que falle, salvo `audit`, que es el problema conocido.
  2. Cuando el PR #33 esté mergeado: `/task` con el siguiente issue Pendiente de V0. El CLI (v0-17) debe traducir `--quiet` y `--verbose` a `flags.logLevel` y crear el logger con `createRedactor(config.redact)` y `level: logLevel`.
  3. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js`. Antes, preguntar al usuario la rama y el issue.

### 2026-10-12 — #12 v0-11-logger-clock

- **Hecho:**
  - Rama `feat/12-logger-clock` (desde `main` en `7b57e6e`). El push lo hizo el usuario. PR #32 abierto con `Closes #12`, sin mergear.
  - Commit `25d3c48` `docs(adr): propose logger and clock implementations in core`: ADR-0022 en estado **Propuesta** y fila en `docs/adr/README.md`.
  - Commit `2a4c953` `feat(core): add stderr logger and clock`, en `packages/core/src/`:
    - `stderr-logger.ts`: `createStderrLogger({ stream, env, redactor, namespace, verbose? })`, exportado con `StderrLoggerOptions` y `LogStream` (`{ write(chunk: string): unknown; isTTY?: boolean }`).
      - Una línea por entrada: `<namespace> <nivel> <mensaje> <contexto JSON>`.
      - `error`, `warn` e `info` se escriben siempre. `debug` solo con `verbose` o si `DEBUG` habilita el namespace.
      - El mensaje pasa por `redactor.redact`. Se escapan los caracteres de control salvo el tab: `\n`, `\r`, ANSI, C1 y U+2028/2029.
      - Color solo si `stream.isTTY === true` y `NO_COLOR` no está definida o está vacía (`picocolors.createColors`).
      - Nunca lanza: si el formato falla escribe `<namespace> <nivel> [unformattable log entry]`; si `stream.write` lanza, la entrada se descarta. Es el único `catch` vacío, documentado en 03-errors-logging.
      - `namespace` es obligatorio, por ejemplo `"atium:cli"`. Es una desviación menor del plan, que lo tenía opcional con default `"atium"`, porque `DEBUG=atium:*` no coincide con `"atium"`.
    - `serialize-context.ts` (interno):
      - Los `Error` pasan a `{ name, message, code?, hint?, stack?, cause? }`, con el stack solo cuando debug está activo.
      - bigint, symbol y function se convierten en strings, y se usa `toJSON` si existe.
      - Cada objeto se escribe una vez: si reaparece se escribe `"[Repeated]"` y si se contiene a sí mismo `"[Circular]"`. Así el coste es lineal.
      - Después de convertirlo aplica `redactFields`. Si algo lanza devuelve `"[unserializable context]"`.
      - `Map`, `Set` y `AggregateError.errors` se pierden; está documentado en el TSDoc.
    - `debug-namespaces.ts` (interno): `isDebugEnabled(debugEnv, namespace)` con la sintaxis del paquete debug (comas o espacios, `*`, exclusiones `-` que siempre ganan) y sin regex construida desde el entorno.
    - `clock.ts`: `Clock { now(): number }` y `systemClock` (congelado), exportados desde `@atium/core`.
    - `testing/fixed-clock.ts`: `fixedClock(ms)`, que lanza `RangeError` si `ms` no es finito, en `@atium/core/testing`.
    - Dependencia nueva de runtime en core: `picocolors` 1.1.1 exacta.
    - Docs:
      - `02-code-design.md`: fila SOLID con la excepción.
      - `03-errors-logging.md`: implementación, formato, sintaxis de `DEBUG`, excepción del `catch` vacío y viñetas de niveles unidas.
      - `17-tech-stack.md`: fila de `debug`.
      - `18-cli-config.md` §26: párrafo de logs, y `ATIUM_LOG_LEVEL` y `--quiet` marcados como aplazados a v0-12/v0-17.
      - README de core.
  - Verificado:
    - `pnpm verify` exit 0 con Node 22: 619 tests y 99.5 % de cobertura en core. Solo queda sin cubrir el `default: assertNever` de `stderr-logger.ts`.
    - `/review` (code-reviewer, duplication-auditor, docs-checker) sin bloqueantes restantes. Bloqueantes corregidos: copia exponencial de referencias compartidas (opción A, `[Repeated]`, elegida por el usuario) y `catch` vacío no cubierto por la regla escrita. También se corrigieron los importantes y las sugerencias 7, 10 y 11.
    - CI del PR #32 (run `38220108855`): los 6 jobs `verify` pasan. `audit` falla (ver Problemas).
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan:
    - La implementación vive en core.
    - No se usa el paquete `debug`; `DEBUG` se interpreta con código propio.
    - `picocolors` con `createColors`.
    - Niveles visibles por defecto: `error`, `warn` e `info`.
    - Formato de línea y stacks solo con debug.
    - `fixedClock` en `testing`.
  - Las de capas y `debug` quedaron en ADR-0022. Se marcó como Aceptada al cerrar la sesión, porque el PR #32 ya estaba mergeado en `main` (`f714562`). Ese cambio está sin commitear en `main`, junto con esta entrada.
  - El resto está en `03-errors-logging.md` y en el TSDoc.
  - Hallazgos de `/review` que el usuario decidió no corregir. Solo están en esta entrada y en el TSDoc:
    - Si el mensaje no es string, se escribe el marcador en lugar de `String(message)`.
    - `Map`, `Set` y `AggregateError.errors` se pierden.
    - `fixedClock` lanza `RangeError` y no `AtiumError`.
- **Problemas:**
  - `audit` falla en el PR #32 por `shell-quote` (crítico) y `source-map-js`. Sin cambios desde #6: el bump se puede hacer desde el 2026-10-14T14:08Z.
  - Sigue igual: el Node por defecto del shell es 23.1.0, así que hay que usar `source ~/.nvm/nvm.sh && nvm use 22`.
  - Sigue igual: `CLAUDE.md` dice "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. Hay cambios sin commitear en `main`: esta entrada, el archivo de progreso y ADR-0022 marcado como Aceptada (en el ADR y en `docs/adr/README.md`). El usuario decidió que van en la rama de #13: al crearla con `/task 13`, hacer primero estos commits: `docs(adr): accept ADR-0022` y `docs(repo): add handoff entry for #12`.
  2. El PR #32 ya está mergeado: `/task 13` (v0-12 configuración, depende de v0-11). Debe resolver `ATIUM_LOG_LEVEL` y conectar `redact` de la config con `createRedactor` para el logger. Ningún otro issue abierto de V0 tiene sus dependencias cerradas antes de #12.
  3. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` (entrada de #6, ya en `progress-archive.md`). Antes, preguntar al usuario la rama y el issue.

### 2026-10-12 — #11 v0-10-redaction

- **Hecho:**
  - `/task 11 en paralelo con #10`, en el worktree `atium-11`. Rama `feat/11-redaction` creada desde `origin/main` (`86a01a2`). El usuario hizo el push. PR #30 abierto con `Closes #11`, sin mergear.
  - Commit `03f5f2a` `feat(core): add secret redaction`:
    - `packages/core/src/redact/patterns.ts`: `REDACT_PATTERN_IDS` = `jwt`, `bearer`, `aws-key`, `gcp-key`, `azure-key` (en ese orden se aplican, sin importar el orden de la config) y `createTextRedactor(ids)`, que crea copias propias de cada regex.
    - `packages/core/src/redact/fields.ts`: `redactFieldsWith(value, { isSensitive, redactText })`. Copia iterativa (sin recursión) de arrays y objetos planos; soporta ciclos, escribe con `defineProperty` (seguro con `__proto__`) y no muta la entrada. Otros valores (`Error`, `Map`, clases) se devuelven tal cual, sin redactar.
    - `packages/core/src/redact/redactor.ts`: `RedactConfigSchema`, `RedactConfig`, `HeaderValue`, `Redactor` y `createRedactor(config)`, que devuelve `{ redact, redactHeaders, redactFields }`.
    - `src/defaults.ts`: bloque añadido al final con `REDACTED_MARKER = "[REDACTED]"` y `REDACT_DEFAULTS` (congelado). `src/index.ts`: exports nuevos tras `./paths.js`.
  - Commit `e294609` `fix(core): close partial leaks and match sensitive names by fragment`: correcciones de `/review`, todas pedidas por el usuario ("Corrige todos"):
    - `bearer` y `azure-key` consumen el valor hasta un delimitador (`[^\s"'<>,;[\]]+`), y `azure-key` no distingue mayúsculas y admite espacios alrededor de `=`.
    - Comparación por fragmento en `headers` y `bodyFields`, con defaults ampliados.
    - TSDoc completo; README, §28.1 y 18-cli-config.md actualizados; tests nuevos.
  - Verificado:
    - `pnpm verify` exit 0 con Node 22: 490 tests. Cobertura de `patterns.ts` y `redactor.ts` al 100 %; en `fields.ts` solo falta la rama `default: assertNever` del `switch`.
    - Tiempo lineal: entradas adversarias de 1 MiB con tope de 2 s. A mano se comprobó que una regex JWT anclada con `\b` tarda 10 s con 256 KiB (cuadrática); con el lookbehind tarda menos de 1 ms.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, security-reviewer, design-auditor): sin bloqueantes. Se aplicaron los 5 importantes y todas las sugerencias.
    - CI del PR #30: no revisado al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas en el plan (el usuario respondió "Si" a las recomendaciones):
    - Se añaden `gcp-key` y `azure-key` a `aws-key`, y los cinco patrones están activos por defecto.
    - Una lista de la config reemplaza a su default, no lo amplía.
    - La API es un objeto `Redactor`, no solo la función `redact` (anotado en `docs/tasks/v0-10-redaction.md`).
  - Tomadas por el agente (el usuario pidió "busca la mejor decisión posible"):
    - `headers` y `bodyFields` son fragmentos de nombre. El nombre se normaliza (minúsculas, solo letras y dígitos de cualquier alfabeto) y basta con que contenga el fragmento, como el scrubbing por defecto de Sentry.
    - Defaults de headers: `authorization`, `cookie`, `apikey`, `token`, `secret`, `session`.
    - Defaults de `bodyFields`: `password`, `passwd`, `secret`, `token`, `apikey`, `credential`, `privatekey`, `sessionid`, `cardnumber`, `cvv`.
    - Un fragmento sin letras ni dígitos se rechaza. No se usa `auth` porque redactaría `author`.
    - Falsos positivos aceptados: `tokenCount`, `passwordPolicy` y la palabra que sigue a "bearer" en prosa.
  - Ambigüedades del diseño resueltas por el agente:
    - El JWT sin firma necesita el segundo punto.
    - `aws-key` y `gcp-key` exigen la longitud exacta.
    - `redactFields` solo recorre valores JSON; un cuerpo sin parsear solo pasa por los patrones.
    - Las claves de los objetos no se redactan.
  - Todo lo anterior quedó escrito en `docs/design/20-security-privacy.md` §28.1 y en el ejemplo `redact` de `18-cli-config.md` §26.3, que ahora muestra los defaults. No hay ADR: se consideró suficiente el diseño.
  - Sin changeset porque `@atium/core` es `private`. Solo está escrito aquí y en el PR.
- **Problemas:**
  - El PR #30 tiene unas 1.020 líneas cambiadas, más que las 400 de `08-git-workflow.md`: 572 son tests y 68 documentación. Está dicho en el PR.
  - #10 (v0-09, PR #31) se mergeó antes. `origin/main` (`f9e6d18`) se mergeó en esta rama y los conflictos se resolvieron conservando ambos lados (`12-ai-workflow.md`, "Cuando otra tarea se mergea antes"):
    - `defaults.ts`: `SEVERITY_WEIGHTS` y después el bloque de redacción.
    - README de core: los párrafos de findings y de redacción.
    - `docs/progress.md`: esta entrada y la de #10, quedándose las 10 más recientes.
    - `docs/progress-archive.md`: la cabecera de `main`; las dos ramas habían archivado la misma entrada.
  - Nada llama todavía a `createRedactor`. v0-11 (logger) y v0-14 (escritor de runs) deben redactar **antes** de truncar con `truncateUtf8`.
  - Fuera de alcance: emails, patrones definidos por el usuario y JWE.
  - La rama del `default: assertNever` en `fields.ts` queda sin cubrir; no se puede alcanzar.
  - Al resolver el merge se archivó además "2026-10-08 — Cambio de codename a atium".
  - Sin cambios desde #9:
    - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
    - `pnpm verify` necesita `source ~/.nvm/nvm.sh && nvm use 22`.
    - Contradicción sobre changesets: `11-code-review.md:70` frente al DoD.
- **Siguiente paso:**
  1. Revisar que los jobs del PR #30 pasen tras el push del merge con `main`.
  2. Cuando una persona mergee el PR #30, `/parallel --cleanup` en el repo principal para retirar el worktree `atium-11`.
  3. La siguiente tarea de V0 según la regla de `CLAUDE.md` (probablemente #12, v0-11 logger y reloj, que debe usar `createRedactor`).

### 2026-10-12 — #10 v0-09-finding-model

- **Hecho:**
  - Sesión en el worktree `atium-10`, en paralelo con #11 (redacción, worktree `atium-11`), con `/task 10 en paralelo con #11`.
  - Rama `feat/10-finding-model` (desde `origin/main` en `86a01a2`). Push hecho por el usuario. PR #31 abierto con `Closes #10`, sin mergear.
  - Commit `140da6e` `feat(core): add finding model and deterministic order`:
    - `packages/core/src/findings/finding.ts`:
      - `FindingSchema` con los campos y las uniones de §22.3, y las constantes `FINDING_SEVERITIES`, `FINDING_CATEGORIES`, `FINDING_SOURCES` y `FINDING_CONFIDENCES` con sus tipos.
      - `FindingFingerprintSchema`: brand `FindingFingerprint`, distinto del `Fingerprint` de error, con 16 caracteres hex. Reutiliza `HEX_16`, ahora exportado desde `model/ids.ts` pero no desde `index.ts`.
      - Restricciones del esquema:
        - Textos no vacíos y `line`/`column` enteros ≥ 1.
        - `evidence` es `z.record(z.string(), z.json())`.
        - `docsUrl` solo admite `http` o `https`.
        - `strictObject` y `exactOptional`.
        - Sin topes de texto.
    - `findings/fingerprint-of.ts`: `fingerprintOf(parts: readonly [string, ...string[]])` = `sha1(JSON.stringify(parts)).slice(0, 16)`. Valor fijo calculado con `shasum`: `["E2E001","tests/cart.spec.ts","cart › checkout","0"]` → `5aa9f042a80450f7`.
    - `findings/compare.ts`: `compareFindings` ordena por `location.file`, `line`, `column`, `ruleId` y `fingerprint`.
      - Lo ausente va después de lo presente: sin `location` al final y, dentro de un archivo, sin `line` o `column` después.
      - Compara strings con `<` (unidades UTF-16, sin locale).
    - `findings/samples.test-support.ts` (`minimalFinding`, `fullFinding`) y tests de los tres módulos, con fast-check y semilla `20261012`.
    - `src/defaults.ts`: bloque al final con `SEVERITY_WEIGHTS = { info: 0.25, warning: 1, error: 3 }`, que usa `satisfies Record<FindingSeverity, number>` e importa el tipo desde `findings/finding.js`. `defaults.test.ts` fija los valores (y evita que knip lo marque sin uso).
    - `src/index.ts`: exports nuevos de `findings/`, en orden alfabético. `SEVERITY_WEIGHTS` no se exporta.
    - Docs:
      - `14-architecture.md` §22.3: el bloque usa `evidence?: Record<string, JsonValue>` y tres viñetas nuevas explican la codificación del fingerprint, el orden y las reglas del esquema.
      - `03-linter.md` §11.5 remite a `fingerprintOf`: `|` enumera partes, el índice se pasa con `String(n)` y el `titlePath` se une con `" › "`.
      - README de core.
  - Verificado:
    - `pnpm verify` exit 0 con Node 22: 416 tests y 100% de cobertura.
    - `/review` (code-reviewer, duplication-auditor, docs-checker y design-auditor): sin bloqueantes. Se corrigieron los 5 importantes (§22.3 incompleto, §11.5 sin remisión, `@param` de `compareFindings`, ejemplo del README con `title`, regex duplicada con `HEX_16`) y 3 sugerencias (`suggestion.diff` no vacío, `file` POSIX documentado en §22.3, cita de ADR-0004 en el TSDoc).
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan; escritas en §22.3, §11.5 y el TSDoc:
    - Codificar las partes con `JSON.stringify` en lugar de unirlas con `|` literal (exigido por el criterio `["a|b"]` ≠ `["a","b"]`). Se aparta de la convención de §9.3 que proponía la entrada de #9 para los fingerprints de Finding; los de error (§13.1) no cambian.
    - Lo ausente va al final en cada nivel del orden.
    - `evidence` solo con valores JSON, `docsUrl` solo `http`/`https`, sin topes de texto y brand propio para el fingerprint.
  - Aprobada en el plan, escrita solo en el TSDoc de `compareFindings` y en el test: dos Findings con la misma ubicación, `ruleId` y `fingerprint` comparan 0 y conservan el orden de entrada. El test property-based genera fingerprints únicos a propósito.
  - Sin escribir fuera de esta entrada y del PR:
    - El esquema admite `column` sin `line` (el diseño no lo prohíbe).
    - No se publica el JSON Schema de Finding: queda para la tarea del reporter JSON.
    - No se crea un helper compartido para "sha1 recortado a 16" (`identity.ts` y `fingerprint-of.ts`), por la regla de tres.
    - No se mueve el `runOptions` repetido en 4 tests a `testing/`, para no tocar tests existentes.
- **Problemas:**
  - Nada garantiza que los fingerprints sean únicos entre analizadores, y la clave `(run_id, fingerprint)` de `15-storage.md` lo asume. Hay que resolverlo en la tarea del pipeline o de storage, por ejemplo con `analyzer` y `ruleId` entre las partes.
  - `strictObject` impide que una versión anterior lea un Finding guardado con un campo nuevo; revisarlo cuando se persistan Findings.
  - El PR #31 tiene unas 620 líneas, más que las 400 de `08-git-workflow.md`; cerca de la mitad son tests. Se dice en el PR.
  - Conflictos esperados con #11 en `packages/core/src/index.ts`, `defaults.ts`, `docs/progress.md` y `docs/progress-archive.md` (esta entrada archivó la de 2026-10-08 "Preparación del repositorio"). Se resuelven conservando ambos lados (`12-ai-workflow.md`, "Cuando otra tarea se mergea antes").
  - `knip --production` marca `findings/samples.test-support.ts` como sin uso, igual que `model/samples.test-support.ts` (`pnpm unused` pasa).
  - Sin cambios: `pnpm verify` necesita `source ~/.nvm/nvm.sh && nvm use 22`, y `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. Revisar que la CI del PR #31 pase. El usuario mergea.
  2. Si #11 se mergea antes, en `feat/10-finding-model`: `git fetch origin && git merge origin/main`, resolver conservando ambos bloques, `/verify` y pedir el push.
  3. La siguiente tarea de `V0` según la regla de `CLAUDE.md` (el issue abierto más antiguo con dependencias cerradas, sin rama, PR ni worktree).

### 2026-10-12 — #9 v0-08-identity-and-paths

- **Hecho:**
  - Al empezar, `/task 8`: el issue #8 estaba cerrado y el PR #26 mergeado; no se tocó nada. Se siguió con `/task 9` (decisión del usuario: "como prefieras").
  - Rama `feat/9-identity-and-paths` (desde `main` en `f9eee62`). Push hecho por el usuario. PR #27 abierto con `Closes #9`, sin mergear.
  - Commit `847bbaf` `feat(core): add test identity and path helpers`:
    - `packages/core/src/identity.ts`: `TITLE_PATH_SEPARATOR = " › "`, tipo `TestIdentity` y `computeTestId({ project, file, titlePath })` = `sha1([project ?? "", file, titlePath.join(" › ")].join("|")).slice(0, 16)`, validado con `TestIdSchema.parse`. Valores fijos en los tests calculados con `shasum`: `chromium|tests/cart.spec.ts|cart › checkout` → `2417ec6bdaef918a`; sin project → `77170b81b86e01a4`.
    - `packages/core/src/paths.ts`:
      - `toPosixRelative(root, absolutePath)`: usa `path.win32` si la raíz o la ruta empiezan por letra de unidad (`C:\`, `C:/`) o UNC (`\\`), y `path.posix` en otro caso. Lanza `AtiumError("MODEL_INVALID")` si la ruta es la raíz o está fuera.
      - `resolveInside(root, relative)` (usa el `path` del sistema) y la interna `resolveInsideWith(api, root, relative)` (`@internal`, no exportada desde `index.ts`; existe para probar `posix` y `win32` en cualquier SO). Comprueba con `path.relative`: rechaza `""`, `..`, `../…`, resultado absoluto (otra unidad) y NUL; con separador `\` además rechaza segmentos con punto o espacio final y nombres de dispositivo (`CON`, `PRN`, `AUX`, `NUL`, `COM0-9`, `LPT0-9`, con `¹²³` y con cualquier extensión). Léxica: no sigue symlinks.
      - Los mensajes de error citan la ruta con `JSON.stringify` y la recortan con `truncateUtf8` a `ERROR_PATH_PREVIEW_BYTES = 200` (nuevo en `src/defaults.ts`), añadiendo `…` si se recorta.
    - `src/index.ts` exporta `computeTestId`, `TITLE_PATH_SEPARATOR`, `TestIdentity`, `resolveInside` y `toPosixRelative`.
    - Docs: README de core; `docs/design/02-data-model.md` §9.3 (separador `|` sin espacios, `""` sin project, colisiones posibles, sin normalización Unicode); `docs/engineering/06-security.md` "Rutas de archivos" (reemplaza el snippet de `startsWith` por las reglas de `resolveInside` y el tope de 200 bytes).
  - Verificado:
    - `pnpm verify` exit 0 con Node 22: 361 tests y 100% de cobertura.
    - `/review` (code-reviewer, duplication-auditor, docs-checker y security-reviewer, este añadido aunque las reglas de `/review` no lo pedían para core): sin bloqueantes. Se corrigieron los 3 importantes (mensajes de error con entrada sin escapar, segmentos con punto o espacio final en Windows, README sin `TITLE_PATH_SEPARATOR` ni `TestIdentity`) y todas las sugerencias (pedido por el usuario: "Corrige todos").
    - CI del PR #27 (run `38210836909`): todos los jobs pendientes al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan. Escritas en §9.3, `06-security.md`, el TSDoc y el código:
    - sha1 según ADR-0003.
    - Campos unidos con `|` literal y `""` si falta `project`.
    - `toPosixRelative` lanza `MODEL_INVALID` fuera de la raíz o en la raíz.
    - `resolveInside` con `path.relative` en lugar del snippet de `startsWith`.
  - Tomadas en la implementación o en la revisión:
    - Sin `eslint-disable` para `sonarjs/hashing`: la regla no marca `createHash("sha1")` cuando el resultado se asigna y se recorta (sí cuando se devuelve directamente). Solo está en esta entrada y en el PR.
    - `aTestCase` sigue con `seededHex`: con `computeTestId`, `["cart › checkout"]` y `["cart", "checkout"]` colisionan, y el test existente `test-case-builder.test.ts` "derives different testIds for titles that only differ in how they are split" lo prohíbe. Escrito en el TSDoc de `aTestCase` (ya decía que no es el de §9.3); el motivo concreto solo está aquí.
    - Rechazo de nombres de Windows y NUL, y el tope de 200 bytes: escritos en `06-security.md` y `defaults.ts`.
    - Sin changeset porque `@atium/core` es `private`. Solo en el PR y aquí.
- **Problemas:**
  - El PR #27 tiene 630 líneas cambiadas, más que las 400 de `08-git-workflow.md`; cerca de la mitad son tests. No se dividió; se dice en el PR.
  - No se pudo comprobar en Windows real si `".. "` podría escapar de la raíz; el rechazo es preventivo.
  - Contradicción sin resolver: `docs/engineering/11-code-review.md:70` pide changeset para cualquier cambio de API pública; el DoD (`docs/engineering/README.md:47`) y `08-git-workflow.md:110` solo para paquetes publicados.
  - `knip --production` marca `packages/core/src/model/json-schema.ts` y `model/samples.test-support.ts` como archivos sin usar (fuera del alcance de #9; `pnpm unused` pasa).
  - Sin cambios desde #8:
    - `audit` falla por `shell-quote` y `source-map-js`.
    - `05-fingerprinting.md` §13.2: no está claro el `family = sha1(...)` sin `slice`. Cuando se implemente `fingerprint`, aplicar la misma convención de separadores que §9.3 (`|` literal sin espacios).
    - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
    - `pnpm verify` hay que ejecutarlo con `source ~/.nvm/nvm.sh && nvm use 22` (Node 23.1.0 por defecto no lo admite dependency-cruiser).
- **Siguiente paso:**
  1. Revisar que los jobs `verify` del PR #27 pasen, en especial `windows-latest`. El usuario mergea.
  2. `/task 10` (v0-09 modelo de Finding y orden determinista), si sus dependencias están cerradas.
  3. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` descrito en la entrada de #6. Antes, preguntar al usuario la rama y el issue.
  4. En v0-14: `RunHeaderSchema` (`RunSchema` sin `results`), límites del lector (64 KiB, 1 MiB y 256 MiB), umbral de 768 KiB y ventana de 10 pasos en `defaults.ts`.

### 2026-10-11 — #8 v0-07-test-builders

- **Hecho:**
  - Rama `feat/8-test-builders` (desde `main` en `49d9ae6`). El push lo hizo el usuario (el agente no tiene permiso para `git push`). PR #26 abierto con `Closes #8`, sin mergear.
  - Commit `71f0ae5` `docs(repo): add handoff entry for #7`: la entrada de #7 que estaba sin commitear al empezar la sesión.
  - Commit `3cb82c3` `feat(core): add test data builders`, en `packages/core/src/testing/`:
    - `run-builder.ts` (`aRun`: `.withSeed(n)`, `.onCommit(sha)`, `.onProvider(name)`, `.withResult(builder)`, `.with(patch)`), `test-result-builder.ts` (`aTestResult(title?)`: `.passed()`, `.failedThenPassed()`, `.failedAllAttempts(n)`, `.forTest(builder)`, `.inFile(file)`, `.with(patch)`), `test-case-builder.ts` (`aTestCase(title?)`: `.inFile`, `.inProject`, `.withTags`, `.with`), `attempt-builder.ts` (`anAttempt()`: `.withIndex`, `.passed()`, `.failed(errorBuilder?)`, `.with`) y `error-builder.ts` (`anError(type?)`: `.withMessage`, `.with`). Exportados con sus tipos `*Builder` desde `src/testing/index.ts`.
    - Sin clases: cada builder es una función que devuelve un objeto congelado con `Object.freeze`; cada método crea un builder nuevo. `.with(patch)` copia el patch con `structuredClone`. `build()` hace `XSchema.parse(...)`: valida, da los tipos branded sin `as` y devuelve el objeto congelado (`.readonly()` de Zod).
    - `deterministic.ts` (interno, no sale por `index.ts`): `FIXED_START = "2026-10-08T14:03:00.000Z"`, `fixedTimePlus(ms)`, `seededHex(seed)` (sha256, 16 hex) y `seededRunId(seed)` (UUID v7 con el timestamp de `FIXED_START` y bits aleatorios de `sha256("run:" + seed)`).
    - Defaults:
      - `aRun()`: id de seed 1, sin `ci`, playwright en linux/x64/22.20.0, `finishedAt` = inicio + 150 s.
      - `aTestCase()`: `tests/example.spec.ts`, `titlePath = [title]`, título por defecto `"example test"`. `testId` = `seededHex(JSON.stringify([project, file, titlePath]))`.
      - `anError()`: `TimeoutError`, `"Timeout 5000ms exceeded."`, `failedAtMs` 1000. `fingerprint` = `seededHex(JSON.stringify([type, message]))`; `family` = `seededHex("family:" + type)`.
      - `anAttempt()`: índice 0, `passed`, 1000 ms. `startedAt` = inicio + índice × su propia duración.
    - `failedAllAttempts(n)` lanza `RangeError` si `n` no es un entero ≥ 1. Con más de 20 intentos, el Zod de `build()` lanza.
    - Tests: un `.test.ts` por archivo, con defaults válidos, inmutabilidad, determinismo (incluido un id de run fijo como golden value), round trip JSON del `Run` y property-based de `seededHex` y `seededRunId` (seed `20261011`).
    - Docs: README de core, `docs/engineering/04-testing.md` (dos viñetas en "Datos de prueba") y un comentario en `src/model/samples.test-support.ts` que explica por qué los tests de esquema no usan los builders.
  - Verificado:
    - `pnpm verify` exit 0 con Node 22.23.3: 279 tests y 100% de cobertura.
    - `/review` (code-reviewer, duplication-auditor, docs-checker): sin bloqueantes. Se corrigieron los 2 importantes (TSDoc inexacto de `family` y tags faltantes en `deterministic.ts`) y las 7 sugerencias.
    - CI del PR #26 (run `38204259056`): `audit` falla (ver Problemas); los jobs `verify` estaban pendientes al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan. Están en el código, el TSDoc, el README y `04-testing.md`:
    - Builders como funciones, sin clases.
    - `build()` valida con Zod.
    - Los valores por defecto de los builders son datos de prueba, no defaults del producto, así que no van en `defaults.ts`.
    - `samples.test-support.ts` se queda sin migrar a los builders.
    - La entrada de #7 se commitea en esta rama.
  - Tomadas durante la implementación o en `/review`. Solo están en el código y el TSDoc:
    - El `testId` por defecto NO es el de §9.3: se calcula con sha256 y `JSON.stringify` para evitar colisiones.
    - Se usa sha256 en lugar de sha1 porque la regla `sonarjs/hashing` marca sha1 como error.
    - Los patches se copian con `structuredClone`.
- **Problemas:**
  - En v0-08, `computeTestId` debe usar sha1 según §9.3, y `sonarjs/hashing` lo marcará como error. Hay que decidir con el usuario si se desactiva la regla en esa línea con una justificación (hoy no hay ningún `eslint-disable` en el repo).
  - Cuando exista `computeTestId`, conviene que `aTestCase` lo use en lugar de `seededHex`. Hoy esto no está escrito en ninguna tarea.
  - Sin cambios desde #7:
    - `audit` falla en el PR #26 por `shell-quote` y `source-map-js`.
    - `05-fingerprinting.md` §13.2: no está claro el `family = sha1(...)` sin `slice`.
    - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
  - El Node activo por defecto del shell es 23.1.0, y dependency-cruiser no lo admite. `pnpm verify` hay que ejecutarlo con `source ~/.nvm/nvm.sh && nvm use 22`.
  - El hook `test-guard` bloqueó borrar un archivo de test temporal que el agente usaba para inspeccionar valores. No se rodeó, y el archivo nunca llegó a crearse.
- **Siguiente paso:**
  1. Revisar que los jobs `verify` del PR #26 pasen. El usuario mergea.
  2. `/task 9` (v0-08 identidad de tests y rutas). Depende solo de v0-06. Antes de implementar `computeTestId`, preguntar por `sonarjs/hashing` y proponer que `aTestCase` lo use.
  3. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` descrito en la entrada de #6. Antes, preguntar al usuario la rama y el issue.
  4. En v0-14: `RunHeaderSchema` (`RunSchema` sin `results`), límites del lector (64 KiB, 1 MiB y 256 MiB), umbral de 768 KiB y ventana de 10 pasos en `defaults.ts`.

### 2026-10-11 — #7 v0-06-model-schemas

- **Hecho:**
  - Rama `feat/7-model-schemas` (desde `main` en `aa3d005`). PR #25 con `Closes #7`, mergeado por el usuario (merge `49d9ae6`); el issue #7 quedó cerrado. `main` local actualizado a `49d9ae6`.
  - Commit `b77f58f` `docs(repo): add handoff entry for #6`: la entrada de #6 que estaba sin commitear al empezar la sesión.
  - Commit `349d2fc` `feat(core): add Zod schemas of the data model`:
    - `packages/core/src/model/`: un archivo por entidad (`run.ts`, `test-result.ts`, `test-case.ts`, `attempt.ts`, `error-occurrence.ts`, `network.ts`, `bdd.ts`), con los campos de §9.2. Objetos `z.strictObject(...).readonly()`: rechazan claves desconocidas y el objeto parseado queda congelado. Opcionales con `.exactOptional()` (rechazan `undefined` explícito). Tipos con `z.infer`.
    - `ids.ts`: `RunIdSchema` (UUID v7 estricto), `TestIdSchema` y `FingerprintSchema` (`/^[0-9a-f]{16}$/`), branded.
    - `fields.ts` (interno): `cappedString(maxBytes)` (`.max(n, { abort: true })` como precheck más un `refine` con la medida exacta), `TextSchema` (2 KiB), `cappedList`, `NonNegativeIntSchema`, `MillisecondsSchema`, `DroppedCountSchema` (entero ≥ 1), `TimestampSchema` (`z.iso.datetime()` solo UTC con `Z`, más `.max(2048)`).
    - `text.ts`: `jsonEscapedByteLength` (interno, para el escritor de v0-14) y `truncateUtf8(value, maxBytes)` (público; lanza `RangeError` si `maxBytes` no es un entero ≥ 0). Sin marcador ni elipsis.
    - `src/defaults.ts`: `MODEL_LIST_CAPS` y `MODEL_TEXT_CAPS_BYTES` (ADR-0018). No se exportan desde `index.ts`.
    - Constantes exportadas: `SCHEMA_VERSION`, `ATTEMPT_STATUSES`, `TEST_OUTCOMES`, `FRAMEWORK_NAMES`.
    - JSON Schema en `packages/core/schemas/run.v1.json`, generado por `pnpm --filter @atium/core schema:export` (`vitest run src/model/json-schema.test.ts --update`, con `toMatchFileSnapshot`). `runJsonSchema()` quita `readOnly` y añade `title` y `description`. `schemas` añadido a `files` y a `.prettierignore`.
    - Dependencias: `zod@4.6.5` (dependency de core) y `fast-check@4.10.2` (dev). Son las últimas versiones que admite `minimumReleaseAge`.
    - Tests: uno por esquema, con casos válidos e inválidos en `it.each`, más el round trip JSON del `Run` y property-based de `text.ts` (seed fija `20261011`, 1000 runs, contra `JSON.stringify`). Las muestras válidas están en `src/model/samples.test-support.ts` (solo tests).
    - Docs: README de core, `docs/engineering/10-tooling.md` (`.prettierignore`) y `docs/design/16-repository-structure.md` (`core/schemas/` contiene el JSON Schema publicado).
  - Verificado:
    - `pnpm verify` exit 0 con Node 22.23.3: 223 tests y 100% de cobertura.
    - `pnpm --filter @atium/core pkg:check` pasa.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, design-auditor). Bloqueantes corregidos: timestamps sin tope y TSDoc de las muestras. Importantes corregidos: `10-tooling.md`, `16-repository-structure.md` y `files`. Sugerencias 6–8 aplicadas.
    - CI del PR #25 (run `38200407349`): los 6 jobs `verify` pasan; `audit` falla (ver Problemas).
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan; están en el código y el TSDoc, no en `docs/design/`:
    - Topes de `message` y `stack`: 2048 y 8192 bytes ("2 KB" y "8 KB" de §9.2 leídos como KiB).
    - `ci.shard.index` en base 1, con `index ≤ total`.
    - `Run.id` como UUID v7 estricto.
    - Objetos estrictos: las claves desconocidas se rechazan.
  - Aprobadas por el usuario en `/review`; tampoco están en `docs/design/`:
    - `runAttempt`, `prNumber`, `workers`, `location.line` y `location.column` exigen ≥ 1.
    - `retries` y el resto de conteos, índices, duraciones y offsets son enteros ≥ 0. `p95Ms` también es entero.
    - `NetworkCall.status` acepta 0.
    - `TestId` y `Fingerprint` van en hex minúscula.
    - `attempts`, `titlePath` y `steps` pueden ir vacíos, y los strings vacíos se aceptan.
    - La única validación entre campos es la del shard.
  - `family` es un string libre con el tope por defecto.
  - `schema:export` usa `toMatchFileSnapshot` para no añadir `tsx` u otro runner.
  - El PR #25 superó las 400 líneas de la guía de `08-git-workflow.md`: unas 670 de código y docs más unas 880 de tests. El usuario lo aceptó como un solo PR, porque "una tarea por PR" choca con el límite. No quedó escrito como excepción.
- **Problemas:**
  - `docs/design/05-fingerprinting.md` §13.2 define `family = sha1(...)` sin `.slice(0, 16)`, a diferencia de `fingerprint`. No está claro si es el sha1 completo; afecta al cálculo de `family` en la fase de fingerprinting.
  - El job `audit` sigue fallando en el PR #25 y en `main` (run `38200827926`, `49d9ae6`) por `shell-quote` (critical) y `source-map-js` (high). Es el mismo problema de #6. `zod` y `fast-check` no aparecen en el audit.
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. `/task 8` (v0-07 Builders de datos de prueba). Depende de v0-06. Las muestras de `src/model/samples.test-support.ts` pueden servir de punto de partida o quedar sustituidas por los builders.
  2. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` descrito en la entrada de #6. Antes, preguntar al usuario la rama y el issue.
  3. En v0-14: `RunHeaderSchema` (`RunSchema` sin `results`), límites del lector (64 KiB, 1 MiB y 256 MiB), umbral de 768 KiB y ventana de 10 pasos en `defaults.ts`.

### 2026-10-11 — #6 v0-05-errors-result-failopen

- **Hecho:**
  - Rama `feat/6-errors-result-failopen` (desde `main` en `da2762b`). Push hecho por el usuario. PR #24 abierto con `Closes #6`, sin mergear.
  - Commit `c15f32d` `feat(core): add errors, Result, Logger interface and failOpen`, en `packages/core/src/`:
    - `errors.ts`: `ERROR_CODES` (los 8 de `03-errors-logging.md`, sin agregar ninguno), `ErrorCode` y `AtiumError`. `cause` solo se define si la clave está en las opciones (`"cause" in options`), como en un `Error` nativo.
    - `errors.ts`: `isAtiumError(value)`, que no usa `instanceof`. Comprueba que sea un objeto con `name === "AtiumError"` y un `code` conocido, para reconocer errores de la otra copia ESM/CJS del paquete o de otro realm (`vm`, workers).
    - `result.ts`: `Result<T, E = AtiumError>`, `ok` y `err`.
    - `logger.ts`: `LogLevel`, `LogContext = Readonly<Record<string, unknown>>` e interfaz `Logger` (`error`/`warn`/`info`/`debug(message, context?)`). Solo tipos.
    - `fail-open.ts`: `FailOpenOptions` y `failOpen`, idénticos a `03-errors-logging.md`. Solo async.
    - `testing/fake-logger.ts`: `FakeLogger` (guarda las llamadas en `entries`) y `LogEntry`, exportados desde `@atium/core/testing`.
    - Un test por módulo: 28 tests y 100% de cobertura en los archivos con lógica. El smoke test de exports no se tocó.
    - `docs/engineering/03-errors-logging.md`: firma de `Logger`, regla "un Logger nunca lanza", semántica de `cause` e `isAtiumError`.
    - `packages/core/README.md` actualizado. Sin changeset, porque core es `private`.
  - Commit `ddee398` `chore(repo): run format hook from the project root`: `.claude/hooks/format.mjs` ahora ejecuta Prettier con `cwd` = `CLAUDE_PROJECT_DIR`. Antes, si el directorio de trabajo de la sesión era `packages/core`, Prettier no leía el `.prettierignore` de la raíz y reformateaba los `.md`. El agente no puede editar `.claude/hooks/**`: el usuario copió el archivo desde el scratchpad y pidió el commit en esta misma rama. Está mencionado en la descripción del PR #24.
  - Verificado:
    - `pnpm verify` pasa en local con Node 22.23.3.
    - `/review` (code-reviewer, duplication-auditor, docs-checker): sin bloqueantes. Se corrigieron los 4 importantes (reformateo del `.md`, snippet de `AtiumError` desactualizado y TSDoc incompleto de `Logger` y `FakeLogger`) y las 5 sugerencias.
    - CI del primer push (`c15f32d`, run `38197467024`): los 6 jobs `verify` pasan.
- **En curso:** nada. CI del segundo push (`ddee398`, run `38198130585`): los 6 jobs `verify` pasan y `audit` falla (ver Problemas).
- **Decisiones:**
  - Aprobadas por el usuario en el plan y escritas en `03-errors-logging.md` y en el TSDoc:
    - Firma de `Logger`.
    - Contrato "un `Logger` nunca lanza", así que `failOpen` no protege `logger.warn`.
    - Solo `failOpen` async: los hooks síncronos del reporter usarán `void failOpen(...)` o pedirán una variante síncrona en la fase del collector. Esto último no está escrito en ningún lado.
  - "Los riesgos resuélvelos como consideres": se añadió `isAtiumError` (escrito en `03-errors-logging.md`).
  - Sugerencia de `/review` aplicada: `LogLevel` como tipo propio, en lugar de `keyof Logger`.
  - El hook va en la rama de #6 por decisión del usuario, sin issue propio.
- **Problemas:**
  - El job `audit` falla en el PR #24 por `shell-quote` 1.10.0 (critical) y `source-map-js` 1.2.1 (high), igual que en #22, que ya se mergeó con `audit` en rojo. El usuario pidió hacer el bump en esta sesión, pero no se pudo: `minimumReleaseAge: 20160` solo los admite desde el 2026-10-13T02:34Z (`shell-quote` 1.11.0) y el 2026-10-14T14:08Z (`source-map-js` 1.2.2). El bump no tiene rama ni issue; la entrada de #5 lo ubicaba en `ci/5-ci-pipeline`, que ya se mergeó.
  - Node local por defecto 23.1.0: hay que usar `nvm use` (22).
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. Cuando una persona mergee el PR #24: `/task 7` (v0-06 Esquemas Zod del modelo de datos, depende de #6).
  2. Desde el 2026-10-14T14:08Z, con `nvm use`:
     - Preguntar al usuario la rama y el issue del bump, porque la convención `<tipo>/<n>-<nombre>` necesita un número.
     - Ejecutar `pnpm update --depth Infinity shell-quote source-map-js` y comprobar en `pnpm-lock.yaml` que quedan `shell-quote@1.11.0` y `source-map-js@1.2.2` sin otros cambios.
     - Ejecutar `pnpm audit --audit-level high` y `pnpm verify`.
     - Commit `build(repo): bump shell-quote and source-map-js to patched versions`.

### 2026-10-11 — #5 v0-04-ci-pipeline

- **Hecho:**
  - Rama `ci/5-ci-pipeline` (desde `main` en `3204c6b`); commit `6fbf88d` `ci(repo): add verify workflow, Renovate config and PR template`. Push hecho por el usuario. PR #22 abierto con `Closes #5`, sin mergear.
  - `.github/workflows/verify.yml`:
    - Job `verify`: `pnpm install --frozen-lockfile` y `pnpm verify` en Node 22/24 × ubuntu/macos/windows-latest, con `fail-fast: false` y `cache: pnpm`.
    - Job `audit`: `pnpm audit --audit-level high`.
    - `permissions: contents: read`; `concurrency` por PR, que solo cancela en `pull_request`; `timeout-minutes: 30` por job; `persist-credentials: false`.
  - SHA de las Actions resueltos con `gh api` desde los tags de las releases oficiales (los tags anotados, desreferenciados). Se usó la última release estable con al menos 14 días:
    - `actions/checkout` v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`
    - `actions/setup-node` v7.0.0 `820762786026740c76f36085b0efc47a31fe5020`. La v7.1.0, del 2026-10-08, se descartó por tener menos de 14 días.
    - `pnpm/action-setup` v6.1.0 `ea17c68df8912ef543352723c149a84f56e3d413`
  - `renovate.json`: el de `10-tooling.md`, más la regla `typescript` `allowedVersions: "<7"` (ADR-0021).
  - `.github/pull_request_template.md`: idéntica a `08-git-workflow.md`.
  - `.gitattributes`: `* text=auto eol=lf` y `fixtures/** -text`.
  - Docs:
    - `10-tooling.md`: fila CI en el resumen, ejemplo de Renovate actualizado, nueva sección "CI" y política LF en la sección de Prettier.
    - `06-security.md`: nivel de audit y formato del pin por SHA.
    - `08-git-workflow.md`: ubicación de la plantilla de PR.
  - Verificado:
    - `pnpm verify` pasa en local con Node 22.23.3.
    - `/review` sin bloqueantes; se corrigieron los 4 importantes y las sugerencias de timeout, `fixtures/` y ubicación de la plantilla.
    - En el PR #22, los 6 jobs `verify` pasan (run `38194643302`).
- **En curso:** el job `audit` del PR #22 falla, como se esperaba. `pnpm audit --audit-level high` encuentra:
  - `shell-quote@1.10.0` (critical, GHSA-pqg4-j6r4-53mv, vía `@changesets/cli>launch-editor`). Parche 1.11.0, publicado el 2026-09-29T02:34Z.
  - `source-map-js@1.2.1` (high, GHSA-68fv-2mgg-jv7q, vía `vitest>vite>postcss` y `magicast`). Parche 1.2.2, publicado el 2026-09-30T14:08Z.

  `minimumReleaseAge: 20160` impide resolver esos parches hasta el 2026-10-13T02:34Z y el 2026-10-14T14:08Z (UTC). Los rangos de los padres (`launch-editor` `^1.10.0` y `postcss`) ya los admiten, así que no hacen falta overrides.
- **Decisiones:**
  - Decisiones del usuario:
    - `pnpm audit --audit-level high` y bloqueante (escrito en `06-security.md`).
    - Esperar a que los parches cumplan los 14 días en lugar de excepciones o `ignoreGhsas` (escrito en `06-security.md` como regla general; la fecha concreta solo está aquí y en el PR #22).
  - Decisiones de esta sesión:
    - `.gitattributes` con LF, que añade un archivo fuera de la lista de la tarea (escrito en `10-tooling.md`).
    - `timeout-minutes: 30`. El valor lo propuso el agente y el usuario aceptó "los que consideres". Está escrito en `10-tooling.md` pero no en el diseño.
    - Rama con tipo `ci`.
- **Problemas:**
  - Node local por defecto 23.1.0: dependency-cruiser lo rechaza y `deps:check` falla. Hay que usar `nvm use` (22).
  - No se aplicaron estas sugerencias de `/review`:
    - `config:recommended` no fija por SHA una Action nueva añadida por tag (haría falta `helpers:pinGitHubActionDigests`).
    - `internalChecksFilter: "strict"` en Renovate.
  - La dimensión "3 últimas menores de Playwright" de §29 queda para cuando existan los adapters.
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. Hacer commit de esta entrada en `ci/5-ci-pipeline`, en la línea de `docs(repo): add handoff entry for #4`. Quedó sin commitear porque el usuario no lo pidió. Si se cambia de rama antes, la entrada se mueve con el working tree.
  2. `/task 6` (v0-05-errors-result-failopen). Solo depende de v0-02 (Hecha), no de #5, y es el issue abierto más antiguo de `V0` después de #5. Su rama sale de `main`, que todavía no tiene `verify.yml`: hasta que se mergee el PR #22 no habrá CI en su PR; se verifica con `pnpm verify` en local, o rebaseando cuando #22 entre. Si #6 añade dependencias, `pnpm-lock.yaml` chocará con la actualización de #5; se regenera en la rama que se mergee después.
  3. A partir del 2026-10-14T14:08Z, en `ci/5-ci-pipeline`, con `nvm use`: `pnpm update --depth Infinity shell-quote source-map-js`. Comprobar en `pnpm-lock.yaml` que quedan `shell-quote@1.11.0` y `source-map-js@1.2.2` y que no cambió nada más. Después, `pnpm audit --audit-level high` y `pnpm verify`; commit `build(repo): bump shell-quote and source-map-js to patched versions`; pedir el push al usuario y confirmar que el PR #22 queda en verde. Hasta entonces, no mergear el PR #22.

### 2026-10-11 — #4 Seguimiento de tareas con GitHub Issues

- **Hecho:**
  - `main` local avanzado (fast-forward) a `origin/main` (`757ce22`, PR #3).
  - En GitHub: issue de seguimiento #4 (sin milestone ni `type:task`); milestone `V0`; etiquetas `phase:v0` y `type:task`; issues #5–#20 para v0-04 → v0-19 (v0-04 = #5 … v0-19 = #20), creados por `issue-writer` (lanzado como `general-purpose` con haiku porque el agente se creó en la sesión) y verificados con `gh`: sin duplicados, etiquetas y milestone correctos, dependencias de #5, #19 y #20 correctas, cuerpos de #6 y #15 idénticos a los criterios de sus archivos.
  - Rama `chore/4-issues-workflow`, commit `1daf6dc` `docs(repo): track tasks with GitHub Issues`: sección "Issues" en `08-git-workflow.md` (única fuente del formato), ramas `<tipo>/<n>-<nombre>`, `Closes #<n>` en la plantilla de PR, fila de idioma; `.claude/agents/issue-writer.md`; `/task`, `/handoff`, `/plan-phase`; `CLAUDE.md`; `12-ai-workflow.md` (tablas, comandos, diagrama, memoria, apartado `gh`); columna Issue en `docs/tasks/README.md`; línea de estado en `docs/progress.md`; `v0-19` ya no pide actualizar el README.
  - Verificado: `pnpm format:check` pasa; `/review` sin bloqueantes, los dos importantes corregidos (v0-19 obsoleto; `/task N` localiza el archivo por el prefijo `[vN-xx]` porque el enlace del issue da 404 hasta que el archivo llega a `main`).
  - Push hecho por el usuario; PR #21 abierto con `Closes #4`, sin mergear.
- **En curso:** nada. PR #21 pendiente de revisión y merge por una persona.
- **Decisiones:** todas las del plan aprobado quedaron escritas en `08-git-workflow.md`, `CLAUDE.md`, `12-ai-workflow.md` y los comandos.
- **Problemas:**
  - Permisos de `gh` incluidos en el PR #21.
  - La tabla de estados y la regla de siguiente tarea están repetidas en `08-git-workflow.md`, `docs/tasks/README.md`, `CLAUDE.md` y `12-ai-workflow.md` (pedido en el plan); pueden divergir.
  - `/audit` convierte hallazgos en tareas pero no crea sus issues.
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código", ya falso.
  - `issue-writer` no aparece como tipo de subagente hasta reiniciar la sesión de Claude Code.
- **Siguiente paso:** cuando una persona mergee el PR #21, `/task 5` (v0-04, depende de v0-03 Hecha; es el issue abierto más antiguo de `V0`).

### 2026-10-09 — v0-01-monorepo-bootstrap

- **Hecho:** tarea v0-01 terminada en la rama `chore/root-monorepo-bootstrap` (sin push ni PR; `git push` está en `deny` en `.claude/settings.json`). Dos commits:
  - `a27d07b` `docs(adr): decide English for public documentation`: ADR-0020 (Aceptada) y actualizados `CLAUDE.md`, `08-git-workflow.md`, `23-risks-open-decisions.md` y el índice de ADRs.
  - `372b52e` `chore(root): bootstrap pnpm monorepo with turbo and changesets`: `package.json` (pnpm@12.10.1, Node `>=22`, solo el script `build`, devDeps exactas turbo 2.11.7 y @changesets/cli 3.0.3), `pnpm-workspace.yaml`, `turbo.json` (`build`/`typecheck`/`test`, `globalDependencies: ["tsconfig.base.json"]`), `tsconfig.base.json` (idéntico a 01-typescript.md), `.nvmrc`, `.editorconfig`, `.gitignore` (lo pedido más `.env`, `.env.*`, `*.log`, `.DS_Store`), `.changeset/`, `README.md` en inglés y `pnpm-lock.yaml`. Se borró `atium-docs.zip` (pedido por el usuario). v0-01 marcada Hecha en `docs/tasks/README.md`.
  - Verificado en una copia limpia: `pnpm install --frozen-lockfile` y `pnpm turbo run build typecheck test` terminan con código 0 sin paquetes; agregar esbuild falla con `ERR_PNPM_IGNORED_BUILDS`. `/review` sin bloqueantes. `/verify` no se ejecutó antes del commit porque `pnpm verify` no existe hasta v0-03.
- **En curso:** nada.
- **Decisiones:**
  - Documentación pública en inglés: ADR-0020. Queda abierto el idioma de `CONTRIBUTING.md`, plantillas de issues y código de conducta (`CLAUDE.md`, `23-risks-open-decisions.md`).
  - Últimas versiones estables de npm (decisión del usuario). pnpm 11 eliminó `onlyBuiltDependencies`; se usa `allowBuilds: {}` + `strictDepBuilds: true` en `pnpm-workspace.yaml`. Escrito en `06-security.md`, v0-01 y v0-16 (v0-16 ahora dice agregar `better-sqlite3: true` a `allowBuilds`).
  - Los paquetes de V0 nacen con `"private": true` mientras el nombre sea provisional: escrito en la tarea v0-02.
  - Sin documentar fuera de los archivos de config: la versión fijada de pnpm (12) no está en `17-tech-stack.md`; Changesets usa `access: "restricted"` y `privatePackages: { version: true, tag: false }`; el prefijo de rama `chore/` no figura en `08-git-workflow.md` (solo lista `feat/` y `fix/`).
- **Problemas:**
  - El pnpm global del usuario (10.28.2) no puede cambiar solo a pnpm 12 (`exec format error`: pnpm 12 se distribuye como binario nativo). Hasta instalar pnpm 12 (`npm i -g pnpm@12.10.1`), `pnpm install` falla; en esta sesión se usó `npx pnpm@12.10.1`.
  - Node local v23.1.0: `@changesets/cli` pide `^22.11 || ^24 || >=26` (solo advierte). Usar `nvm use` (`.nvmrc` = 22).
  - La entrada anterior dice que el commit `adbb0cd` se hizo en `master`; la rama real es `main` y existe `origin/main`.
  - El hook `format.mjs` llama a Prettier, que no está instalado hasta v0-03 (fail-open, no hace nada).
- **Siguiente paso:** el usuario decide cómo integrar `chore/root-monorepo-bootstrap` en `main` (push y PR o merge local); después, `/task docs/tasks/v0-02-core-skeleton.md`.

### 2026-10-09 — Decisiones abiertas de V0 (ADR-0017, 0018, 0019)

- **Hecho:** commit `adbb0cd` (`docs(adr): decide config loading, run file format, size limits and language`), solo documentación:
  - ADR-0017 (config con jiti), ADR-0018 (formato NDJSON de los archivos de run, límites del lector, topes del escritor y garantía final) y ADR-0019 (CLI, reglas, reportes y comentarios en PR en inglés), todos en estado Aceptada.
  - Actualizados `02-data-model.md` (§9.2, §9.3, §9.5), `17-tech-stack.md`, `23-risks-open-decisions.md`, `05-performance.md`, `08-git-workflow.md`, `CLAUDE.md` y las tareas v0-06, v0-12, v0-14 y v0-17. Las tres ya no tienen sección de decisiones abiertas.
- **En curso:** nada. No hay código; ninguna tarea cambió de estado.
- **Decisiones:**
  - Todas están escritas en los ADR 0017–0019. El detalle numérico (topes de listas y textos, regla de qué elementos se conservan, umbral de escritura de 768 KiB, pasos 1–5 de la garantía final y cálculo del peor caso, ≈ 620 KiB por línea y ≈ 54 KiB de encabezado) está en ADR-0018. Esos valores deben ir al `defaults.ts` de core cuando se implementen v0-06 y v0-14.
  - Los topes de texto se miden en bytes UTF-8 del valor ya escapado para JSON. Esto cambia la semántica de `truncateUtf8` en v0-06.
  - Decisión operativa sin documentar: el commit se hizo directamente en `master`, que es la única rama local y no tiene remoto.
- **Problemas:**
  - **Idioma de la documentación pública** (incluidas las páginas de cada regla): sigue abierto en `CLAUDE.md` y en `23-risks-open-decisions.md`.
  - **Posible inconsistencia en v0-14:** el criterio "escribir y leer un run construido con builders devuelve el mismo objeto" solo se cumple si los builders (v0-07) generan valores dentro de los topes y sin códigos ANSI. Si no, el escritor los altera. Conviene aclararlo al planificar v0-07 o v0-14.
  - **`04-collector.md` §12.1** dice que el fixture captura `ariaSnapshot` y lo envía por attachments, pero no dice que se guarde como archivo aparte (ADR-0018). No se actualizó; revisarlo al llegar a la fase del collector.
  - **Sugerencias sin escribir en ningún lado:**
    - El subagente `test-writer` tiene Edit y Write sin restricción de rutas; solo su prompt lo limita a archivos de test. Un hook podría hacerlo cumplir.
    - `explorer` (proyecto) y `Explore` (integrado) se confunden fácilmente al delegar.
- **Siguiente paso:** `/task docs/tasks/v0-01-monorepo-bootstrap.md`.

### 2026-10-08 — Cambio de codename a atium

- **Hecho:** codename cambiado de `nameless` a `atium` en toda la documentación, la configuración de `.claude/` y las tareas.
- **En curso:** nada.
- **Decisiones:** ADR-0016 reemplaza al ADR-0013. Las entradas anteriores de esta bitácora mantienen el nombre viejo.
- **Problemas:** siguen abiertas las decisiones de V0: c12 o jiti (v0-12), formato interno de los archivos de run (v0-14), idioma de los mensajes del CLI (v0-17).
- **Siguiente paso:** `/task docs/tasks/v0-01-monorepo-bootstrap.md`.

### 2026-10-08 — Preparación del repositorio

- **Hecho:** documentación de diseño (v3) dividida en `docs/design/`, ADRs 0001–0015, estándares en `docs/engineering/`, configuración de Claude Code en `.claude/` (agentes, comandos, hooks, permisos) y tareas de V0 en `docs/tasks/`.
- **En curso:** nada. El repositorio todavía no tiene código.
- **Decisiones:** codename `nameless` (ADR-0013); Node 22 como mínimo (ADR-0002, Node 20 sin soporte desde abril de 2026).
- **Problemas:** decisiones abiertas que bloquean tareas de V0: c12 o jiti (v0-12), formato interno de los archivos de run (v0-14, requiere ADR), idioma de los mensajes del CLI (v0-17).
- **Siguiente paso:** `/task docs/tasks/v0-01-monorepo-bootstrap.md`.
