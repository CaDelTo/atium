# Progreso

Bitácora entre sesiones de trabajo. La escribe `/handoff` al cerrar cada sesión y se lee al empezar la siguiente.

- Las entradas más recientes van primero.
- Se conservan las 10 últimas; las anteriores pasan a `docs/progress-archive.md`.
- El estado de cada tarea vive en su issue de GitHub (índice en `docs/tasks/README.md`); aquí va el contexto que no cabe ahí.

## Entradas

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
- **En curso:** nada. Esta entrada no está commiteada.
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
