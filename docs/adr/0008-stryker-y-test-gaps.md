# ADR-0008: Integrar Stryker y priorizar Test Gap Analysis sobre un motor de mutación propio

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 10-test-gaps.md

## Contexto

Mutation testing en E2E es muy costoso y Stryker ya es maduro. La pregunta útil para un QA es qué no se está probando.

## Decisión

- No se construye un motor de mutación propio.
- Stryker se integra de forma opcional, ingiriendo su reporte JSON.
- El módulo principal es Test Gap Analysis: endpoints, respuestas y rutas sin probar, con los datos que ya captura el collector.

## Consecuencias

- Menos alcance y mantenimiento.
- Mutation score solo disponible donde el usuario ya usa Stryker.

## Alternativas descartadas

- Motor propio: meses de trabajo para duplicar una herramienta existente.
