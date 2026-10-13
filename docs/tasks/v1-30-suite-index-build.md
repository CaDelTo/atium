# Índice de la suite: construcción y resolución entre archivos

- ID: v1-30-suite-index-build
- Fase: V1
- Paquete: packages/suite-index
- Depende de: v1-29

## Contexto

- Diseño: docs/design/03-linter.md §11.4, docs/design/01-requirements.md §7 y §8 (TypeScript y proyectos JS)
- ADRs: 0005, 0006
- Estándares: docs/engineering/02-code-design.md (I/O en `suite-index`), 05-performance.md, 06-security.md (rutas)

## Hacer

- `buildSuiteIndex({ root, include, exclude, logger, signal })`:
  - descubre los archivos con tinyglobby, sin salir de la raíz;
  - los parsea con el parser de typescript-eslint y el project service de TypeScript;
  - construye un `SuiteIndex` con los `FileIndex` de v1-29.
- **Resolución entre archivos:**
  - de cada import y llamada a helper, a su definición;
  - referencias a cada export, para E2E011;
  - helpers importados hasta 2 niveles, para E2E006b.
- **Errores y degradación:**
  - un archivo que no se puede parsear se omite con aviso y no detiene el índice;
  - sin `tsconfig`, se degrada a resolución por rutas relativas (§8).
- Rutas POSIX relativas a la raíz con `toPosixRelative`.
- TypeScript y typescript-eslint se importan de forma diferida (05-performance.md).

## Criterios de aceptación

- Tests sobre un proyecto temporal:
  - resolución de un helper importado a 1 y 2 niveles;
  - re-exports;
  - un archivo con error de sintaxis omitido con aviso;
  - un proyecto sin `tsconfig`.
- Test de que un symlink o un glob que sale de la raíz no se lee.
- Test de que el resultado no depende del orden en que tinyglobby devuelve los archivos.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Caché (v1-31).
- Reglas cross-file (v1-32 a v1-36).
