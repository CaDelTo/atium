# Frontmatter YAML en los ADRs

- ID: v1-44-adr-frontmatter
- Fase: V1
- Paquete: docs/adr
- Depende de: v1-43-docs-callouts-mermaid
- Origen: petición del usuario para leer `docs/` en GitHub y en Obsidian

## Contexto

Diseño: docs/adr/README.md, docs/adr/0000-template.md
ADRs: todos (cambia su cabecera), 0014 y 0020 (idioma)
Estándares: docs/engineering/09-documentation.md

## Hacer

- Proponer con `/adr` el formato de los ADRs con frontmatter YAML y la excepción a la regla de no editar los ADRs. Detenerse hasta que una persona lo acepte.
  - Claves y valores en inglés: `status` (`proposed`, `accepted`, `superseded`, `partially-superseded`), `date` (`AAAA-MM-DD`), `related` (rutas desde la raíz del repo, con la sección opcional), `supersedes` y `superseded_by` (números como texto, `"0013"`).
  - El cuerpo de los ADRs sigue en español (ADR-0014).
- Cambiar `docs/adr/0000-template.md` y `.claude/commands/adr.md` (pasos 2 y 4) al formato nuevo.
- Migrar las cabeceras de ADR-0001 a ADR-0025:
  - `Estado`, `Fecha` y `Diseño relacionado` pasan a propiedades, con `related` normalizado.
  - Los avisos de reemplazo (0013, 0015) quedan en el cuerpo como callout `WARNING` con enlace.
  - El texto libre de `Diseño relacionado` (0023) pasa al cuerpo.
- Actualizar la regla y la columna de estado de `docs/adr/README.md` con los valores de `status`.

## Criterios de aceptación

- El ADR del formato está aceptado por una persona antes de migrar.
- Los 25 ADRs y la plantilla tienen frontmatter YAML válido, con `status` dentro del vocabulario, y ninguno conserva las líneas `- Estado:`, `- Fecha:` ni `- Diseño relacionado:`.
- Ningún ADR pierde información: cada valor anterior está en una propiedad o en el cuerpo.
- La tabla de `docs/adr/README.md` coincide con el `status` de cada ADR.
- `/adr` genera un ADR con el formato nuevo.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Cambiar el contenido de las decisiones o traducir los ADRs.
- La vista de Bases (`.base`): queda local, fuera del repo.
- Tests o scripts que validen el frontmatter.
- Frontmatter en el resto de `docs/` (diseño, tareas).
