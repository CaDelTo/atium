# Progreso

Bitácora entre sesiones de trabajo. La escribe `/handoff` al cerrar cada sesión y se lee al empezar la siguiente.

- Las entradas más recientes van primero.
- Se conservan las 10 últimas; las anteriores pasan a `docs/progress-archive.md`.
- El estado de cada tarea vive en su issue de GitHub (índice en `docs/tasks/README.md`); aquí va el contexto que no cabe ahí.

## Entradas

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
