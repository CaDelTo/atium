# API pública y compatibilidad

## Qué es público

Cambiar cualquiera de estos elementos afecta a usuarios:

| Elemento | Dónde |
|---|---|
| Exports de cada paquete | `src/index.ts` y `exports` en `package.json` |
| Comandos, flags y exit codes del CLI | [18-cli-config.md](../design/18-cli-config.md) |
| Esquema de configuración | `atium.config.ts` |
| Esquema de archivos de run | `schemaVersion` |
| Esquema del reporte JSON y de `Finding` | JSON Schema publicado |
| IDs de reglas | `E2E001`, `BDD001`, etc. |
| Nombres de reglas en ESLint | `atium/no-hard-wait`, etc. ([03-linter.md §11.8](../design/03-linter.md#118-catálogo-de-reglas)) |
| Códigos de error | `ErrorCode` |
| Variables de entorno | `ATIUM_*` |

Todo lo que no está en esta lista es interno y puede cambiar sin aviso; por ejemplo, el JSON de `atium doctor --format json` en V0.

Excepción: los subpaths `@atium/core/testing` (builders y fakes) y `@atium/core/test-contracts` (suites de contrato) son internos aunque estén en `exports`. Solo los usan los tests de los paquetes de Atium y pueden cambiar sin aviso ni changeset. Lo mismo vale para `@atium/core/pure` y `@atium/eslint-plugin/syntax` ([ADR-0023](../adr/0023-arquitectura-linter.md)): solo los usan otros paquetes de Atium, que se publican con versiones coherentes. `test-contracts` es solo ESM porque importa Vitest, y `attw` lo excluye.

## Versionado

- Semver estricto en cada paquete.
- Antes de 1.0: un cambio incompatible incrementa la versión minor y se documenta en el changeset.
- Desde 1.0: un cambio incompatible requiere versión major.

## Deprecaciones

- Un elemento público se marca como deprecado al menos una versión minor antes de eliminarlo.
- Una clave de configuración renombrada conserva la anterior como alias, con aviso al usarla.
- Un flag del CLI renombrado conserva el anterior como alias, con aviso.
- Una regla de ESLint renombrada conserva el nombre anterior como alias deprecado ([ADR-0023](../adr/0023-arquitectura-linter.md)).
- Los IDs de reglas y códigos de error nunca se reutilizan para otra cosa.

## Esquemas versionados

- Los esquemas de datos persistidos llevan versión (diseño, sección 9.5).
- Los lectores soportan la versión actual y la anterior.
- Un cambio de esquema incluye su migración y tests con archivos de la versión anterior.

## Multiplataforma

- Rutas guardadas o comparadas: `path.posix`, relativas a la raíz del repo.
- Rutas para leer o escribir archivos: `path` del sistema.
- Sin suposiciones sobre finales de línea (`\n` vs `\r\n`) al leer archivos.
- Sin comandos de shell específicos de un sistema operativo.
- CI ejecuta los tests en Linux, macOS y Windows.

## Paquetes correctos

- Cada paquete declara `exports`, `types`, `engines` y `files`. Excepción: `@atium/cli` no tiene API programática ni `src/index.ts`; su API pública son el binario `atium` (`bin`), sus comandos, flags y códigos de salida, y `exports` solo expone `./package.json`.
- `publint` y `@arethetypeswrong/cli` verifican que la publicación ESM/CJS y los tipos funcionan para los consumidores.
