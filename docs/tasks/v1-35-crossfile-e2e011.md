# Regla cross-file E2E011: código de test sin usar

- ID: v1-35-crossfile-e2e011
- Fase: V1
- Paquete: packages/analyzers/lint-crossfile
- Depende de: v1-32

## Contexto

- Diseño: docs/design/03-linter.md §11.4 (E2E011) y §11.5
- ADRs: 0004, 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar fixtures, helpers y miembros de Page Objects exportados sin referencias en la suite, con las referencias del índice (v1-30).
- Severidad, categoría y confianza según el catálogo de v1-07. Fingerprint con `lintFingerprint` (v1-22).
- Mensajes en inglés (ADR-0019) y página de documentación de la regla (ADR-0020).

## Decisiones abiertas en esta tarea

- Qué alcance cuenta como "sin referencias": solo los archivos del índice, o también los usos fuera de la suite (por ejemplo, la configuración de Playwright).
- Cómo se tratan los barrels (`index.ts`) y los exports usados solo por tipos.

## Criterios de aceptación

- Tests: un helper sin usar se reporta; uno usado por un re-export no; un miembro de un Page Object usado solo en otro Page Object no se reporta.
- Test de que la regla es pura: el mismo `SuiteIndex` da los mismos Findings, en el mismo orden.
- La página de documentación de la regla existe.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Integración en `atium lint` (v1-38).
