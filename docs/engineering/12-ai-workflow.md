# Trabajo con Claude Code

Cómo se usan los agentes de IA en este repositorio. La configuración está en `.claude/` (agentes, comandos, hooks y permisos).

> La sintaxis de agentes, comandos, hooks y permisos sigue la documentación de Claude Code. Antes de cambiarla, verifica la versión vigente en https://docs.claude.com/en/docs/claude-code/overview.

## Principio

El agente principal planifica, decide e implementa. Las tareas mecánicas o de lectura se delegan a subagentes con modelos más pequeños, que devuelven resúmenes cortos. Así:

- El contexto principal no se llena con salidas largas (logs de tests, resultados de búsqueda).
- Las tareas simples cuestan menos y son más rápidas.
- La revisión la hace un agente distinto del que escribió el código.

## Política de modelos

| Nivel | Modelo | Para qué | Ejemplos |
|---|---|---|---|
| Ligero | `haiku` | Tareas mecánicas, búsqueda, ejecutar herramientas y resumir su salida | `explorer`, `verifier`, `duplication-auditor`, `docs-checker`, `perf-benchmarker` |
| Intermedio | `sonnet` | Juicio sobre código con criterios claros | `code-reviewer`, `security-reviewer`, `test-writer` |
| Principal | `inherit` (el modelo de la sesión) | Precisión crítica, decisiones, diseño | `design-auditor`, planificación, implementación de fórmulas, ADRs |

Reglas:
- Si la tarea consiste en ejecutar algo y resumir, o en buscar y listar, va a un agente ligero.
- Si requiere aplicar un checklist con criterio, va a un agente intermedio.
- Si un error tendría consecuencias en la corrección del producto (fórmulas, estados, esquemas, decisiones de arquitectura), la hace el modelo principal.
- Las decisiones nunca se delegan: los subagentes reportan y el agente principal (o una persona) decide.

## Subagentes

| Agente | Modelo | Edita | Uso |
|---|---|---|---|
| `explorer` | haiku | No | Encontrar código, docs y referencias del diseño |
| `verifier` | haiku | No | Ejecutar `pnpm verify` y resumir fallos |
| `duplication-auditor` | haiku | No | Duplicación (jscpd), código sin usar (knip), smells (sonarjs) |
| `docs-checker` | haiku | No | TSDoc, docs de reglas, changesets, diseño actualizado |
| `perf-benchmarker` | haiku | No | Benchmarks contra `main` y contra los presupuestos del diseño |
| `code-reviewer` | sonnet | No | Revisión contra [11-code-review.md](11-code-review.md) |
| `security-reviewer` | sonnet | No | Revisión contra [06-security.md](06-security.md) |
| `test-writer` | sonnet | Solo tests | Casos borde, contratos, property-based |
| `design-auditor` | inherit | No | Conformidad exacta con `docs/design/` |

Los subagentes no ven la conversación principal: cada invocación debe incluir el alcance (archivos o ref) y la pregunta concreta.

## Comandos

| Comando | Qué hace |
|---|---|
| `/task <archivo>` | Lee una tarea de `docs/tasks/`, reúne contexto con `explorer`, presenta un plan y espera aprobación |
| `/verify [paquete]` | Ejecuta la verificación con `verifier` |
| `/review [ref]` | Revisión en paralelo con los agentes de revisión; consolida un solo reporte |
| `/audit` | Auditoría de todo el repo y propuesta de tareas |
| `/adr <título>` | ADR nuevo desde la plantilla |
| `/plan-phase <fase>` | Divide una fase del roadmap en tareas; propone la lista y espera aprobación antes de crear archivos |
| `/handoff` | Cierra la sesión: escribe una entrada en `docs/progress.md` y actualiza el estado de las tareas |

## Flujo de una tarea

```
inicio de sesión → leer la última entrada de docs/progress.md
   ▼
/task docs/tasks/v1-04-hard-wait-rule.md
   │  explorer reúne contexto → plan → aprobación
   ▼
implementación (modelo principal)
   │  hook: Prettier en cada archivo editado
   ▼
/verify  → verifier (haiku)        ── falla → corregir → /verify
   ▼
/review  → code-reviewer, duplication-auditor, docs-checker
           (+ security-reviewer / design-auditor / perf-benchmarker según los archivos)
   │  bloqueantes → corregir → /review
   ▼
resumen final → revisión humana → PR
   ▼
/handoff → entrada en docs/progress.md + estado de tareas
```

Al cerrar una fase: `/audit` y luego `/plan-phase <siguiente fase>`.

## Hooks

| Evento | Acción | Notas |
|---|---|---|
| Antes de editar, escribir o ejecutar un comando | `test-guard` (`.claude/hooks/test-guard.mjs`): bloquea cambios que quitan assertions o casos de test, agregan `.skip` / `.only` / `.todo` / `.fixme` / `xit`, o borran o mueven archivos de test | Excluye `examples/` y `fixtures/`. Si el hook falla internamente, permite el cambio (fail-open). Se desactiva para una sesión con `ATIUM_TEST_GUARD=off` |
| Después de editar o escribir un archivo | Prettier sobre ese archivo (`.claude/hooks/format.mjs`) | Nunca bloquea: si falla, lo omite con un aviso |

### Cuando `test-guard` bloquea

El agente se detiene, explica por qué quería hacer el cambio y pide aprobación. Si el cambio es legítimo (por ejemplo, mover assertions a un helper o reemplazar un test por uno mejor):

- Haz el cambio tú mismo, o
- Inicia la sesión con `ATIUM_TEST_GUARD=off` solo para esa tarea.

Limitación conocida: el guard cuenta assertions y casos por texto. No detecta una tabla de `it.each` que pierde filas ni una assertion que se relaja (`toBe` → `toBeDefined`); eso lo revisa `code-reviewer`.

No se ejecuta `pnpm verify` en un hook: es lento y se ejecuta explícitamente con `/verify`.

## Permisos

`.claude/settings.json` define:
- **Permitido sin preguntar:** comandos de verificación y lectura de git.
- **Prohibido:** `git push`, publicar paquetes, leer `.env`, editar `fixtures/` (se generan con `pnpm fixtures:generate`), y editar `.claude/settings.json` o `.claude/hooks/` (para que el agente no pueda desactivar sus propios controles; esos archivos los cambia una persona).

Todo lo demás pide confirmación.

## Auditorías periódicas

`/audit` al cerrar cada fase del roadmap, y cada vez que `jscpd` o `knip` muestren una tendencia creciente. Los hallazgos se convierten en tareas en `docs/tasks/`, no en arreglos directos.

## Memoria entre sesiones

Claude Code no recuerda sesiones anteriores. La continuidad vive en el repositorio:

| Archivo | Qué guarda |
|---|---|
| `docs/tasks/README.md` | Estado de cada tarea |
| `docs/progress.md` | Contexto de las últimas sesiones: qué quedó a medias, decisiones, problemas y siguiente paso |
| `docs/adr/` | Decisiones permanentes |

Cada sesión empieza leyendo la última entrada de `docs/progress.md` y termina con `/handoff`. Una decisión que solo quedó en una conversación se considera perdida.

## Límites

- Los resúmenes de subagentes pueden omitir detalles: el agente principal verifica en el código cada hallazgo bloqueante antes de actuar.
- Los subagentes de revisión no reemplazan la revisión humana de fórmulas, esquemas públicos y decisiones de diseño.
