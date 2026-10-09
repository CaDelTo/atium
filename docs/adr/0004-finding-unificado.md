# ADR-0004: Finding unificado como única salida de los analizadores

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 14-architecture.md (22.3), 13-score-baseline-reports.md

## Contexto

Score, baseline, gate, SARIF, reportes y comentarios en PR deben funcionar igual para todos los módulos, incluidos plugins de terceros.

## Decisión

- Todo analizador devuelve `Finding[]` con la forma definida en la sección 22.3.
- Cada Finding tiene un `fingerprint` estable entre runs, usado por el baseline.
- `source` (`rule`, `heuristic`, `llm`) y `confidence` son obligatorios.

## Consecuencias

- Los reporters y el gate no conocen detalles de cada analizador.
- Un analizador nuevo solo necesita producir Findings para integrarse en todo.

## Alternativas descartadas

- Salida específica por módulo: obliga a escribir integraciones por cada combinación módulo × reporter.
