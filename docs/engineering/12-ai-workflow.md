# Trabajo con Claude Code

Cómo se usan los agentes de IA en este repositorio. La configuración está en `.claude/` (agentes, comandos, hooks y permisos).

> La sintaxis de agentes, comandos, hooks y permisos sigue la documentación de Claude Code. Antes de cambiarla, verifica la versión vigente en https://docs.claude.com/en/docs/claude-code/overview.

## Principio

El agente principal planifica, decide e implementa. Las tareas mecánicas o de lectura se delegan a subagentes con modelos más pequeños, que devuelven resúmenes cortos. Así:

- El contexto principal no se llena con salidas largas (logs de tests, resultados de búsqueda).
- Las tareas simples cuestan menos y son más rápidas.
- La revisión la hace un agente distinto del que escribió el código.

## Política de modelos

| Nivel | Modelo | Para qué | Ejemplos |
|---|---|---|---|
| Ligero | `haiku` | Tareas mecánicas, búsqueda, ejecutar herramientas y resumir su salida | `explorer`, `verifier`, `duplication-auditor`, `docs-checker`, `perf-benchmarker`, `issue-writer` |
| Intermedio | `sonnet` | Juicio sobre código con criterios claros | `code-reviewer`, `security-reviewer`, `test-writer` |
| Principal | `inherit` (el modelo de la sesión) | Precisión crítica, decisiones, diseño | `design-auditor`, `plan-reviewer`, `spec-tester`, `delivery-auditor`, planificación, implementación de fórmulas, ADRs |

Reglas:
- Si la tarea consiste en ejecutar algo y resumir, o en buscar y listar, va a un agente ligero.
- Si requiere aplicar un checklist con criterio, va a un agente intermedio.
- Si un error tendría consecuencias en la corrección del producto (fórmulas, estados, esquemas, decisiones de arquitectura), la hace el modelo principal.
- Las decisiones nunca se delegan: los subagentes reportan y el agente principal (o una persona) decide.

## Subagentes

