---
description: Empieza una tarea a partir de su issue o de su descripción en docs/tasks/
argument-hint: "<número de issue (#6 o 6) o archivo de tarea, por ejemplo docs/tasks/v0-05-errors-result-failopen.md>"
---

Empieza la tarea indicada en `$ARGUMENTS`. El formato de issues y ramas está en la sección "Issues" y "Ramas" de docs/engineering/08-git-workflow.md.

1. Identifica la tarea y su issue:
   - Con un número (`#N` o `N`): `gh issue view N`. El archivo es el de `docs/tasks/` cuyo nombre empieza por el ID del prefijo `[vN-xx]` del título; búscalo en local, porque el enlace del cuerpo da 404 hasta que el archivo llega a `main`.
   - Con un archivo: lista los issues con `gh issue list --state all --limit 500 --json number,title` y busca el que empieza por el prefijo `[vN-xx]` del ID. Si no hay issue, dilo y sigue solo con el archivo.
   - Si el issue está cerrado, o alguna dependencia sigue abierta, avisa y pregunta antes de seguir.
2. Lee la tarea completa.
3. Usa el subagente `explorer` para reunir las secciones de docs/design/, los ADR y los estándares de docs/engineering/ que aplican, y el código existente relacionado.
4. Presenta un plan: archivos a crear o modificar, enfoque, tests, riesgos y dudas. Señala cualquier valor que el diseño no defina. Incluye el nombre de la rama.
5. Espera aprobación antes de escribir código.
6. Al aprobarse el plan:
   - Actualiza `main`: `git fetch` y `git switch main && git merge --ff-only origin/main`.
   - Crea la rama `<tipo>/<n>-<nombre>`: `git switch -c <rama>`.
   - Comenta en el issue, en español, que la tarea empezó: `gh issue comment N --body "Tarea iniciada en la rama \`<rama>\`."`.
7. Después de implementar: `/verify`, luego `/review`, y resume según la sección "Flujo de trabajo" de CLAUDE.md. El PR incluye `Closes #N`.

Nunca cierres issues ni mergees PRs: lo hace una persona.
