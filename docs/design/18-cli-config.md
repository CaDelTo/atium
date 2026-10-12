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

Logs propios: van a stderr; stdout queda solo para resultados. `--verbose` o `DEBUG=atium:*` activan los mensajes de depuración y los stacks de los errores; `DEBUG` sigue la sintaxis del paquete debug. Los colores se desactivan con `NO_COLOR` (definida y no vacía) o cuando stderr no es una terminal. El formato de línea y las reglas de redacción están en [03-errors-logging.md](../engineering/03-errors-logging.md#logging) ([ADR-0022](../adr/0022-logger-reloj-en-core.md)).

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

Lo implementa `loadConfig` de `@atium/core` (`packages/core/src/config`, [ADR-0017](../adr/0017-carga-config-jiti.md)):

- **Búsqueda:** el archivo de `--config`; si no hay, el de `ATIUM_CONFIG`; si tampoco, el único `atium.config.{ts,mts,js,mjs,json}` del directorio de trabajo, sin subir a los directorios padre. Una ruta relativa parte del directorio de trabajo. Una variable vacía cuenta como no definida; un `--config` vacío, en cambio, cuenta como indicado y falla por la extensión.
- **Casos de la búsqueda:**
  - Sin archivo, todas las secciones toman sus defaults y no hay error.
  - Si el directorio tiene más de un archivo de configuración, es un error `CONFIG_INVALID` que los lista.
  - Un directorio con el nombre de un archivo de configuración se ignora.
  - Un archivo indicado con `--config` o `ATIUM_CONFIG` que no existe, o que no es un archivo, da `CONFIG_NOT_FOUND`. Si tiene otra extensión, da `CONFIG_INVALID`. La extensión se comprueba primero y distingue mayúsculas.
  - Si no se puede comprobar si un archivo existe (por ejemplo, sin permiso sobre el directorio), da `CONFIG_NOT_FOUND` con la causa, también durante la búsqueda.
- **Carga:** jiti, importado de forma diferida, sin caché de módulos ni en disco. Se usa el `export default` del archivo; en un `.json`, su contenido. Un error de sintaxis o de ejecución, o un archivo sin `export default`, da `CONFIG_INVALID` con la causa.
- **Esquema:**
  - Nivel superior estricto. `quarantine` y `redact` también son estrictos.
  - `adapters` y `plugins` son listas de nombres.
  - `storage`, `network`, `gate`, `llm` (salvo `enabled`) y cada `analyzers.<nombre>` son objetos abiertos hasta que la fase de cada uno defina su esquema.
  - Defaults: `quarantine.mode` es `run-and-ignore` ([07-flaky.md](07-flaky.md)), `llm.enabled` es `false` y `redact` toma los de §28.1. El resto no tiene default.
- **Precedencia en V0:**

  | Valor | Flag | Variable | Archivo | Default |
  |---|---|---|---|---|
  | Archivo de configuración | `--config` | `ATIUM_CONFIG` | — | búsqueda en la raíz |
  | Nivel de log | el CLI traduce `--quiet` y `--verbose` (v0-17) | `ATIUM_LOG_LEVEL` | — | `info` |
  | Secciones | — | — | el archivo | defaults del esquema |

- **`ATIUM_LOG_LEVEL`:** acepta exactamente `error`, `warn`, `info` o `debug`. Es el nivel mínimo que se escribe: con `warn`, solo `error` y `warn`. Con `debug` se activan además los mensajes de depuración, igual que con `--verbose`. `DEBUG` activa la depuración sea cual sea el nivel.
  - Vacía cuenta como no definida.
  - Si el CLI pasa un nivel por flag, la variable no se lee, así que un valor inválido en ella se ignora.
  - Cualquier otro valor da `CONFIG_INVALID`, con el valor redactado y, si hay uno a distancia ≤ 2, el nivel sugerido (`DEBUG` sugiere `debug`).
- **Errores de validación (`CONFIG_INVALID`):**
  - El mensaje sigue [03-errors-logging.md](../engineering/03-errors-logging.md#mensajes-de-error). Da una línea por problema, con la ruta de la clave y el valor recibido, por ejemplo `Invalid config in "atium.config.ts": "adapters" must be an array (received "playwright").`
  - Los strings recibidos, las claves desconocidas y las rutas de claves pasan por los patrones de redacción por defecto y se recortan a 200 bytes (`ERROR_PATH_PREVIEW_BYTES`). Los objetos y los arrays se describen por su tipo.
  - El `hint` cubre todas las claves desconocidas. Para cada una sugiere la clave conocida más cercana: distancia de Levenshtein ≤ 2 (`CONFIG_SUGGESTION_MAX_DISTANCE`), comparando en minúsculas y en cualquier nivel con esquema estricto; en un empate gana la primera en el orden del esquema. Para las que no tienen sugerencia, lista las claves válidas de su objeto.
  - Con una sola clave desconocida y con sugerencia, el `hint` es `Did you mean "storage"?`. Con varias, empareja cada sugerencia con su clave, como en `Did you mean "storage" instead of "storgae", "mode" instead of "moed"?`.
  - El mensaje lista todos los problemas, sin tope de líneas.

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

  // Defaults shown; each list is made of name fragments (20-security-privacy.md §28.1).
  redact: {
    headers: ["authorization", "cookie", "apikey", "token", "secret", "session"],
    bodyFields: [
      "password", "passwd", "secret", "token", "apikey",
      "credential", "privatekey", "sessionid", "cardnumber", "cvv",
    ],
    patterns: ["jwt", "bearer", "aws-key", "gcp-key", "azure-key"],
  },

  llm: { enabled: false },
});
```

Variables de entorno principales: `ATIUM_CONFIG`, `ATIUM_STORAGE_*`, `ATIUM_COMMIT_SHA`, `ATIUM_BRANCH`, `ATIUM_CHAOS`, `ATIUM_LOG_LEVEL`, `NO_COLOR`. `ATIUM_LOG_LEVEL` lo resuelve `loadConfig` (v0-12) y lo aplica la opción `level` de `createStderrLogger`. `--quiet` lo traduce el CLI a un nivel (v0-17).