| Agente | Modelo | Edita | Uso |
|---|---|---|---|
| `explorer` | haiku | No | Encontrar código, docs y referencias del diseño |
| `verifier` | haiku | No | Ejecutar `pnpm verify` y resumir fallos |
| `duplication-auditor` | haiku | No | Duplicación (jscpd), código sin usar (knip), smells (sonarjs) |
| `docs-checker` | haiku | No | TSDoc, docs de reglas, changesets, diseño actualizado |
| `perf-benchmarker` | haiku | No | Benchmarks contra `main` y contra los presupuestos del diseño |
| `issue-writer` | haiku | No (solo issues en GitHub) | Milestone, etiquetas e issues de una fase con el formato de [08-git-workflow.md](08-git-workflow.md#issues) |
| `code-reviewer` | sonnet | No | Revisión contra [11-code-review.md](11-code-review.md) |
| `security-reviewer` | sonnet | No | Revisión contra [06-security.md](06-security.md) |
| `test-writer` | sonnet | Solo tests | Endurecimiento después del verde: casos borde, contratos, property-based |
| `design-auditor` | inherit | No | Conformidad exacta con `docs/design/` |
| `plan-reviewer` | inherit | No | Revisión del plan antes de implementar (puerta 0) |
| `spec-tester` | inherit | Solo tests | Tests de especificación `AC-n` antes de la implementación (fase roja del TDD) |
| `delivery-auditor` | inherit | No | Auditoría final estricta de la entrega (puerta 3), veredicto binario |

Los subagentes no ven la conversación principal: cada invocación debe incluir el alcance (archivos o ref) y la pregunta concreta.

## Comandos

| Comando | Qué hace |
|---|---|
| `/task <n\|archivo> [en paralelo con #M …]` | Lee el issue (número) o el archivo de `docs/tasks/`, comprueba que nadie más la tiene en curso, reúne contexto con `explorer`, presenta el plan con el veredicto de `plan-reviewer` y espera aprobación; después sigue el [pipeline de entrega](#pipeline-de-entrega). Con `en paralelo con #M` aplica las reglas de "Trabajo en paralelo" |
| `/deliver` | Puerta final: `delivery-auditor`; si aprueba, push de la rama, PR en borrador con `Closes #N` y resumen en el issue |
| `/verify [paquete]` | Ejecuta la verificación con `verifier` |
| `/review [ref]` | Revisión en paralelo con los agentes de revisión contra `ref` (por defecto `origin/main`); consolida un solo reporte |
| `/audit` | Auditoría de todo el repo y propuesta de tareas |
| `/adr <título>` | ADR nuevo desde la plantilla |
| `/plan-phase <fase>` | Divide una fase del roadmap en tareas; propone la lista y espera aprobación; después crea los archivos y, con `issue-writer`, el milestone y los issues |
| `/handoff` | Cierra la sesión: escribe una entrada en `docs/progress.md` y la comenta en el issue de la tarea |
| `/parallel [n …]` | Propone tareas Pendientes que se pueden hacer a la vez; tras la aprobación crea un worktree por tarea e imprime el comando para abrir una sesión en cada uno. `--cleanup` retira los worktrees de PRs mergeados |

## Flujo de una tarea

```
inicio de sesión → leer la última entrada de docs/progress.md
   ▼
siguiente tarea → issue abierto más antiguo del milestone actual
                  con las dependencias cerradas o Hechas y sin rama, PR ni worktree
   ▼
/task 25   (o /task docs/tasks/v1-04-hard-wait-rule.md)
   │  gh issue view → explorer reúne contexto → plan → plan-reviewer → aprobación (una persona)
   ▼
pipeline de entrega (ver abajo)
   │  rama → [TDD: stubs → spec-tester → rojo → commit] → implementación → test-writer
   │  /verify → /review → /deliver (delivery-auditor → push → PR en borrador)
   ▼
/handoff → entrada en docs/progress.md + comentario en el issue
   ▼
CI en verde → PR listo para revisión → revisión humana → merge (una persona) → el issue se cierra
```

Al cerrar una fase: `/audit` y luego `/plan-phase <siguiente fase>`.

## Pipeline de entrega

Cada tarea pasa por estos pasos ([ADR-0025](../adr/0025-pipeline-entrega-loop-autonomo.md)). Esta sección es la única fuente; los comandos remiten aquí.

1. **Plan:** archivos, enfoque, riesgos, la decisión `TDD: sí/no` ([04-testing.md](04-testing.md#tdd)) y el mapa `AC-n → archivo → test previsto` para cada criterio de aceptación del issue.
2. **Puerta 0, `plan-reviewer`:** `CAMBIOS` → se corrige el plan y se vuelve a pasar (máx. 2 rondas). `REQUIERE PERSONA` → la tarea se detiene.
3. **Aprobación:** una persona, después de ver el plan y el veredicto. El plan se comenta en el issue bajo `## Plan aprobado`, indicando quién lo aprobó, y el issue recibe la etiqueta `plan:approved`.
4. **Rama** `<tipo>/<n>-<nombre>` desde `origin/main` y comentario "Tarea iniciada" en el issue.
5. **Especificación (solo con TDD):**
   1. Stubs de las firmas públicas del plan, con TSDoc, que lanzan `new Error("not implemented")`.
   2. `spec-tester` escribe los tests `AC-n`.
   3. Rojo verificado: el agente principal ejecuta los tests y comprueba que cada `AC-n` falla por una assertion o por el stub.
   4. Commit `test(<scope>): specify <tarea>` con los stubs y los tests. Es el único commit que puede tener tests en rojo ([08-git-workflow.md](08-git-workflow.md#commits)). Nunca `--no-verify`: si un hook rechaza el commit, se corrige la causa.
6. **Implementación** mínima hasta verde y refactor con los tests en verde. Los tests `AC-n` no se tocan: si el implementador cree que uno está mal, lo devuelve a `spec-tester` con la justificación (máx. 1 ronda). Si `spec-tester` lo corrige, el cambio va en un commit `test(<scope>): revise AC-n` con el motivo en el cuerpo; si siguen en desacuerdo, la tarea se detiene. Sin TDD, los tests se escriben junto al código.
7. **Endurecimiento:** `test-writer`. Un bug que encuentre se arregla empezando por su test.
8. **Puerta 1, `/verify`:** máx. 3 rondas de corrección.
9. **Puerta 2, `/review`:** bloqueantes e importantes corregidos o justificados por escrito, y una segunda pasada de `code-reviewer` sobre las correcciones (máx. 2 rondas).
10. **Puerta 3, `/deliver`:** `delivery-auditor`; un `RECHAZADO` vuelve a la puerta 1 (máx. 2 rondas). Si aprueba: push, PR en borrador y resumen en el issue. Con la CI en verde, el PR pasa a listo para revisión. Después, `/handoff` añade al PR la entrada de `docs/progress.md` en un commit que solo toca ese archivo (y el archivo histórico); no se vuelve a auditar.

La tarea se detiene, sin entregar nada a medias, cuando se agota un límite o hace falta una decisión humana: un valor que el diseño no define, un ADR, un cambio de API pública o de esquema, una dependencia fuera de `17-tech-stack.md`, una decisión abierta de `CLAUDE.md`, un bloqueo de `test-guard`, un test existente que parece incorrecto o un desacuerdo sobre un test `AC-n`. El agente se detiene y pregunta.

## Trabajo en paralelo

Varias tareas de una fase se pueden hacer a la vez si están Pendientes (ver la tabla de estados en [08-git-workflow.md](08-git-workflow.md#estado)). Cada una va en su propio worktree de Git y en su propia sesión de Claude Code; cada tarea sigue el [pipeline de entrega](#pipeline-de-entrega) completo. Esta sección es la única fuente de las reglas; `/parallel` y `/task` remiten a ella.

```
/parallel   (en el repo principal)
   │  candidatos → propuesta → aprobación
   │  git worktree add --detach <padre>/atium-<n> origin/main + pnpm install
   ▼
un comando por tarea, cada uno en su pestaña de terminal:
   cd <padre>/atium-10 && claude "/task 10 en paralelo con #11"
   cd <padre>/atium-11 && claude "/task 11 en paralelo con #10"
   ▼
flujo normal en cada sesión → PRs → merge de uno en uno (una persona)
   ▼
/parallel --cleanup → retira los worktrees de PRs mergeados
```

`<padre>` es el directorio que contiene el repo principal. Los worktrees se crean desde `origin/main`, así que usan los comandos de `.claude/` que haya en `main`; `.claude/settings.local.json` no se copia.

### Cuándo conviene

- Dos tareas a la vez; tres como máximo. Con más, el límite es la revisión humana, no los agentes. También sirve con una sola tarea, para trabajarla en un worktree sin tocar el repo principal.
- Si hay una tarea de la cadena principal (la que más issues abiertos desbloquea, directa o indirectamente), entra en el conjunto y se mergea primero.
- Se evitan dos tareas que trabajen en el mismo módulo.

### Archivos compartidos

Archivos que varias tareas suelen tocar a la vez:

- `index.ts` del paquete, `defaults.ts`, el registro de códigos de error y `package.json`.
- `pnpm-lock.yaml`, si la tarea agrega dependencias.
- `docs/progress.md` (siempre) y `docs/progress-archive.md` (cuando `/handoff` archiva entradas).

### Reglas para cada sesión

Las aplica `/task <n> en paralelo con #M`:

- No toca el alcance de las otras tareas.
- En los archivos compartidos solo añade líneas: exports en su posición alfabética y constantes en un bloque propio al final. No reordena ni reformatea lo existente. Aun así, dos bloques añadidos al final chocan: es un conflicto esperado y se resuelve conservando ambos.
- Crea su rama desde `origin/main`: dentro de un worktree no se puede usar `main`, que está activa en el repo principal.
- Revisa contra `origin/main` (`/review` lo usa por defecto).

### Cuando otra tarea se mergea antes

Actualiza la rama con `git fetch origin && git merge origin/main`. Merge, no rebase: el PR se mergea con squash ([08-git-workflow.md](08-git-workflow.md#pull-requests)), así que el historial de la rama da igual y no hace falta force push. Al resolver conflictos:

- `docs/progress.md` y `docs/progress-archive.md`: conserva las entradas de ambos lados, ordenadas de la más reciente a la más antigua, y deja las 10 más recientes en `progress.md`.
- `pnpm-lock.yaml`: toma la versión de `origin/main` y regenera con `pnpm install`.
- Bloques añadidos en ambos lados (exports, constantes, códigos de error): conserva ambos.
- Cualquier conflicto que toque lógica existente: no lo resuelvas por tu cuenta. Detente, explica el conflicto y pregunta.
- Después, vuelve a la puerta 1 del pipeline: `/verify`, `/review` y `/deliver`, que hace el push.

## Hooks

| Evento | Acción | Notas |
|---|---|---|
| Antes de editar, escribir o ejecutar un comando | `test-guard` (`.claude/hooks/test-guard.mjs`): bloquea cambios que quitan assertions o casos de test, agregan `.skip` / `.only` / `.todo` / `.fixme` / `xit`, o borran o mueven archivos de test | Excluye `examples/` y `fixtures/`. Si el hook falla internamente, permite el cambio (fail-open). Se desactiva para una sesión con `ATIUM_TEST_GUARD=off` |
| Después de editar o escribir un archivo | Prettier sobre ese archivo (`.claude/hooks/format.mjs`) | Nunca bloquea: si falla, lo omite con un aviso |

### Cuando `test-guard` bloquea

El agente se detiene, explica por qué quería hacer el cambio y pide aprobación. Si el cambio es legítimo (por ejemplo, mover assertions a un helper o reemplazar un test por uno mejor):

- Haz el cambio tú mismo, o
- Inicia la sesión con `ATIUM_TEST_GUARD=off` solo para esa tarea.

Limitación conocida: el guard cuenta assertions y casos por texto. No detecta una tabla de `it.each` que pierde filas ni una assertion que se relaja (`toBe` → `toBeDefined`); eso lo revisa `code-reviewer`.

No se ejecuta `pnpm verify` en un hook: es lento y se ejecuta explícitamente con `/verify`.

## Permisos

`.claude/settings.json` define:
- **Permitido sin preguntar:** comandos de verificación, lectura de git y gh, y el script de push `node .claude/scripts/push-branch.mjs`.
- **Prohibido:** `git push` (el agente solo empuja con el script), publicar paquetes, leer `.env`, editar `fixtures/` (se generan con `pnpm fixtures:generate`), cerrar issues, mergear o cerrar PRs, y editar `.claude/settings.json`, `.claude/hooks/` o `.claude/scripts/` (para que el agente no pueda desactivar sus propios controles; esos archivos los cambia una persona).

Todo lo demás pide confirmación. Los permisos se comparan por prefijo del comando y no cubren todas las variantes de un comando: por eso el push pasa por un script que valida la rama y construye el refspec, y la garantía final es el ruleset de `main` en GitHub ([08-git-workflow.md](08-git-workflow.md#ramas)).

## GitHub (`gh`)

El agente usa `gh` para leer y escribir issues y PRs del repo. El formato de los issues está en [08-git-workflow.md](08-git-workflow.md#issues).

- **Lectura:** `gh issue view`, `gh issue list`, `gh label list`, `gh pr view`, `gh pr list`, `gh pr checks`.
- **Escritura (pide confirmación):** `gh issue create`, `gh issue edit`, `gh issue comment`, `gh label create`, `gh pr create`, `gh pr ready`, `gh pr edit`, `gh pr comment`.
- **`gh api`:** solo para crear el milestone de una fase (`/plan-phase`, `issue-writer`). No se deniega en los permisos porque `/plan-phase` lo necesita; el límite lo imponen los prompts.
- **Nunca:** cerrar, borrar o transferir issues, mergear o cerrar PRs, ni hacer push fuera de `.claude/scripts/push-branch.mjs`. Mergear y cerrar lo hace una persona.
- Los cuerpos largos se pasan con `--body-file` desde un directorio temporal fuera del repo.

## Auditorías periódicas

`/audit` al cerrar cada fase del roadmap, y cada vez que `jscpd` o `knip` muestren una tendencia creciente. Los hallazgos se convierten en tareas en `docs/tasks/`, no en arreglos directos.

## Memoria entre sesiones

Claude Code no recuerda sesiones anteriores. La continuidad vive en el repositorio:

| Archivo | Qué guarda |
|---|---|
| `docs/tasks/` | Especificación de cada tarea |
| GitHub Issues | Estado de cada tarea (abierto, en curso, cerrado) y comentarios de cada sesión |
| `docs/progress.md` | Contexto de las últimas sesiones: qué quedó a medias, decisiones, problemas y siguiente paso |
| `docs/adr/` | Decisiones permanentes |

Cada sesión empieza leyendo la última entrada de `docs/progress.md` y termina con `/handoff`. Una decisión que solo quedó en una conversación se considera perdida.

## Límites

- Los resúmenes de subagentes pueden omitir detalles: el agente principal verifica en el código cada hallazgo bloqueante antes de actuar.
- Los subagentes de revisión no reemplazan la revisión humana de fórmulas, esquemas públicos y decisiones de diseño. `plan-reviewer` y `delivery-auditor` usan el mismo modelo que el agente: son controles de calidad, no una revisión independiente ni una barrera de seguridad.
- `test-guard` es heurístico y fail-open: ayuda, pero no garantiza que ningún test se debilite; por eso `delivery-auditor` compara los tests `AC-n` con su commit de especificación.
- El agente ejecuta código del repositorio (tests, scripts de `package.json`, hooks) con las credenciales de la persona; no hay aislamiento.
