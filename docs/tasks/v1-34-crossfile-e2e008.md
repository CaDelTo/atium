# Regla cross-file E2E008: dependencia entre tests

- ID: v1-34-crossfile-e2e008
- Fase: V1
- Paquete: packages/analyzers/lint-crossfile
- Depende de: v1-32

## Contexto

- Diseño: docs/design/03-linter.md §11.4 (E2E008) y §11.5
- ADRs: 0004, 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar:
  - `describe.serial` y `mode: "serial"`;
  - variables de módulo asignadas en un test y leídas en otro;
  - archivos escritos por un test y leídos por otro, con rutas literales.
- Severidad, categoría y confianza según el catálogo de v1-07. Fingerprint con `lintFingerprint` (v1-22).
- Mensajes en inglés (ADR-0019) y página de documentación de la regla (ADR-0020).

## Decisiones abiertas en esta tarea

- Qué llamadas cuentan como "escribir" y "leer" un archivo (`fs.writeFile`, `page.screenshot({ path })`, `storageState`…).
- Si un `beforeAll` que asigna y los tests que leen cuentan como dependencia: es un patrón habitual y legítimo.

## Criterios de aceptación

- Tests de cada uno de los tres patrones de §11.4, y del caso del hook, según lo decidido.
- Test de que la regla es pura: el mismo `SuiteIndex` da los mismos Findings, en el mismo orden.
- La página de documentación de la regla existe.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Integración en `atium lint` (v1-38).
