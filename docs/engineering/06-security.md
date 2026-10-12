# Seguridad

Complementa [20-security-privacy.md](../design/20-security-privacy.md) con reglas para escribir el código.

## Entradas

- Toda entrada externa se valida con Zod antes de usarse: configuración, reportes, archivos del storage, payloads de CI, variables de entorno.
- Se limita el tamaño de la entrada **antes** de procesarla (mensajes, stacks, archivos).
- Las expresiones regulares que procesan texto no confiable no usan cuantificadores anidados (`(a+)+`), para evitar ReDoS. Los normalizadores tienen tests con entradas largas que verifican tiempo lineal.

## Ejecución de código y procesos

- Prohibido `eval`, `new Function` y `vm` con datos.
- Los plugins solo se cargan desde la configuración del usuario; nunca a partir de datos analizados ni del storage.
- Procesos externos con `execFile` o `spawn` y un **arreglo de argumentos**; nunca strings con interpolación pasados a una shell.

```ts
// ✗
exec(`git log ${branch}`);

// ✓
execFile("git", ["log", branch]);
```

- Git se usa a través de simple-git, que ya cumple esta regla.

## Rutas de archivos

- Toda ruta que viene de datos (artefactos en reportes, rutas de fixtures, rutas en el storage) se resuelve y se verifica que quede dentro de la raíz del repo o del directorio temporal permitido.
- Las rutas guardadas en el modelo son relativas y en formato POSIX.
- Usa `resolveInside` de `@atium/core`. Compara con `path.relative` en lugar de `startsWith`, para no fallar con la raíz `/` ni con mayúsculas distintas en la unidad de Windows. Rechaza la propia raíz, `..`, `../…`, rutas en otra unidad y rutas con NUL.
- En Windows rechaza además los nombres que Windows no abriría tal cual: con punto o espacio final, o nombres de dispositivo (`CON`, `PRN`, `AUX`, `NUL`, `COM0`–`COM9` y `LPT0`–`LPT9`, también con `¹`, `²` o `³`, y con cualquier extensión).
- La comprobación es léxica: no sigue symlinks. Un symlink dentro de la raíz que apunte fuera no se detecta; antes de escribir o borrar, resuelve la ruta con `fs.realpath`.
- Los mensajes de error citan la ruta con `JSON.stringify`, para no arrastrar caracteres de control, y la recortan a 200 bytes (`ERROR_PATH_PREVIEW_BYTES`).

```ts
import { resolveInside } from "@atium/core";

const trace = resolveInside(repoRoot, attachment.path); // AtiumError MODEL_INVALID si escapa
```

## Secretos y datos sensibles

- Credenciales solo por variables de entorno; nunca en archivos de configuración ni en el repo.
- La redacción se aplica antes de persistir y antes de registrar en logs.
- La redacción tiene tests propios con ejemplos de cada patrón (JWT, bearer, claves de nube).
- Los mensajes de error nunca incluyen valores de variables sensibles.

## Reporte HTML

- Todo dato del usuario se escapa. React lo hace por defecto; `dangerouslySetInnerHTML` está prohibido.
- El HTML incluye una política CSP que no permite scripts externos.

### Accesibilidad del reporte

- HTML semántico (`table`, `nav`, `main`, encabezados en orden).
- Navegación completa con teclado y foco visible.
- El estado nunca se comunica solo con color: cada estado tiene texto o ícono con etiqueta (`flaky`, `broken`).
- Contraste mínimo WCAG AA en temas claro y oscuro.

## Dependencias

- Se agregan solo si están en [17-tech-stack.md](../design/17-tech-stack.md) o se justifican en el PR.
- Antes de agregar una: mantenimiento activo, licencia compatible, tamaño, dependencias transitivas.
- Lockfile versionado.
- Scripts de instalación de dependencias deshabilitados salvo una lista explícita (`allowBuilds` de pnpm en `pnpm-workspace.yaml`, con `strictDepBuilds: true`; reemplaza a `onlyBuiltDependencies` desde pnpm 11). Las dependencias cuyo script no hace falta se listan con `false` (por ejemplo `esbuild`, cuyo binario llega por un paquete opcional). `lefthook` está permitido: su `postinstall` solo ejecuta `lefthook install` para registrar los hooks de Git y no hace nada si `CI` está definido.
- Renovate con espera mínima de 14 días antes de proponer una versión nueva.
- `minimumReleaseAge: 20160` (14 días, en minutos) en `pnpm-workspace.yaml`: pnpm solo resuelve versiones con esa antigüedad, incluidas las transitivas, y rechaza un lockfile con entradas más nuevas (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`). Si una actualización lo exige, se regenera con `pnpm clean --lockfile && pnpm install`.
- `pnpm audit --audit-level high` en CI (job `audit` de `.github/workflows/verify.yml`): una advisory high o critical bloquea el merge. Si el parche todavía no cumple los 14 días de `minimumReleaseAge`, se espera a que los cumpla en lugar de saltarse la regla.

## Publicación

- Solo desde CI, nunca desde una máquina local.
- npm con provenance y 2FA en la cuenta de la organización.

## GitHub Actions

- Actions de terceros fijadas por SHA del commit de una release oficial, no por tag, con la versión en un comentario (`# v7.0.1`). Renovate las actualiza.
- `permissions:` mínimos en cada workflow.
- Nunca `pull_request_target` con checkout del código del PR.
