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

Cada commit compila y pasa los tests.

## Ramas

- `main` siempre verde; sin push directo.
- Ramas cortas: `<tipo>/<n>-<nombre>`.
  - `<tipo>` es uno de los tipos de commit (`feat`, `fix`, `chore`, `docs`…).
  - `<n>` es el número del issue.
  - En una tarea, `<nombre>` es el nombre del archivo sin el prefijo `vN-nn-`. Ejemplo: `feat/6-errors-result-failopen` para el issue #6 de `docs/tasks/v0-05-errors-result-failopen.md`.

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
| Pendiente | Abierto, sin rama ni PR, con todas sus dependencias cerradas o Hechas |
| En curso | Abierto, con rama o PR |
| Bloqueada | Abierto, sin rama ni PR, con alguna dependencia abierta |
| Hecha | Cerrado |

La siguiente tarea es el issue abierto más antiguo del milestone actual cuyas dependencias estén cerradas o Hechas. El milestone actual es el milestone abierto de la fase más baja.

### Quién hace qué

- `/task` comenta en el issue que la tarea empezó; `/handoff` comenta el resumen de cada sesión.
- El PR de la tarea incluye `Closes #<n>`, y el issue se cierra al mergear.
- Solo una persona cierra issues y mergea PRs. El agente nunca cierra, borra ni transfiere issues.

## Pull requests

- Una tarea por PR.
- Menos de 400 líneas cambiadas, sin contar fixtures ni archivos generados. Si es más grande, se divide.
- Plantilla:

```markdown
Closes #<n>

## What
## Why
Design refs: docs/design/XX-*.md §N
## How it was verified
## Breaking changes / ADR
```

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
