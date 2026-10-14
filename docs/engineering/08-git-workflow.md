# Flujo de Git

## Idioma

| Elemento | Idioma |
|---|---|
| Código, identificadores y comentarios | Inglés |
| Mensajes de commit, títulos y descripciones de PR | Inglés |
| Documentos de diseño y ADRs | Español |
| Documentación pública para usuarios, incluidas las páginas de cada regla | Inglés ([ADR-0020](../adr/0020-idioma-documentacion-publica.md)) |
| Mensajes del CLI y de las reglas, reportes y comentarios en PR | Inglés ([ADR-0019](../adr/0019-idioma-mensajes-cli-reglas.md)) |
| Issues de tareas y sus comentarios | Español |

## Commits

Conventional Commits, con el paquete como scope:

```
feat(flaky): add flip rate computation
fix(core): keep fingerprint stable when stack has no user frames
test(storage-s3): run storage contract against MinIO
docs(design): clarify broken vs flaky precedence
refactor(cli): lazy-load ESLint in lint command
chore(deps): update vitest
```

Tipos: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`. Un cambio incompatible lleva `!` (`feat(core)!: ...`) y una sección `BREAKING CHANGE:` en el cuerpo.

Cada commit compila y pasa los tests. La única excepción es el commit de especificación del TDD (`test(<scope>): specify …`): compila, pero sus tests `AC-n` fallan a propósito ([04-testing.md](04-testing.md#tdd)). Como los PRs se mergean con squash, `main` nunca lo ve.

## Ramas

- `main` siempre verde; sin push directo. Lo garantiza el ruleset `protect-main` de GitHub, sin excepciones en su bypass list (el agente usa la cuenta de la persona, así que una excepción para ella también lo sería para él):
  - bloquea borrados y force push, y exige historial lineal;
  - exige PR con merge por squash (0 aprobaciones: GitHub no deja aprobar un PR propio);
  - todavía no exige checks de CI: los `verify (<os>, Node <n>)` fallan también en `main` por causas preexistentes. Cuando `main` vuelva a estar en verde se añadirán como checks requeridos, con la rama al día (y `audit` cuando deje de fallar por avisos preexistentes). Hasta entonces, la persona comprueba la CI de cada PR antes de mergear.
- El agente solo hace push de ramas de tarea y solo con `node .claude/scripts/push-branch.mjs <rama>`, que valida el nombre y empuja exactamente `refs/heads/<rama>` ([ADR-0025](../adr/0025-pipeline-entrega-loop-autonomo.md)). `git push` sigue denegado en los permisos: así no hay forma de pasarle un refspec a `main`, `--force` o un borrado. El ruleset solo protege `main`: las ramas de tarea aceptan cualquier commit de quien tenga permiso de escritura, y por eso cada PR se revisa antes de mergear.
- Ramas cortas: `<tipo>/<n>-<nombre>`.
  - `<tipo>` es uno de los tipos de commit (`feat`, `fix`, `chore`, `docs`…).
  - `<n>` es el número del issue.
  - En una tarea, `<nombre>` es el nombre del archivo sin el prefijo `vN-nn-`. Ejemplo: `feat/6-errors-result-failopen` para el issue #6 de `docs/tasks/v0-05-errors-result-failopen.md`.
  - Excepción: el PR de handoff de `/dev-loop` usa la fecha en lugar del número (`docs/<AAAAMMDD>-dev-loop-handoff-<hhmm>`).

## Issues

El estado de las tareas vive en GitHub Issues; la especificación sigue en `docs/tasks/<archivo>`. Esta sección es la única fuente del formato: la usan el agente, `/task`, `/handoff`, `/plan-phase` y el subagente `issue-writer`.

### Formato de un issue de tarea

- Título: `[vN-xx] <título de la tarea>`, con el título del encabezado `#` del archivo. Ejemplo: `[v0-08] Identidad de tests y rutas`.
- Etiquetas: `phase:vN` y `type:task`.
- Milestone: el de la fase (`V0`, `V1`…).
- Cuerpo:

```markdown
https://github.com/CaDelTo/atium/blob/main/docs/tasks/<archivo>

## Dependencias

Depende de #N

## Criterios de aceptación

- [ ] <criterio copiado literalmente del archivo>
```

