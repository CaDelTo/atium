# Regla cross-file E2E006b: assertions insuficientes con resolución completa

- ID: v1-33-crossfile-e2e006b
- Fase: V1
- Paquete: packages/analyzers/lint-crossfile
- Depende de: v1-18, v1-32

## Contexto

- Diseño: docs/design/03-linter.md §11.4 (E2E006b) y §11.5
- ADRs: 0004, 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Igual que E2E006 (v1-18), pero resolviendo los helpers importados hasta 2 niveles con el índice (v1-30).
- Evitar que un test aparezca dos veces: si E2E006 ya lo reporta y E2E006b concluye lo mismo, decidir cuál queda.
- Severidad, categoría y confianza según el catálogo de 03-linter.md §11.8 (ADR-0023). Fingerprint con `lintFingerprint` (v1-22).
- Mensajes en inglés (ADR-0019) y página de documentación de la regla (ADR-0020).

## Decisiones abiertas en esta tarea

- Cómo conviven E2E006 y E2E006b: si E2E006b solo reporta los tests que E2E006 no puede decidir (helpers importados), o si reemplaza a E2E006 cuando corre `atium lint`.

## Criterios de aceptación

- Tests: helper importado con assertion a 1 nivel y a 2 niveles (cuenta), y a 3 niveles (no cuenta).
- Test de que un test no se reporta dos veces entre E2E006 y E2E006b.
- Test de que la regla es pura: el mismo `SuiteIndex` da los mismos Findings, en el mismo orden.
- La página de documentación de la regla existe.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Integración en `atium lint` (v1-38).
