# Archivo de progreso

Entradas antiguas de [progress.md](progress.md), de la más reciente a la más antigua.

## Entradas

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
