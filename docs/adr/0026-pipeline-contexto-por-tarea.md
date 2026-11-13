# ADR-0026: Orquestador con un subagente por tarea y pipeline de entrega más corto

- Estado: Aceptada
- Fecha: 2026-11-13
- Reemplaza parcialmente: [ADR-0025](0025-pipeline-entrega-loop-autonomo.md), en quién ejecuta cada tarea, el orden de las puertas 2 y 3 y el modelo de `plan-reviewer`
- Diseño relacionado: docs/engineering/12-ai-workflow.md

## Contexto

Medición de las sesiones del repositorio hasta 2026-11-13 (transcripts de Claude Code):

- El 93 % de los tokens se gastó en la sesión principal y el 7 % en los subagentes.
- Una sesión encadenó seis tareas (#46 a #56): el contexto mediano fue de 409k tokens y llegó a 964k. Cada turno vuelve a leer todo el contexto, así que la misma clase de tarea costó 40 M de tokens al empezar la sesión y 208 M después de tres tareas. `/loop /dev-loop` acumula de la misma forma: una tarea del loop terminó con 542k de contexto.
- Las tareas se hacían de una en una: la persona esperaba el plan, la entrega y el merge de cada una antes de la siguiente.
- Cada tarea tiene unos 250 turnos; un 15 % son comandos de `gh` y `git` del trámite de entrega.
- `delivery-auditor` corre en serie después de `/review`, vuelve a ejecutar `pnpm verify` y repite comprobaciones de `docs-checker` (TSDoc, changeset, diseño actualizado).
- `plan-reviewer` usa el modelo de la sesión incluso en `/task`, donde una persona aprueba el plan después.
- Claude Code permite que un subagente lance subagentes (hasta 3 niveles por debajo de la sesión principal; comprobado en este repositorio).

## Decisión

- **Orquestador y un subagente por tarea.** `/task` y `/dev-loop` coordinan; cada tarea la ejecuta un subagente `task-runner` con contexto limpio, en segundo plano y en su propio worktree (`isolation: "worktree"`). El runner lanza los subagentes del pipeline (segundo nivel). El orquestador solo recibe planes, preguntas e informes de unas 25 líneas, así que puede encadenar tareas sin `/clear`.
- **Hasta 3 tareas a la vez**, sin dos sobre el mismo paquete. En `/dev-loop`, `--max-parallel` (3 por defecto).
- **La persona sigue aprobando en `/task`:** el runner devuelve el plan y espera; el orquestador lo presenta y le reenvía la aprobación o la respuesta a una pregunta con `SendMessage`, que conserva el contexto del runner. En `/dev-loop` aprueba `plan-reviewer`, como antes.
- **`delivery-auditor` pasa a `/review`** y corre en paralelo con los demás revisores, sin volver a ejecutar `pnpm verify` (lo hace `/verify` sobre el mismo HEAD y la CI). Su `APROBADO` es condición de `/deliver`. Un `RECHAZADO` se corrige en la puerta 2 y vuelve a pasar por `delivery-auditor` (máx. 2 rondas). Las correcciones de la puerta 2 vuelven a pasar `/verify`.
- **`docs-checker` sale de `/review`:** sus comprobaciones las hace `delivery-auditor`. Sigue en `/audit`.
- **`plan-reviewer` usa `sonnet`** en `/task`, donde aprueba una persona. Usa el modelo principal (`opus`) en `/dev-loop`, donde su `APROBADO` es la aprobación, y cuando el plan toca fórmulas, estados, esquemas o `defaults.ts`.
- **Trámite de entrega en un script:** `.claude/scripts/open-pr.mjs` busca secretos en el cuerpo, hace push con `push-branch.mjs` y crea o actualiza el PR en borrador. `/deliver` ya no comenta el resumen en el issue (el PR lo enlaza con `Closes #N`), `/task` ya no comenta "Tarea iniciada" y `/handoff` solo comenta en el issue si no hay PR.

El resto de ADR-0025 sigue vigente: pipeline con TDD, aprobación del plan, push solo con el script, ruleset, token acotado y comentarios solo del dueño.

## Consecuencias

- Menos tokens por turno y respuestas más rápidas: cada tarea empieza con contexto limpio. Se espera bajar entre un 60 % y un 70 % los tokens de la sesión principal por tarea.
- Hasta 3 PRs en curso a la vez; el límite pasa a ser la revisión humana y los conflictos en archivos compartidos ("Trabajo en paralelo" de 12-ai-workflow.md).
- Una puerta secuencial menos y una ejecución menos de `pnpm verify` por tarea.
- El contexto del orquestador sigue creciendo, despacio (un informe por tarea); en ejecuciones muy largas se compacta.
- Si la sesión del orquestador se cierra, los runners en curso se cortan. El estado sigue en GitHub, en las ramas y en el registro del loop; las tareas se retoman.
- Un runner no puede contestar una petición de permiso: la sesión debe permitir lo que el pipeline necesita (modo auto, `acceptEdits` o `loop-settings.json`).
- Los worktrees de los runners quedan en `.claude/worktrees/`; los retira `/parallel --cleanup` cuando sus PRs se mergean. `loop-settings.json` protege `.claude/` por subcarpetas para no bloquear las ediciones dentro de esos worktrees.
- `delivery-auditor` ya no audita el HEAD exacto que se empuja si después de `/review` solo hubo correcciones de otros revisores: esas correcciones las revisan la segunda pasada de `code-reviewer`, `/verify` y la CI.
- `plan-reviewer` con `sonnet` puede dejar pasar más fallos de plan en `/task`; los ve la persona que aprueba.
- `open-pr.mjs` y los permisos los añade una persona, porque el agente no puede editar `.claude/scripts/` ni los archivos de permisos.

## Alternativas descartadas

- **Una sesión limpia por tarea con `/clear`:** depende de que la persona lo recuerde, y sigue siendo una tarea a la vez.
- **`/dev-loop` como bucle de shell con un `claude -p` por vuelta:** contexto limpio, pero un proceso aparte, sin persona en el circuito y sin paralelo.
- **Sesiones de terminal por tarea con `/parallel`:** sigue disponible, pero obliga a abrir y atender una sesión por tarea.
- **Quitar `delivery-auditor`:** el loop necesita una auditoría estricta de criterios y tests `AC-n` antes de abrir un PR.
- **Unir `docs-checker` y `duplication-auditor`:** `docs-checker` ya era redundante con `delivery-auditor`, y `duplication-auditor` clasifica cada bloque duplicado (ADR-0015).
