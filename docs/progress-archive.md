# Archivo de progreso

Entradas antiguas de [progress.md](progress.md), de la más reciente a la más antigua.

## Entradas

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
