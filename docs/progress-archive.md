# Archivo de progreso

Entradas antiguas de [progress.md](progress.md), de la más reciente a la más antigua.

## Entradas

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
