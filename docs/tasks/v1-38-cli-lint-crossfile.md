# `atium lint`: reglas cross-file y baseline

- ID: v1-38-cli-lint-crossfile
- Fase: V1
- Paquete: packages/cli
- Depende de: v1-21, v1-28, v1-32, v1-33, v1-34, v1-35, v1-36, v1-37

## Contexto

- Diseño: docs/design/03-linter.md §11.4, docs/design/13-score-baseline-reports.md §21.3, docs/design/14-architecture.md §22.2, docs/design/21-testing-strategy.md §29 (integración)
- ADRs: 0005, 0006 y el de v1-07
- Estándares: docs/engineering/04-testing.md, 05-performance.md

## Hacer

- En `atium lint`:
  - construir el índice (v1-30);
  - ejecutar `lint-crossfile` con el orquestador (v1-23);
  - unir sus Findings con los de ESLint, sin duplicados entre E2E006 y E2E006b (v1-33).
- Leer `.atium/baseline.json` si existe:
  - marcar cada Finding como nuevo o en baseline (v1-28);
  - un baseline inválido da `CONFIG_INVALID` con `hint`.
- El reporte y el código de salida tienen en cuenta solo los Findings nuevos, según v1-07.
- Los analizadores omitidos aparecen en el reporte con su motivo.
- **Test de integración sobre `examples/playwright-demo`:** los Findings de `atium lint --format json` coinciden exactamente con `expected-findings.json` (recall del 100 % y sin hallazgos inesperados, §29).

## Criterios de aceptación

- Test de integración sobre el demo:
  - todos los hallazgos esperados aparecen;
  - no aparece ninguno inesperado;
  - el orden es el de `compareFindings`.
- Tests con baseline:
  - un Finding en baseline no cuenta para el código de salida;
  - uno nuevo sí;
  - un baseline corrupto da código 2.
- Test de fail-open: si `lint-crossfile` lanza, los Findings de ESLint se siguen reportando, con aviso.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Crear o actualizar el baseline (v1-39).
