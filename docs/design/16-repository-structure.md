# Estructura del repositorio

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 24. Estructura del repositorio

Monorepo con paquetes independientes, para que cada usuario instale solo lo que usa.

```
atium/
├── packages/
│   ├── core/                    @atium/core
│   │   ├── schemas/             JSON Schema publicado (generado desde model/)
│   │   ├── test-contracts/      suites de contrato que pasa cada implementación (`@atium/core/test-contracts`)
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
│   │       ├── pure/            reexporta los módulos sin I/O (`@atium/core/pure`, ADR-0023)
│   │       └── testing/         builders y fakes (`@atium/core/testing`)
│   │
│   ├── cli/                     @atium/cli (bin: atium)
│   ├── eslint-plugin/           @atium/eslint-plugin
│   │   ├── test/                helper compartido de RuleTester
│   │   └── src/
│   │       ├── rules/           una regla por archivo y su registro
│   │       ├── syntax/          lógica E2E compartida (`@atium/eslint-plugin/syntax`, ADR-0023)
│   │       ├── create-rule.ts   fija `meta.docs.url` desde el código de la regla
│   │       ├── settings.ts      lee y valida `settings.atium`
│   │       └── plugin.ts        objeto del plugin para flat config
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
│   ├── playwright-demo/         tests con problemas deliberados, expected-findings.json y verify/; la app llega en V2
│   └── cypress-demo/
├── fixtures/                    reportes reales por versión de framework, historiales sintéticos
├── docs/                        documentación interna y futuro sitio; rules/ tiene una página por regla, a partir de rules/_template.md
└── .changeset/
```

En V0 basta con `core`, `cli` y `adapters/playwright`; el resto se agrega por fase.
