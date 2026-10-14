---
description: Empieza una tarea a partir de su issue o de su descripción en docs/tasks/
argument-hint: "<número de issue (#6 o 6) o archivo de tarea, por ejemplo docs/tasks/v0-05-errors-result-failopen.md> [en paralelo con #M …]"
---

Empieza la tarea indicada en `$ARGUMENTS`. El formato de issues y ramas está en la sección "Issues" y "Ramas" de docs/engineering/08-git-workflow.md.

1. Identifica la tarea y su issue:
   - Con un número (`#N` o `N`): `gh issue view N`. El archivo es el de `docs/tasks/` cuyo nombre empieza por el ID del prefijo `[vN-xx]` del título; búscalo en local, porque el enlace del cuerpo da 404 hasta que el archivo llega a `main`.
   - Con un archivo: lista los issues con `gh issue list --state all --limit 500 --json number,title` y busca el que empieza por el prefijo `[vN-xx]` del ID. Si no hay issue, dilo y sigue solo con el archivo.
   - Si el issue está cerrado, tiene la etiqueta `loop:blocked` o alguna dependencia sigue abierta, avisa y pregunta antes de seguir.
   - Comprueba que nadie más la tiene en curso: rama `*/<n>-*` local o remota (`git fetch origin` y `git branch -a --list '*/<n>-*'`), PR abierto que la cierre (`gh pr list --state open --limit 200 --json number,headRefName,body`) o un worktree `atium-<n>` distinto del directorio actual (`git worktree list`). Si hay alguno, avisa y detente; si es la rama o el worktree actual, pregunta si es la continuación de esta misma tarea antes de seguir.
   - Si `$ARGUMENTS` incluye `en paralelo con #M` (uno o más números), otra sesión trabaja a la vez en esos issues: aplica las reglas de la sección "Trabajo en paralelo" de docs/engineering/12-ai-workflow.md y lee el archivo de tarea de cada `#M` para conocer su alcance.
2. Lee la tarea completa.
3. Usa el subagente `explorer` para reunir las secciones de docs/design/, los ADR y los estándares de docs/engineering/ que aplican, y el código existente relacionado.
4. Redacta el plan según el paso 1 del pipeline de entrega (docs/engineering/12-ai-workflow.md, "Pipeline de entrega"): archivos, enfoque, riesgos, `TDD: sí/no` con el motivo, el mapa `AC-n → archivo → test previsto` y el nombre de la rama. Señala cualquier valor que el diseño no defina. En paralelo, indica además qué archivos compartidos vas a tocar y que no tocas el alcance de las otras tareas.
5. Pasa el plan a `plan-reviewer`. Con `CAMBIOS`, corrígelo y vuelve a pasarlo (máx. 2 rondas). Presenta el plan junto con el veredicto; con `REQUIERE PERSONA`, presenta la pregunta.
6. Espera aprobación antes de escribir código.
7. Al aprobarse el plan:
   - Comenta el plan en el issue bajo `## Plan aprobado` (aprobado por la persona) y añade la etiqueta `plan:approved` (`gh issue edit N --add-label plan:approved`).
   - Crea la rama `<tipo>/<n>-<nombre>` desde `main` actualizado: `git fetch origin` y `git switch --no-track -c <rama> origin/main`. No uses `git switch main`: dentro de un worktree falla porque `main` está activa en el repo principal.
   - Comenta en el issue, en español, que la tarea empezó: `gh issue comment N --body "Tarea iniciada en la rama \`<rama>\`."`.
8. Sigue los pasos 5 a 10 del pipeline de entrega: especificación con `spec-tester` si hay TDD, implementación, `test-writer`, `/verify`, `/review` y `/deliver`. Si algo requiere una decisión humana, detente y pregunta.
9. Resume según la sección "Flujo de trabajo" de CLAUDE.md y cierra con `/handoff`.

Nunca cierres issues ni mergees PRs: lo hace una persona.
