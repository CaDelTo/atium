# ADR-0003: Modelo de datos basado en CTRF, definido con Zod, con resultados e intentos separados

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 02-data-model.md

## Contexto

Todos los adapters deben producir el mismo modelo. La evidencia más fuerte de flakiness es un test que falla en un intento y pasa en otro dentro del mismo run, así que el modelo debe representar intentos.

## Decisión

- Modelo inspirado en CTRF y extendido con contexto de git, CI y entorno.
- Entidades: `Run` → `TestResult` → `Attempt`, más `TestCase` como identidad estable.
- Esquemas definidos con Zod en `packages/core/src/model`; los tipos TypeScript se derivan de ellos y se exporta JSON Schema.
- Cada archivo de run lleva `schemaVersion`; los lectores soportan la versión actual y la anterior.
- `testId = sha1(project | file | titlePath).slice(0, 16)` con detección de renombres.

## Consecuencias

- Validación en tiempo de ejecución de todo lo que entra desde adapters e ingesta.
- Cambiar el modelo es un cambio de alto impacto: requiere un ADR nuevo.

## Alternativas descartadas

- Usar CTRF sin extender: no tiene intentos detallados ni contexto de commit suficiente.
- Tipos TypeScript sin validación: datos corruptos llegarían a los analizadores.
