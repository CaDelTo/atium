# Flujo de Git

## Idioma

| Elemento | Idioma |
|---|---|
| Código, identificadores y comentarios | Inglés |
| Mensajes de commit, títulos y descripciones de PR | Inglés |
| Documentos de diseño y ADRs | Español |
| Documentación pública para usuarios, incluidas las páginas de cada regla | Inglés ([ADR-0020](../adr/0020-idioma-documentacion-publica.md)) |
| Mensajes del CLI y de las reglas, reportes y comentarios en PR | Inglés ([ADR-0019](../adr/0019-idioma-mensajes-cli-reglas.md)) |

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
- Ramas cortas: `feat/<scope>-<descripcion>`, `fix/<scope>-<descripcion>`.

## Pull requests

- Una tarea por PR.
- Menos de 400 líneas cambiadas, sin contar fixtures ni archivos generados. Si es más grande, se divide.
- Plantilla:

```markdown
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
