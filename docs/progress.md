# Progreso

Bitácora entre sesiones de trabajo. La escribe `/handoff` al cerrar cada sesión y se lee al empezar la siguiente.

- Las entradas más recientes van primero.
- Se conservan las 10 últimas; las anteriores pasan a `docs/progress-archive.md`.
- El estado de cada tarea vive en su issue de GitHub (índice en `docs/tasks/README.md`); aquí va el contexto que no cabe ahí.

## Entradas

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
