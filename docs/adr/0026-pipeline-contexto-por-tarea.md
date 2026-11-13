# ADR-0026: Contexto limpio por tarea y pipeline de entrega más corto

- Estado: Aceptada
- Fecha: 2026-11-13
- Reemplaza parcialmente: [ADR-0025](0025-pipeline-entrega-loop-autonomo.md), en el orden de las puertas 2 y 3 y en el modelo de `plan-reviewer`
- Diseño relacionado: docs/engineering/12-ai-workflow.md

## Contexto

Medición de las sesiones del repositorio hasta 2026-11-13 (transcripts de Claude Code):

- El 93 % de los tokens se gastó en la sesión principal y el 7 % en los subagentes.
- Una sesión encadenó seis tareas (#46 a #56): el contexto mediano fue de 409k tokens y llegó a 964k. Cada turno vuelve a leer todo el contexto, así que la misma clase de tarea costó 40 M de tokens al empezar la sesión y 208 M después de tres tareas. `/loop /dev-loop` acumula de la misma forma: una tarea del loop terminó con 542k de contexto.
- Cada tarea tiene unos 250 turnos; un 15 % son comandos de `gh` y `git` del trámite de entrega.
- `delivery-auditor` corre en serie después de `/review`, vuelve a ejecutar `pnpm verify` y repite comprobaciones de `docs-checker` (TSDoc, changeset, diseño actualizado).
- `plan-reviewer` usa el modelo de la sesión incluso en `/task`, donde una persona aprueba el plan después.

## Decisión

- **Una tarea por contexto.** `/task` no empieza una tarea en una conversación donde ya se trabajó otra: pide `/clear`. `/handoff` termina pidiendo `/clear`. La continuidad está en `docs/progress.md`, el issue y la rama.
- **Una vuelta de `/dev-loop` por proceso.** El loop se lanza con un bucle de shell que ejecuta `claude -p "/dev-loop …"` una vez por vuelta. La vuelta escribe en `.atium-loop/next` los segundos de espera hasta la siguiente o `stop`; sin ese archivo, el bucle termina. El estado sigue en GitHub y en `.atium-loop/`. Reemplaza a `/loop /dev-loop`.
- **`delivery-auditor` pasa a `/review`** y corre en paralelo con los demás revisores, sin volver a ejecutar `pnpm verify` (lo hace `/verify` sobre el mismo HEAD y la CI). Su `APROBADO` es condición de `/deliver`. Un `RECHAZADO` se corrige en la puerta 2 y vuelve a pasar por `delivery-auditor` (máx. 2 rondas). Las correcciones de la puerta 2 vuelven a pasar `/verify`.
- **`docs-checker` sale de `/review`:** sus comprobaciones las hace `delivery-auditor`. Sigue en `/audit`.
- **`plan-reviewer` usa `sonnet`** en `/task`, donde aprueba una persona. Usa el modelo principal (`opus`) en `/dev-loop`, donde su `APROBADO` es la aprobación, y cuando el plan toca fórmulas, estados, esquemas o `defaults.ts`.
- **Trámite de entrega en un script:** `.claude/scripts/open-pr.mjs` busca secretos en el cuerpo, hace push con `push-branch.mjs` y crea o actualiza el PR en borrador. `/deliver` ya no comenta el resumen en el issue (el PR lo enlaza con `Closes #N`), `/task` ya no comenta "Tarea iniciada" y `/handoff` solo comenta en el issue si no hay PR.

El resto de ADR-0025 sigue vigente: pipeline con TDD, aprobación del plan, push solo con el script, ruleset, token acotado y comentarios solo del dueño.

## Consecuencias

- Menos tokens por turno y respuestas más rápidas; se espera bajar entre un 60 % y un 70 % los tokens de la sesión principal por tarea.
- Una puerta secuencial menos y una ejecución menos de `pnpm verify` por tarea.
- `delivery-auditor` ya no audita el HEAD exacto que se empuja si después de `/review` solo hubo correcciones de otros revisores: esas correcciones las revisan la segunda pasada de `code-reviewer`, `/verify` y la CI.
- `plan-reviewer` con `sonnet` puede dejar pasar más fallos de plan en `/task`; los ve la persona que aprueba.
- En `claude -p` no hay quien confirme un permiso: lo que `loop-settings.json` no permite se rechaza en vez de esperar. El loop trata ese rechazo como un bloqueo de la tarea.
- `open-pr.mjs` y sus permisos los añade una persona, porque el agente no puede editar `.claude/scripts/` ni los archivos de permisos.

## Alternativas descartadas

- **Quitar `delivery-auditor`:** el loop necesita una auditoría estricta de criterios y tests `AC-n` antes de abrir un PR.
- **Ejecutar cada tarea del loop en un subagente:** los subagentes no pueden lanzar subagentes, y el pipeline los necesita.
- **Compactar el contexto entre tareas (`/compact`):** conserva un resumen que la tarea siguiente no necesita y sigue creciendo; `/clear` y `docs/progress.md` ya cubren la continuidad.
- **Unir `docs-checker` y `duplication-auditor`:** `docs-checker` ya era redundante con `delivery-auditor`, y `duplication-auditor` clasifica cada bloque duplicado (ADR-0015).
