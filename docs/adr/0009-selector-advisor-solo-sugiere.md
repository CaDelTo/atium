# ADR-0009: Selector Advisor en lugar de self-healing; solo sugerencias

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 06-selector-advisor.md

## Contexto

Reparar selectores automáticamente puede ocultar regresiones reales: el test pasa contra un elemento distinto del esperado.

## Decisión

- No hay self-healing automático.
- El Selector Advisor clasifica selectores, sugiere alternativas robustas al escribir y propone reemplazos cuando uno falla.
- Las sugerencias se entregan como diff o comentario en PR; nunca se aplican en CI.

## Consecuencias

- El QA mantiene el control de cada cambio.
- Requiere intervención humana para aplicar los cambios.

## Alternativas descartadas

- Self-healing en runtime: reduce trabajo pero esconde bugs.
