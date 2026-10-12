---
description: Divide una fase del roadmap en tareas con el formato de docs/tasks/ y crea sus issues
argument-hint: "<fase, por ejemplo V1>"
---

Divide la fase `$ARGUMENTS` en tareas.

1. Lee docs/design/22-roadmap.md (sección 30) para el contenido y el criterio de aceptación de la fase.
2. Usa el subagente `explorer` para reunir:
   - Las secciones de docs/design/ y los ADR que cubren la fase.
   - La última entrada de docs/progress.md.
   - El código que ya existe y que la fase va a usar o extender.
3. Lee el estado de las tareas en GitHub: `gh issue list --state all --label type:task --limit 500 --json number,title,state,milestone`.
4. Propón la lista de tareas **antes de escribir archivos**:
   - ID (`<fase>-<nn>-<nombre>`), título, paquete, dependencias y una línea de alcance.
   - El orden y qué tareas pueden hacerse en paralelo.
   - Las decisiones abiertas que la fase necesita, señalando qué tarea bloquean.
   - Huecos o contradicciones del diseño que encuentres.
5. Reglas de granularidad:
   - Cada tarea cabe en una sesión y en un PR de menos de 400 líneas.
   - Una regla de lint, un analizador o un comando por tarea; la infraestructura compartida va en su propia tarea, antes.
   - Criterios de aceptación verificables (tests concretos, números del diseño), nunca "funciona bien".
   - La última tarea de la fase es la de aceptación, con `/audit`.
   - Si una tarea requiere un valor que el diseño no define, la tarea lo pide en "Decisiones abiertas en esta tarea"; no lo inventes.
6. Espera aprobación. Después:
   - Crea los archivos con la plantilla de docs/tasks/README.md.
   - Delega en el subagente `issue-writer` el milestone, las etiquetas y los issues de la fase. Pásale la fase, la lista de archivos en orden, el repo (`CaDelTo/atium`), qué dependencias están Hechas sin issue y cómo traducir las que no son IDs concretos (por ejemplo, "todas las anteriores").
   - Verifica por tu cuenta que hay un issue por tarea, sin duplicados, con etiquetas, milestone y dependencias correctas.
   - Agrega la tabla de la fase a docs/tasks/README.md con la columna Issue rellena.
7. No escribas código en este comando.
