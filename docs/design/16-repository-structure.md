# Estructura del repositorio

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 24. Estructura del repositorio

Monorepo con paquetes independientes, para que cada usuario instale solo lo que usa.

```
atium/
├── packages/
│   ├── core/                    @atium/core
│   │   ├── schemas/             JSON Schema publicado (generado desde model/)
│   │   ├── test-contracts/      suites de contrato que pasa cada implementación
│   │   └── src/
│   │       ├── model/           esquemas Zod y tipos
│   │       ├── config/          defineConfig, carga y validación
│   │       ├── ci/              detección de proveedor y contexto git
│   │       ├── pipeline/        orquestador de analizadores
│   │       ├── findings/        Finding, fingerprint, baseline
│   │       ├── fingerprint/     normalización de errores
│   │       ├── redact/          redacción de datos sensibles
│   │       ├── scoring/
│   │       ├── storage/         interfaz, layout, compactación
│   │       ├── plugins/         carga de plugins
│   │       └── testing/         builders y fakes (`@atium/core/testing`)
│   │
│   ├── cli/                     @atium/cli (bin: atium)
│   ├── eslint-plugin/           @atium/eslint-plugin
│   ├── suite-index/             índice cross-file de la suite
│   │
│   ├── adapters/
│   │   ├── playwright/          @atium/playwright (reporter + fixture)
│   │   ├── cypress/             @atium/cypress
│   │   ├── junit/
│   │   └── ctrf/
│   ├── bdd/                     @atium/bdd
│   │
│   ├── analyzers/
│   │   ├── lint-crossfile/
│   │   ├── selectors/
│   │   ├── flaky/
│   │   ├── triage/
│   │   ├── network/
│   │   ├── chaos/
│   │   ├── gaps/
│   │   └── impact/
│   │
│   ├── storage/
│   │   ├── sqlite/
│   │   ├── s3/
│   │   └── git-branch/
│   │
│   ├── reporters/
│   │   ├── console/
│   │   ├── json/
│   │   ├── sarif/
│   │   ├── junit/
│   │   └── html/                React + Vite, un solo archivo
│   │
│   └── github-action/           atium/action
│
├── examples/
│   ├── playwright-demo/         app + tests con problemas deliberados
│   └── cypress-demo/
├── fixtures/                    reportes reales por versión de framework, historiales sintéticos
├── docs/                        sitio de documentación (una página por regla)
└── .changeset/
```

En V0 basta con `core`, `cli` y `adapters/playwright`; el resto se agrega por fase.
