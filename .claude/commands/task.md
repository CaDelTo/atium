---
description: Empieza una tarea a partir de su descripción en docs/tasks/
argument-hint: "<archivo de tarea, por ejemplo docs/tasks/v0-03-model.md>"
---

Empieza la tarea descrita en `$ARGUMENTS`.

1. Lee la tarea completa.
2. Usa el subagente `explorer` para reunir las secciones de docs/design/, los ADR y los estándares de docs/engineering/ que aplican, y el código existente relacionado.
3. Presenta un plan: archivos a crear o modificar, enfoque, tests, riesgos y dudas. Señala cualquier valor que el diseño no defina.
4. Espera aprobación antes de escribir código.
5. Después de implementar: `/verify`, luego `/review`, y resume según la sección "Flujo de trabajo" de CLAUDE.md.
