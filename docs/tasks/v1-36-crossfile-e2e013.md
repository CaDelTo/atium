# Regla cross-file E2E013: tests casi duplicados

- ID: v1-36-crossfile-e2e013
- Fase: V1
- Paquete: packages/analyzers/lint-crossfile
- Depende de: v1-32

## Contexto

- Diseño: docs/design/03-linter.md §11.4 (E2E013) y §11.5
- ADRs: 0004, 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Comparar la secuencia de acciones normalizada de cada test (acción + nivel de selector, de v1-29) con shingles de 3 y similitud de Jaccard. Umbral por defecto ≥ 0.9, en `defaults.ts` (§11.4).
- Reportar cada par una sola vez, en orden determinista.
- Que sea eficiente en suites grandes: no comparar todos los pares de forma ingenua si el benchmark de v1-40 lo exige.
- Severidad, categoría y confianza según el catálogo de 03-linter.md §11.8 (ADR-0023). Fingerprint con `lintFingerprint` (v1-22).
- Mensajes en inglés (ADR-0019) y página de documentación de la regla (ADR-0020).

## Decisiones abiertas en esta tarea

- Qué hacer con tests de menos de 3 acciones, que no forman ningún shingle.
- Si cada par se reporta en ambos tests o en uno.

## Criterios de aceptación

- Property-based de la similitud de Jaccard: es simétrica, está en [0, 1] y vale 1 para secuencias iguales.
- Tests en el límite: similitud 0.9 reporta y 0.89 no.
- Test de que la regla es pura: el mismo `SuiteIndex` da los mismos Findings, en el mismo orden.
- La página de documentación de la regla existe.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Integración en `atium lint` (v1-38).
