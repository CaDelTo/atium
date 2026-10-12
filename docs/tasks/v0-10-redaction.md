# Redacción de datos sensibles

- ID: v0-10-redaction
- Fase: V0
- Paquete: packages/core/src/redact
- Depende de: v0-05

## Contexto

- Diseño: docs/design/04-collector.md §12.4, docs/design/20-security-privacy.md §28
- Estándares: 06-security.md (Entradas, Secretos)

## Hacer

- `createRedactor(config)` que devuelve una función `redact(text)`. Implementado como un objeto `Redactor` con `redact`, `redactHeaders` y `redactFields`, para cubrir también los objetos (aprobado en el plan de #11).
- Patrones por defecto: JWT, `Bearer <token>`, claves de nube del diseño.
- Redacción de headers y campos de cuerpo configurables (`redact.headers`, `redact.bodyFields`) para objetos.
- Reemplazo con un marcador fijo (`[REDACTED]`).

## Decisiones abiertas en esta tarea

Si el diseño no especifica un patrón de forma exacta (por ejemplo, qué claves de nube), propón la lista en el plan.

## Criterios de aceptación

- Un test por patrón con ejemplos positivos y negativos.
- Texto sin secretos queda intacto.
- Tiempo lineal con entradas de 1 MB (sin ReDoS).
- La redacción es idempotente (property-based).
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Redacción de emails (opcional en el diseño; queda para cuando se defina).
