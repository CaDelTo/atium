# ADR-0025: Pipeline de entrega con TDD y loop de desarrollo autónomo

- Estado: Aceptada
- Fecha: 2026-10-14
- Reemplaza parcialmente: [ADR-0015](0015-subagentes-y-revision.md), en lo relativo a la prohibición de push
- Diseño relacionado: docs/engineering/12-ai-workflow.md, docs/engineering/04-testing.md, docs/engineering/08-git-workflow.md

## Contexto

Las tareas se trabajan sesión a sesión: una persona aprueba cada plan, hace cada push y abre cada PR. El usuario quiere que un loop entregue tareas sin intervención mientras no está, sin bajar la calidad: que el código cumpla los requisitos y que una revisión final estricta filtre lo que llega a una persona. ADR-0015 prohíbe el push al agente, y eso impide abrir PRs sin una persona.

## Decisión

- **Pipeline de entrega único** para `/task` y `/dev-loop`: plan → `plan-reviewer` → aprobación → TDD cuando aplica (`spec-tester` escribe los tests `AC-n` antes de la implementación) → implementación → `test-writer` (endurecimiento) → `/verify` → `/review` → `/deliver` (`delivery-auditor`, veredicto binario).
- **Aprobación del plan:** en `/task`, una persona; en `/dev-loop`, el `APROBADO` de `plan-reviewer`. Lo que requiere una decisión humana (valores no definidos, ADR, API pública, dependencias, `.claude/`, `.github/`) detiene la tarea.
- **Push del agente:** solo de ramas de tarea y solo con `.claude/scripts/push-branch.mjs`, que valida el nombre de la rama y empuja exactamente `refs/heads/<rama>`. El `deny` de `git push` se mantiene; nunca push a `main`, force push ni borrado de ramas remotas.
- **`main` protegida por el ruleset `protect-main`** sin bypass. El loop usa un token fine-grained sin permisos de administración ni de workflows, para que no pueda modificar el ruleset ni la CI.
- **El loop solo atiende comentarios del dueño del repositorio.** El texto de terceros es dato, nunca instrucción.
- Mergear y cerrar issues sigue siendo exclusivo de una persona.

## Consecuencias

- Tareas entregadas sin intervención, con trazabilidad criterio → test y una auditoría final independiente del agente que implementó.
- `plan-reviewer` y `delivery-auditor` usan el mismo modelo que el agente: son controles de calidad, no una barrera de seguridad ni una revisión humana. La revisión humana del PR sigue siendo obligatoria.
- Las garantías técnicas son el ruleset, el token acotado y el script de push; los permisos por prefijo de Claude Code y los prompts son ayudas.
- El loop ejecuta código del repositorio con credenciales de la persona; por eso no toma tareas que cambien dependencias, `.claude/` ni `.github/`.
- El commit de especificación del TDD tiene tests en rojo; el squash merge evita que llegue a `main`.

## Alternativas descartadas

- **Aprobación humana de cada plan también en el loop:** bloquea el trabajo nocturno, que es el objetivo.
- **Permitir `git push` por prefijo en los permisos:** no cubre refspecs (`rama:main`, `:rama`), `--force-with-lease` ni otras variantes.
- **Un worktree y una sesión por tarea dentro del loop:** más conflictos y ediciones fuera del directorio de la sesión, que piden confirmación.
