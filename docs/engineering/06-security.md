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

```ts
export function resolveInside(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new AtiumError("MODEL_INVALID", `Path escapes project root: ${relative}`);
  }
  return resolved;
}
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
- Scripts de instalación de dependencias deshabilitados salvo una lista explícita (`onlyBuiltDependencies` de pnpm).
- Renovate con espera mínima de 14 días antes de proponer una versión nueva.
- `pnpm audit` en CI.

## Publicación

- Solo desde CI, nunca desde una máquina local.
- npm con provenance y 2FA en la cuenta de la organización.

## GitHub Actions

- Actions de terceros fijadas por SHA, no por tag.
- `permissions:` mínimos en cada workflow.
- Nunca `pull_request_target` con checkout del código del PR.
