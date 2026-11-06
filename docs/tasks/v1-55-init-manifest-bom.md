# BOM en package.json al detectar frameworks

- ID: v1-55-init-manifest-bom
- Fase: V1
- Paquete: packages/cli
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 10

## Contexto

Diseño: docs/design/18-cli-config.md (`atium init`)
ADRs: ninguno
Estándares: docs/engineering/04-testing.md

- `readManifest` (`project/manifest.ts:49`) hace `JSON.parse(read.text)` sin quitar el BOM (U+FEFF, un carácter invisible que algunos editores de Windows ponen al inicio).
- Con BOM, `JSON.parse` falla, `init` toma el manifest como ilegible y escribe `adapters: []` con solo un aviso, aunque el proyecto use Playwright o Cypress.

## Hacer

- Quitar un BOM inicial antes de `JSON.parse`.
- Test con un `package.json` con BOM que declare `@playwright/test`.

## Criterios de aceptación

- `atium init` sobre un `package.json` con BOM detecta los frameworks igual que sin BOM.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Otras codificaciones distintas de UTF-8.
