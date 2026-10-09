# Historial de cambios del diseño

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## Anexo A — Cambios de la versión 1 a la versión 2

| Área | Versión 1 | Versión 2 | Motivo |
|---|---|---|---|
| Enfoque | Portafolio | Herramienta para equipos de QA | Objetivo real del proyecto |
| Linter | Motor AST propio | Plugin ESLint con reglas propias y cross-file | Actúa al escribir el test |
| Mutation testing | Motor propio | Test Gap Analysis; Stryker opcional | Mutation en E2E es costoso y ya existe |
| Self-healing | Reparación automática | Selector Advisor | Prevenir es más útil; reparar automáticamente oculta bugs |
| Test impact | Grafo estático | Priorización por riesgo; luego coverage | El grafo estático no existe en E2E |
| Red y chaos | Dos módulos | Un módulo con oráculo | Comparten captura; chaos sin oráculo no informa |
| Cucumber | Adapter + escenarios faltantes | Capa BDD + higiene determinística | Cucumber corre sobre otro runner |
| Triage | No existía | Failure Triage | Tarea manual diaria del QA |
| Salida de analizadores | Específica por módulo | Finding unificado | Score, baseline y reportes uniformes |
| Storage | SQLite | Interfaz con varios backends | Historial persistente en CI |
| Estructura | Carpeta única | Monorepo | Instalar solo lo necesario |
| Privacidad | No contemplada | Redacción, sin telemetría, LLM opt-in | Requisito para uso real |

---

## Anexo B — Cambios de la versión 2 a la versión 3

| Área | Hueco en v2 | Cambio en v3 |
|---|---|---|
| Requisitos no funcionales | No existían | Presupuestos de overhead, rendimiento, tamaño y fail-open ([sección 7](01-requirements.md)) |
| Compatibilidad | No definida | Versiones mínimas propuestas y degradación por capacidades ([sección 8](01-requirements.md)) |
| Modelo de datos | Un registro por test mezclaba intentos | `TestResult` + `Attempt`; worker y orden de ejecución; artefactos por intento |
| Identidad del test | "archivo + título" sin reglas | Algoritmo de `testId`, renombres, parametrizados |
| Shards y re-runs | No contemplados | Run lógico; re-runs como evidencia de flakiness |
| Contexto de CI | Sin especificar | Detección por proveedor; merge commit vs head en PRs; ejecuciones `dirty` |
| Linter | Reglas sin criterio de detección | Detección exacta, excepciones, umbrales, caché, fingerprint sin número de línea, política de falsos positivos |
| Collector | Sin diseño concreto | Reporter + fixture vía attachments, Cypress, fail-open, captura sin cuerpos, normalización de URLs, GraphQL |
| Fingerprinting | Descripción general | Algoritmo paso a paso y familias de errores |
| Selector Advisor | Sin fuente de datos ni puntuación | Traces de Playwright como fuente; fórmula de puntuación |
| Flaky | Criterios vagos | Tipos de evidencia, estados con umbrales, Wilson, flip rate, costo, correlación de orden y horario |
| Quarantine | Sin mecánica | Lista en el repo, máquina de estados, modo `run-and-ignore` vía `atium gate` |
| Triage | "Bug del producto" sin base | Taxonomía con `regression`, motor de reglas con confianza, ventana de red, incidentes masivos |
| Chaos | Sin mecanismo ni seguridad | Matriz de escenarios, detección del oráculo, hosts permitidos |
| Gaps | Sin reglas de matching | Match por template OpenAPI, GraphQL, fuentes de rutas |
| Priorización | Fórmula ausente | Fórmula de riesgo, confianza por fuente, presupuesto de tiempo, fallback |
| Score | Sin fórmula | Fórmula por densidad, categorías sin datos, exclusión de LLM |
| Storage | Sin manejo de concurrencia ni volumen | Archivos inmutables + compactación, niveles de retención, estimación de volumen, esquema SQLite |
| CLI | Sin exit codes ni precedencia | Exit codes, precedencia de configuración, variables de entorno, `doctor`, `gate`, `upload`, `sync`, `compact` |
| CI | Sin shards ni forks | Flujo con shards, PRs desde forks, comentario único |
| Seguridad | Parcial | Plugins, chaos, forks, credenciales |
| Pruebas del proyecto | No existía | Estrategia por niveles, pruebas estadísticas y de fail-open |
| Roadmap | Sin criterios | Criterios de aceptación por fase |
