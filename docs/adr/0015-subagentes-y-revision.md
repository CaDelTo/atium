# ADR-0015: Subagentes por nivel de modelo y revisión automatizada

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: docs/engineering/11-code-review.md, docs/engineering/12-ai-workflow.md

## Contexto

El proyecto se desarrolla con Claude Code. Ejecutar verificaciones, búsquedas y revisiones en la sesión principal llena el contexto con salidas largas, cuesta más de lo necesario y hace que el mismo agente que escribió el código lo revise.

## Decisión

- Subagentes en `.claude/agents/` con modelo asignado según la tarea: `haiku` para tareas mecánicas y de lectura, `sonnet` para revisión con checklist y tests, el modelo de la sesión (`inherit`) para conformidad con el diseño.
- Los subagentes de revisión y auditoría son de solo lectura; `test-writer` solo edita tests.
- `/review` ejecuta la revisión en paralelo y consolida un reporte; es parte de la Definition of Done.
- La duplicación se controla en dos niveles: umbral global con jscpd en `pnpm verify` y revisión de cada bloque con `duplication-auditor`.
- Hook de formato después de cada edición; permisos que prohíben push, publicación, lectura de `.env` y edición de fixtures.

## Consecuencias

- Menor uso de contexto y costo en tareas rutinarias.
- Revisión independiente del agente que implementó.
- Los resúmenes de subagentes pueden omitir detalles: el agente principal verifica cada hallazgo bloqueante en el código.
- La configuración de `.claude/` depende de la sintaxis vigente de Claude Code y debe revisarse cuando cambie.

## Alternativas descartadas

- Todo en la sesión principal: más contexto consumido y autorrevisión.
- Todos los subagentes con el modelo principal: costo innecesario en tareas mecánicas.
- Todos con modelos pequeños: precisión insuficiente para fórmulas y decisiones.
