# Estándares de ingeniería — Atium

Cómo se escribe el código de este proyecto. Complementa el diseño (`docs/design/`) y las decisiones (`docs/adr/`).

## Precedencia

Cuando dos fuentes se contradicen, gana la primera:

1. ADRs aceptados (`docs/adr/`)
2. Diseño (`docs/design/`)
3. Estos estándares
4. Convenciones generales del ecosistema TypeScript / Node.js

## Principio

Lo que se puede verificar con una herramienta se verifica con una herramienta. Estos documentos explican el porqué de cada regla y cubren lo que las herramientas no pueden revisar.

## Archivos

| Archivo | Contenido |
|---|---|
| [01-typescript.md](01-typescript.md) | Compilador, tipos, nulos, fechas, imports y exports |
| [02-code-design.md](02-code-design.md) | Capas, dependencias permitidas, funciones puras, nombres, SOLID, complejidad |
| [03-errors-logging.md](03-errors-logging.md) | Errores, fail-open, validación en los bordes, logging, timeouts |
| [04-testing.md](04-testing.md) | Estructura, determinismo, mocks, contratos, property-based, cobertura, mutation |
| [05-performance.md](05-performance.md) | Presupuestos, streaming, SQLite, concurrencia, arranque del CLI |
| [06-security.md](06-security.md) | Entradas, procesos, rutas, secretos, dependencias, publicación, CI |
| [07-public-api.md](07-public-api.md) | Qué es público, semver, deprecaciones, compatibilidad multiplataforma |
| [08-git-workflow.md](08-git-workflow.md) | Idioma, commits, ramas, PRs, changesets, hooks |
| [09-documentation.md](09-documentation.md) | TSDoc, READMEs, docs de reglas, ADRs, actualización del diseño |
| [10-tooling.md](10-tooling.md) | Configuración de las herramientas que hacen cumplir estas reglas |
| [11-code-review.md](11-code-review.md) | Severidades, checklist de revisión, catálogo de code smells y formato del reporte |
| [12-ai-workflow.md](12-ai-workflow.md) | Subagentes, política de modelos, comandos, hooks y permisos de Claude Code |

## Definition of Done

Una tarea está terminada cuando:

- [ ] `pnpm verify` pasa (formato, lint, tipos, tests, reglas de dependencias, código sin usar, duplicación).
- [ ] `/review` no tiene hallazgos bloqueantes y los importantes están corregidos o justificados.
- [ ] Cada criterio de aceptación del issue tiene al menos un test `AC-n` que pasa, o una evidencia equivalente si no se puede expresar como test ([04-testing.md](04-testing.md#tdd)).
- [ ] `delivery-auditor` aprueba la entrega (`/deliver`).
- [ ] El comportamiento nuevo tiene tests; un bug corregido tiene un test que lo reproducía.
- [ ] Ningún test existente se debilitó para que pase.
- [ ] Los límites de capas se respetan (sin imports prohibidos).
- [ ] Los errores en bordes fail-open están envueltos y registrados.
- [ ] No hay valores mágicos: umbrales y defaults vienen de `defaults.ts` y coinciden con el diseño.
- [ ] Las APIs exportadas tienen TSDoc.
- [ ] Si cambió un paquete publicado, hay un changeset.
- [ ] Si cambió el comportamiento descrito en `docs/design/`, el diseño se actualizó en el mismo PR.
- [ ] Si se tomó una decisión de alcance amplio, hay un ADR.
