# ADR-0011: LLM opcional, sin efecto en score ni gate

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 14-architecture.md (22.5), 20-security-privacy.md

## Contexto

Algunas tareas (grupos de triage sin clasificar, escenarios BDD faltantes) se benefician de un LLM, pero sus resultados no son deterministas.

## Decisión

- Desactivado por defecto.
- Interfaz de proveedor propia; permite modelos locales.
- Solo recibe datos redactados.
- Todo Finding generado lleva `source: "llm"` y no afecta score ni gate.

## Consecuencias

- El producto funciona completo sin LLM.
- Las funciones asistidas son claramente identificables.

## Alternativas descartadas

- LLM obligatorio: dependencia externa, costo y privacidad.
