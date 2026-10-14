---
description: Guarda el estado de la sesión en docs/progress.md y en el issue de la tarea para que la siguiente sesión continúe sin perder contexto
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

3. Comenta la misma entrada en el issue de la tarea de la sesión con `gh issue comment N --body-file <archivo>`, escribiendo el archivo en un directorio temporal fuera del repo. El issue se identifica por la rama actual (`<tipo>/<n>-…`) o por la conversación; si la sesión no tuvo issue, omite el comentario y dilo.
4. Si docs/progress.md tiene más de 10 entradas, mueve las más antiguas a docs/progress-archive.md, dejando las 10 más recientes.
5. Sé literal y específico: la próxima sesión no tendrá esta conversación. No incluyas valores de variables de entorno, tokens ni datos sensibles.
6. Muestra la entrada al usuario. Si la tarea de la sesión ya tiene un PR abierto (`/deliver`), haz commit de la entrada (`docs(repo): add handoff entry for #N`) con solo `docs/progress.md` y, si archivaste, `docs/progress-archive.md`, y push con `node .claude/scripts/push-branch.mjs <rama>`. Ese commit no vuelve a pasar por `delivery-auditor`; la CI lo verifica. Si no hay PR, no hagas commit salvo que te lo pida.

## Modo loop

Cuando lo ejecuta `/dev-loop` al terminar una ejecución, estos pasos sustituyen a los pasos 2, 3 y 6:

1. Desde el worktree limpio, crea la rama `docs/<AAAAMMDD>-dev-loop-handoff-<hhmm>` con `git switch --no-track -c <rama> origin/main` (la fecha ocupa el lugar del número de issue).
2. Escribe la entrada (título `AAAA-MM-DD — dev-loop <fase>`): PRs entregados, PRs mantenidos, tareas detenidas con su pregunta y los contadores. Sale del registro `.atium-loop/`.
3. Commit `docs(repo): add dev-loop handoff`, push con `node .claude/scripts/push-branch.mjs <rama>` y un PR en inglés, no en borrador, sin `Closes` ni la etiqueta `loop`, con el cuerpo en `.atium-loop/tmp/`.
4. No se comenta en ningún issue: cada tarea ya tiene su resumen.

Nunca cierres issues: lo hace una persona.
