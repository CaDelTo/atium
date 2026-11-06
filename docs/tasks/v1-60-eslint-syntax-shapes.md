# Helpers de sintaxis: claves con template y test.only<T>

- ID: v1-60-eslint-syntax-shapes
- Fase: V1
- Paquete: packages/eslint-plugin (syntax)
- Depende de: v1-09-e2e-syntax
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 15

## Contexto

Diseño: docs/design/03-linter.md §11.1 y §11.3
ADRs: 0005, 0023
Estándares: docs/engineering/04-testing.md

- `propertyName` (`syntax/ast.ts:35-40`) solo acepta literales de string como clave calculada, así que ``page[`click`]`` no se reconoce como acción.
- `unwrap` (`syntax/ast.ts:57-67`) no quita `TSInstantiationExpression`, así que `test.only<T>(…)` no se reconoce como bloque de test.
- Las reglas todavía están vacías, así que hoy no afecta a nadie; afectará a las reglas E2E.

## Hacer

- Aceptar un `TemplateLiteral` sin expresiones como clave calculada.
- Quitar `TSInstantiationExpression` en `unwrap`.
- Tests de los dos casos.

## Criterios de aceptación

- ``page[`click`]("#x")`` se reconoce igual que `page.click("#x")`.
- `test.only<Fixtures>("x", …)` se reconoce igual que `test.only("x", …)`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Imports con alias (`import { test as base }`): requieren resolver el import, no solo el nombre.
