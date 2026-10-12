---
description: Prepara una o varias tareas para trabajarlas a la vez, cada una en su worktree y su sesión de Claude Code
argument-hint: "[números de issue, por ejemplo 10 11] o --cleanup"
---

Prepara tareas para trabajarlas en paralelo. Las reglas (cuántas tareas, cadena principal, archivos compartidos, conflictos) están en la sección "Trabajo en paralelo" de docs/engineering/12-ai-workflow.md; los estados y el formato de issues y ramas, en las secciones "Ramas" e "Issues" de docs/engineering/08-git-workflow.md. No las repitas: aplícalas.

Este comando no escribe código, no crea ramas, no comenta en issues y no lanza sesiones: eso lo hace `/task` en cada sesión. Los worktrees quedan en detached hasta que cada sesión aprueba su plan.

Si `$ARGUMENTS` es `--cleanup`, salta a "Limpieza".

## Comprobaciones previas

1. Ejecútalo desde el repo principal: `git rev-parse --git-dir` y `git rev-parse --git-common-dir` deben resolver a la misma ruta. Si no, detente y dilo.
2. `git fetch origin`. Comprueba que `origin/main` contiene `.claude/commands/parallel.md` (`git cat-file -e origin/main:.claude/commands/parallel.md`): los worktrees usan los comandos de `main`. Si no está, detente y dilo.
3. Calcula las rutas absolutas: `<padre>` es el directorio padre de `git rev-parse --show-toplevel`, y cada worktree va en `<padre>/atium-<n>`.

## Proponer

4. Determina el milestone actual y lista sus issues abiertos: `gh issue list --milestone <milestone> --state open --limit 200 --json number,title,body`.
5. Candidatos: los números de `$ARGUMENTS`, o todos los issues abiertos del milestone si está vacío. Un candidato es válido si está Pendiente según 08-git-workflow.md:
   - Todas las líneas `Depende de #N` de su cuerpo apuntan a issues cerrados (`gh issue view N --json state`); las líneas `Depende de vN-xx (Hecha)` cuentan como cerradas.
   - Sin rama local ni remota `*/<n>-*` (`git branch -a --list '*/<n>-*'`).
   - Sin PR abierto que lo cierre (`gh pr list --state open --limit 200 --json number,headRefName,body`, buscando `Closes #<n>` o la rama).
   - Sin worktree `atium-<n>` (`git worktree list`).
   - Si diste números y alguno no es válido, dilo con el motivo.
6. Para cada candidato válido, lee su archivo en `docs/tasks/` (por el prefijo `[vN-xx]` del título): `Paquete` y `Hacer`. Deduce los módulos que toca y cuáles de los archivos compartidos de 12-ai-workflow.md va a tocar.
7. Elige el conjunto según "Cuándo conviene" de 12-ai-workflow.md. Si diste números, respeta esos aunque sea uno solo.
8. Presenta y espera aprobación:
   - Tabla: issue, título, paquete y módulo, si está en la cadena principal, archivos compartidos probables.
   - Candidatos descartados y motivo.
   - Rutas de los worktrees que vas a crear y orden de merge recomendado.

## Preparar (después de la aprobación)

9. Para cada issue aprobado:
   - `git worktree add --detach <padre>/atium-<n> origin/main`
   - `pnpm -C <padre>/atium-<n> install --frozen-lockfile`
   - Si algo falla, detente y repórtalo. No borres lo creado sin preguntar.
10. Muestra un bloque `bash` por issue para ejecutarlo en una pestaña nueva de terminal. Si solo hay una tarea, omite `en paralelo con`:

    ```bash
    cd <padre>/atium-<n> && claude "/task <n> en paralelo con #<otros números>"
    ```

11. Recuerda al usuario:
    - Cada sesión presenta su plan y espera aprobación; la primera vez Claude Code pide confiar en la carpeta del worktree.
    - Mergear de uno en uno, en el orden recomendado.
    - Cuando se mergee un PR, decir en cada sesión que siga abierta: "Se mergeó #<n>; actualiza la rama según 'Trabajo en paralelo' de 12-ai-workflow.md".
    - Al terminar: `/parallel --cleanup`.

## Limpieza

12. `git worktree list --porcelain`. Considera solo los worktrees cuya ruta es exactamente `<padre>/atium-<dígitos>`; ignora cualquier otro (por ejemplo `atium-bench-main` de `perf-benchmarker`). Para cada uno:
    - Su rama actual. Si no tiene rama (la sesión no llegó a aprobar el plan), no lo propongas: lístalo aparte.
    - Si su PR está mergeado: `gh pr list --state merged --head <rama> --limit 200 --json number`.
    - Si tiene cambios sin commitear: `git -C <ruta> status --porcelain`.
    - Si tiene commits sin push: `git -C <ruta> log --oneline origin/<rama>..HEAD` (si la rama remota ya no existe, basta con que el PR esté mergeado).
13. Propón retirar solo los worktrees con PR mergeado, sin cambios sin commitear y sin commits sin push. Lista el resto con el motivo.
14. Después de la aprobación: `git worktree remove <ruta>`, sin `--force`. No borres ramas.

Nunca cierres issues ni mergees PRs: lo hace una persona.
