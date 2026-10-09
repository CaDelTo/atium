# ADR-0020: Documentación pública en inglés

- Estado: Aceptada
- Fecha: 2026-10-09
- Diseño relacionado: 23-risks-open-decisions.md, 09-documentation.md (estándar), 08-git-workflow.md (estándar)

## Contexto

El idioma de la documentación pública era una decisión abierta (diseño, sección 31; `CLAUDE.md`; `08-git-workflow.md`). [ADR-0019](0019-idioma-mensajes-cli-reglas.md) fijó el inglés para los mensajes del CLI, de las reglas, de los reportes y de los comentarios en PR, pero dejó pendiente la documentación pública, incluidas las páginas de cada regla.

La tarea v0-01 necesita un `README.md` raíz, que es el primer documento público del repositorio. El usuario decidió que toda la documentación pública va en inglés.

## Decisión

- Toda la documentación pública para usuarios va en inglés:
  - `README.md` raíz y los `README.md` de cada paquete publicado;
  - el sitio de documentación;
  - la página de documentación de cada regla (`meta.docs.url`);
  - los changelogs generados con Changesets.
- Los documentos internos siguen en español, como indica `08-git-workflow.md`: diseño (`docs/design/`), ADRs (`docs/adr/`), estándares de ingeniería (`docs/engineering/`), tareas (`docs/tasks/`) y la bitácora (`docs/progress.md`).
- Queda abierto el idioma de los archivos para contribuidores (`CONTRIBUTING.md`, plantillas de issues, código de conducta); ver diseño, sección 31. Los títulos y descripciones de PR ya van en inglés según `08-git-workflow.md`.

## Consecuencias

- Toda la superficie pública del proyecto queda en un solo idioma, el mismo de los mensajes (ADR-0019), del código y de los commits (ADR-0014).
- Un mensaje de una regla y su página de documentación están en el mismo idioma.
- Los documentos internos y los públicos están en idiomas distintos. Una explicación que exista en el diseño hay que redactarla de nuevo en inglés para la documentación pública; no se puede enlazar tal cual.
- Los usuarios que no leen inglés no tienen documentación en su idioma.

## Alternativas descartadas

- Documentación pública en español: reduce el público de una herramienta open source y la separa del idioma de los mensajes (ADR-0019).
- Documentación bilingüe desde el inicio: duplica el costo de cada página y de mantenerlas sincronizadas sin que nadie lo haya pedido.
- Pasar también el diseño y los ADRs al inglés: no se pidió y obligaría a traducir toda la documentación interna existente.
