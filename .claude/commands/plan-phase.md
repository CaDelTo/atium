---
description: Divide una fase del roadmap en tareas con el formato de docs/tasks/
argument-hint: "<fase, por ejemplo V1>"
---

Divide la fase `$ARGUMENTS` en tareas.

1. Lee docs/design/22-roadmap.md (sección 30) para el contenido y el criterio de aceptación de la fase.
2. Usa el subagente `explorer` para reunir:
   - Las secciones de docs/design/ y los ADR que cubren la fase.
   - El estado actual en docs/tasks/README.md y la última entrada de docs/progress.md.
   - El código que ya existe y que la fase va a usar o extender.
3. Propón la lista de tareas **antes de escribir archivos**:
   - ID (`<fase>-<nn>-<nombre>`), título, paquete, dependencias y una línea de alcance.
   - El orden y qué tareas pueden hacerse en paralelo.
   - Las decisiones abiertas que la fase necesita, señalando qué tarea bloquean.
   - Huecos o contradicciones del diseño que encuentres.
4. Reglas de granularidad:
   - Cada tarea cabe en una sesión y en un PR de menos de 400 líneas.
   - Una regla de lint, un analizador o un comando por tarea; la infraestructura compartida va en su propia tarea, antes.
   - Criterios de aceptación verificables (tests concretos, números del diseño), nunca "funciona bien".
   - La última tarea de la fase es la de aceptación, con `/audit`.
   - Si una tarea requiere un valor que el diseño no define, la tarea lo pide en "Decisiones abiertas en esta tarea"; no lo inventes.
5. Espera aprobación. Después, crea los archivos con la plantilla de docs/tasks/README.md y agrega la tabla de la fase al índice con estado Pendiente.
6. No escribas código en este comando.
