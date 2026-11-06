# Redacción de Basic, credenciales en URL y tokens de GitHub

- ID: v1-48-redact-basic-userinfo-github
- Fase: V1
- Paquete: packages/core (redact)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 3

## Contexto

Diseño: docs/design/20-security-privacy.md §28.1
ADRs: los que fijan la configuración pública (ver docs/engineering/07-public-api.md)
Estándares: docs/engineering/06-security.md (sección Entradas)

- La redacción de texto tiene cinco patrones: `jwt`, `bearer`, `aws-key`, `gcp-key` y `azure-key` (`redact/patterns.ts:31-59`, `REDACT_PATTERN_IDS`).
- Pasan sin redactar `Authorization: Basic dXNlcjpwYXNz`, URLs con credenciales (`https://ci:s3cr3t@host/x`) y tokens de GitHub (`ghp_…`, `gho_…`, `ghs_…`). Un error de red con esa URL queda guardado en el historial.
- El diseño fija los cinco patrones y no descarta estos casos.

## Hacer

- Proponer en el diseño (y con `/adr` si cambia la configuración pública, porque `REDACT_PATTERN_IDS` es parte de `redact.patterns`) tres patrones nuevos: `basic`, `url-userinfo` y `github-token`. Detenerse hasta que una persona lo acepte.
- Implementarlos con el mismo estilo que los actuales: lookbehind en la frontera del token, sin cuantificadores anidados, idempotentes.
- Tests de cada patrón, incluidos casos que no deben redactarse.

## Decisiones abiertas en esta tarea

- Si los patrones nuevos se activan por defecto.
- Qué parte se reemplaza en `url-userinfo` (solo la contraseña o usuario y contraseña).

## Criterios de aceptación

- El cambio de diseño (y el ADR, si hace falta) está aceptado por una persona antes de implementar.
- `Authorization: Basic dXNlcjpwYXNz`, `https://ci:s3cr3t@host/x` y un token `ghp_` de 36 caracteres salen redactados con los patrones activos.
- Redactar dos veces da el mismo resultado que una.
- Un test de rendimiento o property-based muestra que el tiempo sigue siendo lineal en el tamaño de la entrada.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Emails, patrones definidos por el usuario y JWE (ya fuera de alcance en el diseño).
- Redacción por pares `name`/`value` en datos tipo HAR.
