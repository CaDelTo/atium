---
description: Empieza una o varias tareas (hasta 3 a la vez), cada una en un subagente task-runner con su worktree y contexto limpio
argument-hint: "[números de issue (#6 o 6), hasta 3, o un archivo de docs/tasks/; vacío: elige hasta 3 Pendientes independientes]"
---

Eres el orquestador (ADR-0026): coordinas, no implementas. Cada tarea la ejecuta un subagente `task-runner` con contexto limpio; tu contexto solo recibe planes, preguntas e informes, así que puedes encadenar tareas en esta conversación sin `/clear`. No leas código ni diffs de las tareas: eso lo hacen los runners.

## Orquestación

1. **Tareas:** las de `$ARGUMENTS` (un archivo de `docs/tasks/` se resuelve a su issue como en el paso 1 de "Pasos de la tarea"). Si está vacío, elige hasta 3 con "Proponer" (pasos 4 a 7) de `.claude/commands/parallel.md`: Pendientes, con dependencias cerradas y que no toquen el mismo paquete. Dilo en una línea y sigue. Como máximo 3 runners activos a la vez.
2. **Lanza** un `task-runner` por tarea, en segundo plano y con `isolation: "worktree"`, con el prompt: issue `N`, modo `plan` y los demás issues en paralelo (`#M …`). Lánzalos en el mismo mensaje.
3. **Cuando un runner devuelve:**
   - `PLAN`: presenta a la persona el plan y el veredicto, con el issue en el título. Con su aprobación, envía al runner (`SendMessage`) "Plan aprobado por la persona", con sus cambios si los pidió. No apruebes tú.
   - `NECESITA PERSONA`: presenta la pregunta y reenvía la respuesta al runner.
   - `ENTREGADA` o `FALLÓ`: muestra el informe. Si quedan tareas pedidas sin lanzar, lanza la siguiente.
4. **Merges:** cuando la persona diga que se mergeó un PR, envía a cada runner activo "Se mergeó #<n>; actualiza la rama según 'Trabajo en paralelo' de 12-ai-workflow.md".
5. **Al terminar** todas: resume en una tabla issue → PR → estado. Los worktrees de los runners se retiran con `/parallel --cleanup` cuando sus PRs se mergeen.

## Pasos de la tarea (los ejecuta `task-runner`)

El formato de issues y ramas está en la sección "Issues" y "Ramas" de docs/engineering/08-git-workflow.md.

1. Identifica la tarea y su issue:
   - Con un número (`#N` o `N`): `gh issue view N`. El archivo es el de `docs/tasks/` cuyo nombre empieza por el ID del prefijo `[vN-xx]` del título; búscalo en local, porque el enlace del cuerpo da 404 hasta que el archivo llega a `main`.
   - Con un archivo: lista los issues con `gh issue list --state all --limit 500 --json number,title` y busca el que empieza por el prefijo `[vN-xx]` del ID. Si no hay issue, dilo y sigue solo con el archivo.
   - Si el issue está cerrado, tiene la etiqueta `loop:blocked` o alguna dependencia sigue abierta, devuelve `NECESITA PERSONA` antes de seguir.
   - Comprueba que nadie más la tiene en curso: rama `*/<n>-*` local o remota (`git fetch origin` y `git branch -a --list '*/<n>-*'`) o PR abierto que la cierre (`gh pr list --state open --limit 200 --json number,headRefName,body`). Si hay alguno, devuelve `NECESITA PERSONA` preguntando si es la continuación de esta misma tarea.
   - Si hay tareas en paralelo (`#M`), aplica las reglas de la sección "Trabajo en paralelo" de docs/engineering/12-ai-workflow.md y lee el archivo de tarea de cada `#M` para conocer su alcance.
2. Lee la tarea completa.
3. Usa el subagente `explorer` para reunir las secciones de docs/design/, los ADR y los estándares de docs/engineering/ que aplican, y el código existente relacionado.
4. Redacta el plan según el paso 1 del pipeline de entrega (docs/engineering/12-ai-workflow.md, "Pipeline de entrega"): archivos, enfoque, riesgos, `TDD: sí/no` con el motivo, el mapa `AC-n → archivo → test previsto` y el nombre de la rama. Señala cualquier valor que el diseño no defina. En paralelo, indica además qué archivos compartidos vas a tocar y que no tocas el alcance de las otras tareas.
5. Pasa el plan a `plan-reviewer`, con `model: "opus"` si el plan toca fórmulas, estados, esquemas o `defaults.ts`; si no, con su modelo por defecto (`sonnet`). Con `CAMBIOS`, corrígelo y vuelve a pasarlo (máx. 2 rondas). Devuelve el plan con el veredicto; con `REQUIERE PERSONA`, la pregunta.
6. Espera la aprobación de la persona (te la reenvía el orquestador) antes de escribir código.
7. Al aprobarse el plan:
   - Comenta el plan en el issue bajo `## Plan aprobado` (aprobado por la persona) y añade la etiqueta `plan:approved` (`gh issue edit N --add-label plan:approved`).
   - Crea la rama `<tipo>/<n>-<nombre>` desde `main` actualizado: `git fetch origin` y `git switch --no-track -c <rama> origin/main`. No uses `git switch main`: dentro de un worktree falla porque `main` está activa en el repo principal.
8. Sigue los pasos 5 a 10 del pipeline de entrega: especificación con `spec-tester` si hay TDD, implementación, `test-writer`, `/verify`, `/review` y `/deliver`. Si algo requiere una decisión humana, devuelve `NECESITA PERSONA`.
9. Cierra con `/handoff` y devuelve el informe `ENTREGADA`.

Nunca cierres issues ni mergees PRs: lo hace una persona.
