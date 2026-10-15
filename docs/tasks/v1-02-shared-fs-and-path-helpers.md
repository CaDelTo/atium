# Helpers compartidos de errores de archivo y rutas

- ID: v1-02-shared-fs-and-path-helpers
- Fase: V1
- Paquete: packages/core, packages/cli, packages/storage/sqlite
- Depende de: ninguna
- Origen: `/audit` de cierre de V0 (#20)

## Contexto

- Estándares: docs/engineering/02-code-design.md, docs/engineering/07-public-api.md
- Diseño: docs/design/18-cli-config.md §26.1, docs/design/15-storage.md

## Hacer

Quitar el conocimiento duplicado entre paquetes que el audit encontró:

- `errnoCode`: `packages/cli/src/project/project-files.ts:146` repite `packages/core/src/errno.ts:8`.
- `isMissing` (`project-files.ts:153`) repite `isMissingFileError` de `packages/core/src/config/config-file.ts:94` (ENOENT o ENOTDIR).
- `displayPath`: `packages/cli/src/doctor/checks/config.ts:62` y el privado de `packages/core/src/config/load-config.ts:62` divergen. Core usa `relative.startsWith("..")`, que trata un archivo llamado `..foo.ts` dentro del directorio como si estuviera fuera; cli compara con `..${path.sep}`. Unificar en la versión de cli y añadir el test de `..foo.ts`.
- La raíz `.atium` está en tres `defaults.ts` (core `RUNS_DIRECTORY`, cli `ATIUM_DIRECTORY`, sqlite `SQLITE_DATABASE_PATH`), y el proveedor `"local"` en `core/src/ci/detect-run-context.ts:37` y en `cli/src/doctor/checks/ci.ts:8`. Que cli y sqlite los tomen de core.

## Decisiones abiertas en esta tarea

- Exportar estos helpers desde `@atium/core` amplía su API pública (07-public-api.md). Proponer en el plan si van al índice principal, a un subpath interno o si se justifica dejar alguno duplicado.
  - **Resuelto por la persona (plan aprobado en #42):**
    - `errnoCode`, `isMissingFileError`, `displayPath`, `ATIUM_DIRECTORY` y `LOCAL_PROVIDER` se exportan desde el índice principal de `@atium/core`, como `resolveInside` y `CONFIG_FILE_NAMES`. No van a `@atium/core/pure`, cuyo test exige que solo exporte lo que también exporta la raíz y cuya lista de módulos fija ADR-0023, ni a un subpath nuevo. Es un cambio aditivo y core es `private`, así que no lleva ADR ni changeset.
    - `ATIUM_DIRECTORY` se queda duplicado en cli, como excepción al primer criterio. `messages.ts` lo usa en la ayuda, y `atium --help` no carga `@atium/core` (05-performance.md, "Arranque del CLI"). `packages/cli/src/defaults.test.ts` comprueba que vale lo mismo que el de core.

## Criterios de aceptación

- Cada regla vive en un solo sitio; cli y sqlite la importan por nombre de paquete.
- Test que reproduce la divergencia de `displayPath` antes de arreglarla.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Cambiar el comportamiento de los mensajes de error más allá de `displayPath`.
