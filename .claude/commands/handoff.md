---
description: Guarda el estado de la sesión en docs/progress.md para que la siguiente sesión continúe sin perder contexto
---

Cierra la sesión dejando el estado por escrito.

1. Revisa lo hecho en esta sesión: la conversación, `git status`, `git diff` y `git log` desde el inicio de la sesión.
2. Agrega una entrada **al inicio** de la sección "Entradas" de docs/progress.md con este formato exacto:

```markdown
### AAAA-MM-DD — <ID de la tarea o tema>

- **Hecho:** qué quedó terminado (con commits si los hay).
- **En curso:** qué quedó a medias, en qué archivo y en qué punto exacto.
- **Decisiones:** decisiones tomadas en la sesión y dónde quedaron (ADR, diseño, tarea). Si alguna no quedó escrita en ningún lado, dilo.
- **Problemas:** errores sin resolver, tests fallando, dudas abiertas para el usuario.
- **Siguiente paso:** la primera acción concreta de la próxima sesión.
```

3. Actualiza el estado de las tareas tocadas en docs/tasks/README.md (Pendiente, En curso, Hecha, Bloqueada).
4. Si docs/progress.md tiene más de 10 entradas, mueve las más antiguas a docs/progress-archive.md, dejando las 10 más recientes.
5. Sé literal y específico: la próxima sesión no tendrá esta conversación. No incluyas valores de variables de entorno, tokens ni datos sensibles.
6. Muestra la entrada al usuario. No hagas commit salvo que te lo pida.
