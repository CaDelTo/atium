# Modelo de Finding y orden determinista

- ID: v0-09-finding-model
- Fase: V0
- Paquete: packages/core/src/findings
- Depende de: v0-06

## Contexto

- Diseño: docs/design/14-architecture.md §22.3, docs/design/13-score-baseline-reports.md §21.1
- ADRs: 0004
- Estándares: 02-code-design.md (Salida determinista, valores por defecto)

## Hacer

- Esquema Zod de `Finding` con las uniones de §22.3.
- `SEVERITY_WEIGHTS` en `defaults.ts` con referencia a §21.1.
- `fingerprintOf(parts)`: sha1 de las partes unidas, 16 caracteres hex.
- `compareFindings`: archivo, línea, columna, `ruleId` y `fingerprint` como desempate.

## Criterios de aceptación

- Ordenar una lista de Findings en cualquier orden inicial produce siempre el mismo resultado (property-based).
- Findings sin `location` quedan al final de forma estable.
- `fingerprintOf` es estable y distingue partes con separadores ambiguos (`["a|b"]` ≠ `["a", "b"]`).
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Interfaz `Analyzer` y plugins (V1/V3), score y baseline (fases posteriores).
