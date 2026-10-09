# CLI y configuración

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 26. CLI y configuración

### 26.1 Comandos

```
atium init           genera atium.config.ts y detecta frameworks
atium doctor         verifica instalación, config, adapters y acceso al storage
atium lint           linter + reglas cross-file
atium ingest         importa JUnit XML o CTRF
atium upload         sube los runs locales al storage remoto
atium sync           descarga el historial necesario para analizar
atium analyze        ejecuta los analizadores habilitados
atium gate           decide si el pipeline pasa (Findings nuevos + fallos fuera de cuarentena)
atium triage         agrupa y clasifica fallos del último run
atium flaky          ranking de flaky y broken
atium stress         repite tests N veces (--isolate para orden)
atium quarantine     propone entradas y salidas de cuarentena
atium selectors      reporte y sugerencias de selectores (--collect)
atium gaps           endpoints, respuestas y rutas sin probar
atium affected       tests priorizados para un cambio
atium chaos          inyección de fallos de red
atium baseline       congela los Findings actuales
atium compact        compacta el historial remoto
atium report         HTML, JSON, SARIF, JUnit
atium export|import  mover historial en JSON
```

Opciones globales: `--config`, `--format`, `--output`, `--ci`, `--strict`, `--quiet`, `--verbose`.

### 26.2 Códigos de salida

| Código | Significado |
|---|---|
| 0 | OK |
| 1 | Gate fallido: Findings nuevos sobre el umbral o tests fallidos fuera de cuarentena |
| 2 | Error de configuración o de uso |
| 3 | Error interno, solo con `--strict` |

Sin `--strict`, un error interno imprime un aviso y sale con 0 (fail-open). En el comando `gate`, un error interno nunca convierte un pipeline fallido en exitoso: si no se pudo evaluar, se usa el resultado original de la suite.

### 26.3 Configuración

Precedencia: **flags del CLI > variables `ATIUM_*` > archivo de configuración > defaults del preset**.

Archivo: `atium.config.{ts,mts,js,mjs,json}` en la raíz, o `--config`. Se valida con Zod; las claves desconocidas producen un error con sugerencia ("¿quisiste decir `storage`?").

```ts
// atium.config.ts
import { defineConfig } from "@atium/core";

export default defineConfig({
  adapters: ["playwright"],
  plugins: ["@atium/analyzer-gaps"],

  storage: {
    type: "s3",
    bucket: "my-atium-history",
    prefix: "web-app",
    retention: { rawDays: 14, rollupDays: 180 },
  },

  network: {
    hosts: ["api.myapp.test"],
    graphqlEndpoints: ["/graphql"],
  },

  analyzers: {
    flaky: { windowDays: 30, minAttempts: 10 },
    triage: { networkWindowSeconds: 30 },
    gaps: { openapi: "./openapi.yaml", routes: ["/", "/cart", "/checkout"] },
    impact: {
      map: { "src/payment/**": ["tests/checkout/**", "tests/payment/**"] },
      endpoints: { "POST /api/payment": ["services/payment/**"] },
      alwaysRun: ["@smoke"],
    },
    chaos: { allowedHosts: ["localhost", "*.test"], maxScenariosPerTest: 6 },
  },

  quarantine: { mode: "run-and-ignore", auto: false },

  gate: {
    minScore: 80,
    failOn: ["new-flaky", "new-hard-wait", "new-fragile-selector"],
    respectQuarantine: true,
  },

  redact: {
    headers: ["authorization", "cookie", "set-cookie", "x-api-key"],
    bodyFields: ["password", "token", "cardNumber"],
    patterns: ["jwt", "bearer", "aws-key"],
  },

  llm: { enabled: false },
});
```

Variables de entorno principales: `ATIUM_CONFIG`, `ATIUM_STORAGE_*`, `ATIUM_COMMIT_SHA`, `ATIUM_BRANCH`, `ATIUM_CHAOS`, `ATIUM_LOG_LEVEL`, `NO_COLOR`.