- `## Dependencias` tiene una línea por dependencia:
  - `Depende de #N` si la dependencia tiene issue.
  - `Depende de vN-xx (Hecha)` si ya estaba hecha y no tiene issue.
  - `Ninguna` si la tarea no tiene dependencias.
- `## Criterios de aceptación` copia literalmente cada criterio del archivo como `- [ ]`. No se agrega texto que no esté en el archivo.

### Creación

- El milestone se crea con `gh api -X POST repos/CaDelTo/atium/milestones -f title=<fase>`. Es el único uso permitido de `gh api`; si responde 422 `already_exists`, el milestone ya existe.
- Las etiquetas se crean con `gh label create` solo si `gh label list` no las muestra.
- Es idempotente: si ya existe un issue (abierto o cerrado) cuyo título empieza por el mismo `[vN-xx]`, no se crea otro.
- Se crea en dos pasadas: primero todos los issues de la fase, con las dependencias que aún no tienen issue escritas como `Depende de vN-xx`; después se editan los cuerpos con los números reales.
- Los cuerpos se pasan con `--body-file`.
- El enlace del cuerpo funciona cuando el archivo de la tarea llega a `main`; hasta entonces, el archivo se localiza por el prefijo `[vN-xx]` del título.

### Estado

| Estado | En GitHub |
|---|---|
| Pendiente | Abierto, sin rama, PR ni worktree, con todas sus dependencias cerradas o Hechas |
| En curso | Abierto, con rama, PR o worktree `atium-<n>` (creado por `/parallel`) |
| Bloqueada | Abierto, sin rama, PR ni worktree, con alguna dependencia abierta |
| Necesita una persona | Abierto, con la etiqueta `loop:blocked` y la pregunta en un comentario. Tiene prioridad sobre los demás estados abiertos: ni `/dev-loop` ni `/parallel` lo toman |
| Hecha | Cerrado |

La siguiente tarea es el issue Pendiente más antiguo del milestone actual: abierto, con sus dependencias cerradas o Hechas y sin rama, PR ni worktree. El milestone actual es el milestone abierto de la fase más baja. Varias tareas Pendientes se pueden hacer a la vez con `/parallel` (ver "Trabajo en paralelo" en [12-ai-workflow.md](12-ai-workflow.md#trabajo-en-paralelo)).

### Quién hace qué

- `/task` y `/dev-loop` comentan en el issue el plan aprobado (`## Plan aprobado`) y que la tarea empezó; `/deliver` y `/handoff` comentan el resumen.
- Etiquetas de trabajo (las crea con `gh label create` el primer comando que las necesita):

  | Etiqueta | Dónde | Quién la pone | Significado |
  |---|---|---|---|
  | `plan:approved` | Issue | `/task`, tras la aprobación de la persona; `/dev-loop`, tras el `APROBADO` de `plan-reviewer` | El plan comentado en el issue está aprobado |
  | `loop:blocked` | Issue | `/dev-loop`; la quita solo la persona, al responder | La tarea necesita una decisión humana |
  | `loop` | PR | `/deliver --loop`, al crear el PR | PR del loop; cuenta para `--max-open-prs` |
- El PR de la tarea incluye `Closes #<n>`, y el issue se cierra al mergear.
- Solo una persona cierra issues y mergea PRs. El agente nunca cierra, borra ni transfiere issues.

## Pull requests

- Una tarea por PR.
- Menos de 400 líneas cambiadas, sin contar fixtures ni archivos generados. Si es más grande, se divide.
- Plantilla (`.github/pull_request_template.md`):

```markdown
Closes #<n>

## What
## Why
Design refs: docs/design/XX-*.md §N
## How it was verified
## Breaking changes / ADR
```

- El agente abre el PR en borrador (`/deliver`) y lo pasa a listo para revisión (`gh pr ready`) cuando la CI está en verde. El cuerpo incluye la tabla `criterio → evidencia` de `delivery-auditor`.
- Requisitos para mergear: CI verde, changeset si cambia un paquete publicado, diseño actualizado si cambió un comportamiento descrito.
- Squash merge, con el título del PR en formato Conventional Commits.

## Hooks locales

Con lefthook:

| Hook | Ejecuta |
|---|---|
| `pre-commit` | Prettier y ESLint sobre los archivos en stage |
| `commit-msg` | commitlint |
| `pre-push` | `pnpm typecheck` |

Los hooks son una ayuda; CI es la verificación real.
