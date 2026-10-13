# Regla cross-file E2E007: analizador `lint-crossfile` y selector repetido

- ID: v1-32-crossfile-e2e007
- Fase: V1
- Paquete: packages/analyzers/lint-crossfile
- Depende de: v1-23, v1-30

## Contexto

- Diseño: docs/design/03-linter.md §11.4 (E2E007) y §11.5
- ADRs: 0004, 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Crear `packages/analyzers/lint-crossfile` (`@atium/analyzer-lint-crossfile`), con sus capas en `.dependency-cruiser.cjs`:
  - el `Analyzer` de v1-23, con `kind: "static"`;
  - su `configSchema` con los umbrales cross-file, en `analyzers["lint-crossfile"]` (ADR-0023), y `rules` (código a `"on"` u `"off"`, con los valores por defecto del catálogo, 03-linter.md §11.8 y §11.10);
  - obtiene el `SuiteIndex` según ADR-0023.
- Estructura de una regla cross-file: una función pura de `SuiteIndex` y config a Findings. Las reglas se registran en el analizador.
- E2E007: el mismo selector normalizado (v1-10) en N archivos o más fuera de `pageObjectDirs`. Por defecto N = 3, en `defaults.ts` (§11.4).
- Severidad, categoría y confianza según el catálogo de 03-linter.md §11.8 (ADR-0023). Fingerprint con `lintFingerprint` (v1-22).
- Mensajes en inglés (ADR-0019) y página de documentación de la regla (ADR-0020).

## Criterios de aceptación

- Tests con `SuiteIndex` construidos con builders: el selector en 2 archivos no reporta, en 3 sí, y si está dentro de `pageObjectDirs` no cuenta.
- Test del analizador con el orquestador de v1-23 y una config inválida (error de config con su mensaje).
- Test de que la regla es pura: el mismo `SuiteIndex` da los mismos Findings, en el mismo orden.
- La página de documentación de la regla existe.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Integración en `atium lint` (v1-38).
