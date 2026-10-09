# Documento de diseño — Atium

> **Nombre provisional:** Atium (codename). El nombre definitivo está pendiente; cuando se decida, se reemplazan `Atium`, `atium` y `ATIUM_` con buscar y reemplazar.
>
> Versión 3 del diseño. Las versiones mínimas de dependencias y los valores numéricos por defecto son propuestas iniciales; se validan con datos reales en cada fase.

Las decisiones ya tomadas están en [`docs/adr/`](../adr/) y los estándares de código en [`docs/engineering/`](../engineering/README.md). Si una tarea requiere contradecir una de ellas, se propone un ADR nuevo antes de cambiar código.

## Archivos

| Archivo | Contenido | Leer cuando |
|---|---|---|
| [00-overview.md](00-overview.md) | Visión general | Siempre, antes de cualquier tarea |
| [01-requirements.md](01-requirements.md) | Requisitos no funcionales y compatibilidad | Tareas de rendimiento, adapters o soporte de versiones |
| [02-data-model.md](02-data-model.md) | Modelo de datos y contexto de CI | Cualquier tarea que lea o escriba runs, tests o intentos |
| [03-linter.md](03-linter.md) | Linter | Reglas de ESLint e índice cross-file |
| [04-collector.md](04-collector.md) | Execution Collector | Reporter, fixture, Cypress, ingesta, captura de red |
| [05-fingerprinting.md](05-fingerprinting.md) | Fingerprinting de errores | Normalización y agrupación de errores |
| [06-selector-advisor.md](06-selector-advisor.md) | Selector Advisor | Clasificación y sugerencias de selectores |
| [07-flaky.md](07-flaky.md) | Flaky Detection y quarantine | Evidencia, estados, métricas, cuarentena |
| [08-triage.md](08-triage.md) | Failure Triage | Clasificación de fallos |
| [09-network-chaos.md](09-network-chaos.md) | Red: análisis y chaos | Análisis de red e inyección de fallos |
| [10-test-gaps.md](10-test-gaps.md) | Test Gap Analysis | OpenAPI, GraphQL, rutas |
| [11-prioritization.md](11-prioritization.md) | Priorización e impacto | Riesgo, affected, sharding |
| [12-bdd.md](12-bdd.md) | Higiene BDD | Cucumber y playwright-bdd |
| [13-score-baseline-reports.md](13-score-baseline-reports.md) | Score, baseline y reportes | Score, baseline, reporters |
| [14-architecture.md](14-architecture.md) | Arquitectura | Analizadores, Finding, plugins, LLM |
| [15-storage.md](15-storage.md) | Storage | Persistencia, compactación, esquema SQLite |
| [16-repository-structure.md](16-repository-structure.md) | Estructura del repositorio | Crear paquetes o mover archivos |
| [17-tech-stack.md](17-tech-stack.md) | Stack tecnológico | Agregar o elegir dependencias |
| [18-cli-config.md](18-cli-config.md) | CLI y configuración | Comandos, exit codes, config |
| [19-ci-cd.md](19-ci-cd.md) | Integración con CI/CD | GitHub Action, GitLab, gate, PR comment |
| [20-security-privacy.md](20-security-privacy.md) | Privacidad y seguridad | Redacción, plugins, forks, credenciales |
| [21-testing-strategy.md](21-testing-strategy.md) | Estrategia de pruebas | Escribir tests del proyecto |
| [22-roadmap.md](22-roadmap.md) | Roadmap | Planear fases y criterios de aceptación |
| [23-risks-open-decisions.md](23-risks-open-decisions.md) | Riesgos y decisiones abiertas | Antes de tomar una decisión no documentada |
| [24-adoption.md](24-adoption.md) | Adopción y resultado final | Documentación, ejemplos, experiencia de usuario |
| [99-changelog.md](99-changelog.md) | Historial de cambios del diseño | Entender por qué algo cambió |

## Numeración de secciones

Los archivos conservan la numeración original del documento para que las referencias cruzadas ("sección 22.3") sigan siendo válidas.

| Sección | Archivo |
|---|---|
| 1 | [00-overview.md](00-overview.md) |
| 2 | [00-overview.md](00-overview.md) |
| 3 | [00-overview.md](00-overview.md) |
| 4 | [00-overview.md](00-overview.md) |
| 5 | [00-overview.md](00-overview.md) |
| 6 | [00-overview.md](00-overview.md) |
| 7 | [01-requirements.md](01-requirements.md) |
| 8 | [01-requirements.md](01-requirements.md) |
| 9 | [02-data-model.md](02-data-model.md) |
| 10 | [02-data-model.md](02-data-model.md) |
| 11 | [03-linter.md](03-linter.md) |
| 12 | [04-collector.md](04-collector.md) |
| 13 | [05-fingerprinting.md](05-fingerprinting.md) |
| 14 | [06-selector-advisor.md](06-selector-advisor.md) |
| 15 | [07-flaky.md](07-flaky.md) |
| 16 | [08-triage.md](08-triage.md) |
| 17 | [09-network-chaos.md](09-network-chaos.md) |
| 18 | [10-test-gaps.md](10-test-gaps.md) |
| 19 | [11-prioritization.md](11-prioritization.md) |
| 20 | [12-bdd.md](12-bdd.md) |
| 21 | [13-score-baseline-reports.md](13-score-baseline-reports.md) |
| 22 | [14-architecture.md](14-architecture.md) |
| 23 | [15-storage.md](15-storage.md) |
| 24 | [16-repository-structure.md](16-repository-structure.md) |
| 25 | [17-tech-stack.md](17-tech-stack.md) |
| 26 | [18-cli-config.md](18-cli-config.md) |
| 27 | [19-ci-cd.md](19-ci-cd.md) |
| 28 | [20-security-privacy.md](20-security-privacy.md) |
| 29 | [21-testing-strategy.md](21-testing-strategy.md) |
| 30 | [22-roadmap.md](22-roadmap.md) |
| 31 | [23-risks-open-decisions.md](23-risks-open-decisions.md) |
| 32 | [24-adoption.md](24-adoption.md) |
| 33 | [24-adoption.md](24-adoption.md) |
