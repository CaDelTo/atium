# CLI y configuración

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 26. CLI y configuración

### 26.1 Comandos

```
atium init           genera atium.config.ts y detecta frameworks
atium doctor         verifica Node, config, Git, contexto de CI, .atium/ y frameworks
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

- Se reconocen antes y después del nombre del comando: `atium --strict init` equivale a `atium init --strict`.
- `--quiet` fija el nivel de log en `error` y `--verbose` en `debug`. Juntas son un error de uso (código 2).
- `--format`, `--output` y `--ci` llegan tipadas a cada comando, pero cada comando define qué valores acepta y qué hace con ellas, porque `--format` no significa lo mismo en todos (`junit|ctrf` en `ingest`, `playwright-args` en `affected`). `init` no las usa.
- Los textos del CLI (ayuda, resultados, errores y `hint`) están en inglés y centralizados en `packages/cli/src/messages.ts` ([ADR-0019](../adr/0019-idioma-mensajes-cli-reglas.md)).
- `atium --help` carga solo Commander y las definiciones de los comandos: `@atium/core` y la implementación de cada comando se importan cuando el comando se ejecuta ([05-performance.md](../engineering/05-performance.md#arranque-del-cli)).

`atium init [--force]`:

- Crea `atium.config.ts` en el directorio de trabajo con `defineConfig` de `@atium/core` y solo la lista `adapters`; el resto de secciones toma sus defaults (§26.3).
- Detecta los frameworks en `dependencies`, `devDependencies` y `peerDependencies` del `package.json` del directorio de trabajo: `@playwright/test` o `playwright` añaden `"playwright"`, y `cypress` añade `"cypress"`, en ese orden. Sin ninguno, `adapters` queda vacía.
- Solo lee `package.json` si es un archivo regular (siguiendo symlinks) de como mucho 1 MiB (`MANIFEST_MAX_BYTES`, para no procesar una entrada sin límite, [06-security.md](../engineering/06-security.md)).
- Un `package.json` que falta, no es un archivo regular, supera ese tamaño, no se puede leer o no tiene esa forma no es un error: se avisa por stderr y `adapters` queda vacía. Si uno de los tres grupos de dependencias no es un objeto, se descarta el manifest entero. El aviso de un error de lectura o de JSON solo da el código del error; con `--verbose` se registra el error completo, porque su mensaje lleva la ruta absoluta o un trozo del archivo.
- Si el `package.json` se leyó y `@atium/core` no está en ninguno de los tres grupos, avisa de que hay que añadirla para poder cargar la config. Sin `package.json` utilizable no hay ese aviso. Solo mira el `package.json` del directorio de trabajo, así que en un monorepo con la dependencia en la raíz el aviso puede sobrar.
- Un `atium.config.ts` existente (un archivo o un symlink, aunque esté roto o apunte a un directorio) solo se reemplaza con `--force`; sin `--force` es un error de uso. El reemplazo es atómico: se escribe en un directorio temporal junto a él y se renombra encima, así que si falla queda el archivo anterior, y en un symlink se reemplaza el enlace, no su destino. Sin `--force` se crea con `wx`, así que nunca reemplaza un archivo que aparezca después de las comprobaciones.
- Cualquier otro `atium.config.*` que la búsqueda tomaría (un archivo regular, siguiendo symlinks) es un error de uso incluso con `--force`, porque dos archivos de config hacen fallar la búsqueda. Un directorio o un symlink roto con uno de esos nombres se ignora, como en la búsqueda. Un directorio llamado `atium.config.ts` es un error de uso.
- Un error al comprobar o escribir el directorio de trabajo (por ejemplo, sin permiso) es un error interno (§26.2), no `CONFIG_NOT_FOUND` como en la búsqueda: `init` no busca una config, la crea.
- No acepta `--config` (error de uso): siempre crea el archivo en el directorio de trabajo. Si `ATIUM_CONFIG` está definida y no vacía, avisa de que los demás comandos cargarán ese archivo y no el creado.
- No carga la configuración existente, así que tampoco lee `ATIUM_LOG_LEVEL`; su nivel de log es el de `--quiet` o `--verbose`, o `info`.

`atium doctor`:

- Comprueba que Atium puede funcionar en el directorio de trabajo con seis verificaciones, en este orden, cada una con estado `pass`, `warn` o `fail`. Toda verificación que no pasa lleva un `hint`.
- En el CLI, la raíz del repositorio de la que parten `.atium/` y el resto de rutas de [15-storage.md](15-storage.md) es el directorio de trabajo, como en la búsqueda de la config (§26.3): no se sube a los directorios padre ni se pregunta a Git.

  | id | Qué comprueba | `fail` | `warn` |
  |---|---|---|---|
  | `node` | Node.js ≥ `MIN_NODE_VERSION` (22.12.0, el `engines` del CLI, que exige Commander 15) | versión menor o ilegible | — |
  | `config` | `loadConfig` como lo haría cualquier comando, con `--config`, `ATIUM_CONFIG` y `ATIUM_LOG_LEVEL`, así que ejecuta el `atium.config.*` del proyecto; muestra el archivo y sus `adapters` | `CONFIG_INVALID` o `CONFIG_NOT_FOUND`, con su mensaje y su `hint` | no hay archivo de config |
  | `git` | `git rev-parse HEAD` y la rama, en el directorio de trabajo | Git no está instalado o no hay repositorio con commits, y un run lo necesita: `ci` falló con `GIT_UNAVAILABLE` | lo mismo, pero el commit sale del entorno (`ATIUM_COMMIT_SHA` o el proveedor), así que Git no hace falta; el `hint` lo dice |
  | `ci` | `detectRunContext` (v0-13); muestra proveedor, run, PR, commit y rama (`local` fuera de CI) | `GIT_UNAVAILABLE` o `MODEL_INVALID` | — |
  | `storage` | Que `.atium/` (`ATIUM_DIRECTORY`) se puede escribir: crea y borra un directorio temporal dentro. Si no existe, lo prueba en el directorio de trabajo, donde se crearía, sin crearlo. Un symlink se resuelve con `realpath` y la prueba va a su destino. No abre SQLite, para no crear ni migrar la base | no es un directorio, no se puede escribir, o es un symlink roto o que lleva fuera del directorio de trabajo (o a él mismo). Si la prueba se crea pero no se puede borrar, el error es interno | — |
  | `frameworks` | Los adapters detectados en `package.json`, con las reglas y los mensajes de `init` | — | ninguno, o `package.json` falta, no es un archivo regular, supera 1 MiB, no se puede leer (el mensaje lleva el código del error, como `EACCES`) o no es un manifest |

- Las verificaciones son independientes: un fallo no detiene las demás. Un error inesperado dentro de una es interno (§26.2).
- Salida en stdout: una tabla (`CHECK`, `STATUS`, `RESULT`, con el `hint` debajo) y una línea de resumen, o con `--format json` un objeto `{ ok, checks: [{ id, status, message, hint?, details }] }` que valida `DoctorReportSchema` (`packages/cli/src/doctor/report.ts`), con los seis checks en este orden; `details` depende del `id`. `doctor` valida el informe con ese esquema antes de escribirlo. `--format` acepta `text` (por defecto) y `json`; otro valor es un error de uso y no se comprueba nada. `--output` y `--ci` no se usan.
- Todos los textos del informe, `details` incluido, pasan por la redacción por defecto (§28.1, `redactFields`) en los dos formatos; en la tabla se escapan además los caracteres de control. Las rutas no se ocultan: un config fuera del directorio de trabajo se muestra con su ruta absoluta.
- El JSON de `doctor` no es API pública en V0 ([07-public-api.md](../engineering/07-public-api.md)): puede cambiar sin aviso y no lleva versión.
- Código de salida: 2 si alguna verificación da `fail`, después de escribir el informe; en stderr va `atium doctor found N failed check(s).` con su `hint`. Con solo `pass` y `warn`, 0. Ver §26.2.
- Fuera de V0: la verificación del storage remoto (V4) y el resumen de errores internos que menciona [ADR-0006](../adr/0006-fail-open.md), que necesita un registro persistente de esos errores. Ninguna tarea lo recoge todavía.

Logs propios: van a stderr; stdout queda solo para resultados. `--verbose` o `DEBUG=atium:*` activan los mensajes de depuración y los stacks de los errores; `DEBUG` sigue la sintaxis del paquete debug. Los colores se desactivan con `NO_COLOR` (definida y no vacía) o cuando stderr no es una terminal. El formato de línea y las reglas de redacción están en [03-errors-logging.md](../engineering/03-errors-logging.md#logging) ([ADR-0022](../adr/0022-logger-reloj-en-core.md)).

### 26.2 Códigos de salida

| Código | Significado |
|---|---|
| 0 | OK |
| 1 | Gate fallido: Findings nuevos sobre el umbral o tests fallidos fuera de cuarentena. En `atium lint`, algún Finding nuevo con severidad `error` |
| 2 | Error de configuración o de uso |
| 3 | Error interno, solo con `--strict` |

Una verificación fallida de `atium doctor` también sale con 2: es un problema del entorno o de la config que el usuario debe arreglar; el 1 queda reservado para `gate` y para `atium lint`, que con Findings nuevos de severidad `error` es un gate sobre los hallazgos de lint ([ADR-0023](../adr/0023-arquitectura-linter.md), [03-linter.md §11.10](03-linter.md#1110-atium-lint)). Con solo `warning` o `info`, `atium lint` sale con 0.

Son errores de configuración o de uso (código 2) los de Commander (opción o comando desconocidos, argumentos de más, opciones incompatibles), los errores de uso propios de un comando y los `AtiumError` con `CONFIG_INVALID` o `CONFIG_NOT_FOUND`: su mensaje y, en la línea siguiente, `  Hint: <hint>` se escriben en stderr con la redacción por defecto (§28.1) y con los caracteres de control escapados como `\uXXXX` (también DEL, los C1 y los de dirección bidireccional), salvo los saltos de línea y los tabs. Con `--verbose` se registran además la causa y el stack. Los errores que escribe Commander, que repiten lo que se tecleó, se escapan igual. Cualquier otro error, incluido un `AtiumError` con otro código, es interno.

Sin `--strict`, un error interno imprime un aviso y sale con 0 (fail-open). El aviso se registra con nivel `error`, así que `--quiet` no lo oculta. Si reportar el error falla a su vez (por ejemplo, porque `@atium/core` no se puede cargar), se escribe un aviso mínimo y el código sigue siendo 0, o 3 con `--strict`: nunca el 1 con el que Node termina ante un error no capturado, que se leería como un gate fallido. La ayuda (`--help`) sale con 0; `atium` sin comando escribe la ayuda en stderr y sale con 2. En el comando `gate`, un error interno nunca convierte un pipeline fallido en exitoso: si no se pudo evaluar, se usa el resultado original de la suite.

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
  - `lint` es estricto: `include` (por defecto `["."]`) y `exclude` (por defecto `[]`), listas de rutas o globs relativos a la raíz con los archivos que analiza `atium lint` ([03-linter.md §11.10](03-linter.md#1110-atium-lint), [ADR-0023](../adr/0023-arquitectura-linter.md)). Los umbrales de las reglas cross-file van en `analyzers["lint-crossfile"]`.
  - Defaults: `quarantine.mode` es `run-and-ignore` ([07-flaky.md](07-flaky.md)), `llm.enabled` es `false`, `lint` toma los de arriba y `redact` toma los de §28.1. El resto no tiene default.
- **Precedencia en V0:**

  | Valor | Flag | Variable | Archivo | Default |
  |---|---|---|---|---|
  | Archivo de configuración | `--config` | `ATIUM_CONFIG` | — | búsqueda en la raíz |
  | Nivel de log | `--quiet` (`error`) o `--verbose` (`debug`), que el CLI traduce (§26.1) | `ATIUM_LOG_LEVEL` | — | `info` |
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

  lint: { include: ["tests"], exclude: ["tests/fixtures/**"] },

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
    "lint-crossfile": { rules: { E2E011: "on" } }, // reglas y umbrales cross-file (03-linter.md §11.10)
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

Variables de entorno principales: `ATIUM_CONFIG`, `ATIUM_STORAGE_*`, `ATIUM_COMMIT_SHA`, `ATIUM_BRANCH`, `ATIUM_CHAOS`, `ATIUM_LOG_LEVEL`, `NO_COLOR`. `ATIUM_LOG_LEVEL` lo resuelve `loadConfig` (v0-12) y lo aplica la opción `level` de `createStderrLogger`. `--quiet` lo traduce el CLI a un nivel (v0-17). `ATIUM_COMMIT_SHA` y `ATIUM_BRANCH` las lee `detectRunContext` (v0-13, [02-data-model.md §10.1](02-data-model.md#101-detección-detectruncontext)) y mandan sobre lo que diga el proveedor de CI.
