# Índice de la suite: extracción por archivo

- ID: v1-29-suite-index-file
- Fase: V1
- Paquete: packages/suite-index
- Depende de: v1-09, v1-10

## Contexto

- Diseño: docs/design/03-linter.md §11.4, docs/design/16-repository-structure.md §24
- ADRs: 0005 y el de v1-07 (capas)
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 05-performance.md

## Hacer

- Crear `packages/suite-index` (`@atium/suite-index`), con sus capas en `.dependency-cruiser.cjs` y 02-code-design.md, según v1-07.
- Esquema Zod de `FileIndex`. Es interno y versionado, porque se cachea en v1-31. Contiene:
  - tests, con su `titlePath`, rango, secuencia de acciones normalizada (acción + nivel de selector, §11.4 E2E013) y assertions;
  - locators, con el selector normalizado y su nivel (v1-10);
  - helpers y fixtures definidos;
  - imports y exports;
  - escrituras y lecturas de variables de módulo y de archivos (E2E008).
- `extractFileIndex(ast, source, options)`: pura, a partir del AST de typescript-eslint, con los helpers de v1-09 y v1-10.
- Documentar la forma del índice en §11.4.

## Criterios de aceptación

- Tests sobre fuentes de Playwright con builders de código: tests anidados en describes, Page Objects, helpers exportados e imports con alias.
- Test de que extraer dos veces la misma fuente da el mismo `FileIndex`.
- El `FileIndex` de un archivo sin tests es válido y vacío.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Leer archivos, el project service y la resolución entre archivos (v1-30).
- Caché (v1-31).
