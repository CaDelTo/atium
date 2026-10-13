# Documentación

## Código

- **TSDoc en todo símbolo exportado:** descripción, parámetros, retorno, errores que lanza y, en APIs principales, un ejemplo.

```ts
/**
 * Computes the Wilson score interval for a failure rate.
 *
 * Design §15.3. Used to avoid classifying tests as flaky with too few attempts.
 *
 * @param failures - Number of failed attempts (0 ≤ failures ≤ attempts).
 * @param attempts - Total attempts; must be greater than 0.
 * @param z - Normal quantile; 1.96 for 95% confidence.
 * @returns Lower and upper bounds, both within [0, 1].
 * @throws {RangeError} If attempts is 0 or failures is out of range.
 */
export function wilsonInterval(failures: number, attempts: number, z = 1.96): Interval { /* ... */ }
```

- Los comentarios internos siguen las reglas de [02-code-design.md](02-code-design.md#comentarios).

## Paquetes

Cada paquete tiene un `README.md` con: para qué sirve, instalación, uso mínimo, configuración y enlace a la documentación completa.

## Reglas

Cada regla (lint, triage, BDD) tiene una página con:

1. Qué detecta
2. Por qué es un problema
3. Ejemplo incorrecto y corregido
4. Opciones
5. Cuándo es razonable desactivarla

Una regla nueva no se mergea sin su página.

Las páginas de las reglas de lint están en inglés ([ADR-0020](../adr/0020-idioma-documentacion-publica.md)), en `docs/rules/<código en minúsculas>.md`, por ejemplo `docs/rules/e2e001.md`, y la URL la construye `ruleDocsUrl(code)` ([03-linter.md §11.9](../design/03-linter.md#119-páginas-de-documentación), [ADR-0023](../adr/0023-arquitectura-linter.md)).

## Diseño y decisiones

- `docs/design/` es la fuente de verdad del comportamiento. Si el código cambia un comportamiento descrito, el diseño se actualiza en el mismo PR.
- Se escribe un ADR cuando una decisión afecta a varios paquetes, cambia una API pública, contradice un ADR anterior o hubo alternativas serias.

## Changelog

Generado con Changesets. Cada changeset describe el cambio desde el punto de vista del usuario, no de la implementación.
