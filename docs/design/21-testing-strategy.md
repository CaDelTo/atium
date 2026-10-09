# Estrategia de pruebas

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 29. Estrategia de pruebas del proyecto

| Nivel | Qué se prueba | Cómo |
|---|---|---|
| Unitario | Cada regla, normalizador, fórmula y backend | Vitest; `RuleTester` con casos válidos e inválidos, incluidos los casos que deben evitar falsos positivos (por ejemplo, `cy.wait("@alias")`) |
| Golden files | Reporters (consola, JSON, SARIF, datos del HTML) | Snapshots comparados en cada cambio |
| Compatibilidad | Adapters contra reportes reales | `fixtures/` con salidas de varias versiones de Playwright y Cypress |
| Estadístico | Clasificación de flaky | Historiales sintéticos: tests estables, flaky con $p \in \{0.01, 0.05, 0.2\}$, broken, dependientes de orden. Objetivo: < 1% de tests estables clasificados como flaky |
| Integración | Pipeline completo | Repos demo con problemas sembrados; se verifica que cada problema sembrado se detecta (recall) y que no aparecen hallazgos inesperados (precisión) |
| Fail-open | Que Atium nunca rompa una suite | Inyección de errores en reporter, fixture, storage y analizadores; el resultado de los tests no debe cambiar |
| Rendimiento | Requisitos de la [sección 7](01-requirements.md) | Benchmarks en CI con suites sintéticas de 1,000 y 5,000 tests |
| Matriz | Entornos soportados | Node 22/24 × últimas 3 versiones menores de Playwright × Linux/macOS/Windows |
| Dogfooding | Uso real | Atium analiza sus propios tests y los repos demo en cada PR |
