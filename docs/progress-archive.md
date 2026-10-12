# Archivo de progreso

Entradas antiguas de [progress.md](progress.md), de la más reciente a la más antigua.

## Entradas

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
