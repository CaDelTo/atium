# Roadmap

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 30. Roadmap

Cada fase es usable por sí sola y tiene criterios de aceptación. Se valida con QAs reales antes de pasar a la siguiente.

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| V0 | Monorepo, herramientas de calidad, CI, core (modelo, Finding, config, CI context, logger, redacción, archivos de run, storage SQLite), CLI base, `init`, `doctor` | Un run válido (construido con builders) se guarda en SQLite y en archivo de run, y se lee igual, con el contexto de git y CI correcto en los 5 proveedores soportados. El reporter de Playwright llega en V2 |
| V1 | ESLint plugin (reglas por archivo, presets), índice cross-file, consola/JSON/SARIF, baseline de lint | Las reglas detectan el 100% de problemas sembrados en el repo demo; lint de 1,000 archivos dentro del presupuesto; anotaciones visibles en un PR de GitHub |
| V2 | Reporter y fixture de Playwright, fingerprinting, ingesta JUnit/CTRF, reporte HTML | Overhead ≤ 3%; inyección de fallos no altera resultados; mismos errores producen el mismo fingerprint en runs distintos |
| V3 | Failure Triage, Flaky Detection, `stress`, quarantine | En historiales sintéticos: < 1% de falsos positivos de flaky; incidentes masivos agrupados correctamente |
| V4 | Storage remoto (S3, rama git), compactación, `upload`/`sync`/`gate`, GitHub Action, PR comment, modo fork | Historial persistente entre runs con shards en paralelo; PR comment único y actualizado; forks en modo degradado sin errores |
| V5 | Selector Advisor (clasificación, traces, puntuación, sugerencias) | Sugerencias únicas y válidas para los selectores frágiles del repo demo |
| V6 | Adapter de Cypress, capa BDD (cucumber-js y playwright-bdd) | Mismo análisis de flaky y triage con Cypress; reglas BDD001–BDD005 funcionando |
| V7 | Red: análisis y chaos con oráculo | Endpoint inestable sembrado detectado; escenarios de chaos clasificados `graceful` / `degraded` / `broken` correctamente en el demo |
| V8 | Test Gap Analysis (OpenAPI, GraphQL, respuestas, rutas) | Endpoints sin probar del demo detectados sin falsos positivos por normalización de URLs |
| V9 | Priorización por riesgo, `affected`, sharding; luego impacto por coverage | En el demo, los tests relacionados con un cambio sembrado quedan en el primer 20% del orden |
| Opcional | Integración Stryker, asistencia LLM, servidor de ingesta y dashboard | — |
