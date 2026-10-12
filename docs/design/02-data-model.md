# Modelo de datos y contexto de CI

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 9. Modelo de datos

Basado en CTRF y extendido. Definido con Zod: el mismo esquema valida la entrada de los adapters y genera los tipos TypeScript.

### 9.1 Entidades

```
Run (una ejecución de un job o shard)
 └── TestResult (resultado final de un test en ese run)
      └── Attempt (cada intento: 0 = original, 1..n = retries)
           ├── ErrorOccurrence
           ├── NetworkSummary
           └── Artifacts (trace, screenshots, ariaSnapshot)

TestCase (identidad estable de un test entre runs)
Finding (salida de cualquier analizador)
```

Separar **TestResult** de **Attempt** es necesario porque la evidencia más fuerte de flakiness es un test que falla en un intento y pasa en otro dentro del mismo run.

### 9.2 Esquema

```ts
interface Run {
  schemaVersion: 1;
  id: string;                         // uuid v7 (ordenable por tiempo)
  git: {
    commitSha: string;                // árbol exacto probado (en PR de GitHub: merge commit)
    headSha?: string;                 // head del PR, para enlaces y display
    branch?: string;
    baseBranch?: string;
    dirty: boolean;                   // cambios sin commitear (ejecución local)
  };
  ci?: {
    provider: string;                 // github, gitlab, jenkins, circleci, azure, local
    runId?: string;
    runAttempt?: number;              // re-run del mismo workflow
    jobId?: string;
    shard?: { index: number; total: number };
    prNumber?: number;
  };
  environment: {
    os: string;
    arch: string;
    nodeVersion: string;
    framework: { name: "playwright" | "cypress" | "junit" | "ctrf"; version?: string };
  };
  frameworkConfig?: { retries?: number; workers?: number; projects?: string[] };   // projects: máx. 100 de 256 B
  startedAt: string;
  finishedAt: string;
  results: TestResult[];
}

interface TestCase {
  testId: string;                     // ver 9.3; se calcula antes de cualquier recorte
  project?: string;                   // proyecto de Playwright / browser
  file: string;                       // POSIX, relativo a la raíz del repo
  titlePath: string[];                // describe › describe › test; máx. 20 niveles
  tags: string[];                     // @smoke, @slow, etc.; máx. 50
  location?: { line: number; column: number };
}

interface TestResult {
  test: TestCase;
  outcome: "passed" | "failed" | "flaky" | "skipped";   // flaky = falló y luego pasó en este run
  attempts: Attempt[];                // máx. 20: el primero y los 19 últimos
  attemptsDropped?: number;           // intentos descartados por el tope
  workerIndex?: number;
  sequenceInWorker?: number;          // orden de ejecución dentro del worker
  quarantined: boolean;
  bdd?: BddContext;
  detailTruncated?: true;             // el escritor recortó detalle para no superar el límite de línea
}

interface Attempt {
  index: number;
  status: "passed" | "failed" | "timedOut" | "interrupted" | "skipped";
  startedAt: string;
  durationMs: number;
  error?: ErrorOccurrence;
  network?: NetworkSummary;
  console?: { errors: number; warnings: number; samples: string[] };   // muestras redactadas sin ANSI; máx. 5 de 1 KiB
  pageErrors?: string[];              // excepciones JS no capturadas, sin ANSI; máx. 20 de 2 KiB
  pageErrorsDropped?: number;         // pageErrors descartados por el tope
  artifacts?: {                       // rutas a archivos, nunca su contenido
    trace?: string;
    screenshots?: string[];
    ariaSnapshot?: string;            // archivo aparte, como trace y screenshots
    video?: string;
  };
}

interface ErrorOccurrence {
  fingerprint: string;                // sección 13
  family: string;                     // agrupación gruesa: tipo + ubicación
  type: string;                       // TimeoutError, AssertionError, ...
  message: string;                    // redactado, texto plano sin ANSI, máx. 2 KB
  stack?: string;                     // redactado, texto plano sin ANSI, máx. 8 KB
  locator?: string;                   // si el error involucra un locator
  matcher?: { name: string; expected?: string; actual?: string };   // expected y actual: máx. 2 KiB
  failedAtMs: number;                 // offset desde el inicio del intento
}

interface NetworkSummary {
  endpoints: Array<{                  // máx. 200
    method: string;
    urlTemplate: string;              // sección 12.4
    count: number;
    statuses: Record<string, number>;
    failures: number;
    p95Ms: number;
  }>;
  endpointsDropped?: number;          // endpoints descartados por el tope
  calls?: NetworkCall[];              // solo en intentos fallidos o modo de captura completa; máx. 200
  callsDropped?: number;              // llamadas descartadas por el tope
}

interface NetworkCall {
  method: string;
  urlTemplate: string;
  host: string;
  status?: number;
  failure?: string;                   // net::ERR_*, aborted, timeout
  startedAtMs: number;
  durationMs?: number;
  graphqlOperation?: string;
}

interface BddContext {
  feature: string;
  scenario: string;
  steps: Array<{ keyword: string; text: string; status: string; durationMs: number; definition?: string }>;   // máx. 200; text 512 B, definition 256 B
  stepsDropped?: number;              // pasos descartados por el tope
}
```

Los topes de listas y textos, los conteos `*Dropped` y `detailTruncated` están definidos en [ADR-0018](../adr/0018-formato-archivos-run.md):

- Los topes de texto se miden en bytes UTF-8 del valor ya escapado para JSON. Cualquier string sin tope propio tiene un máximo de 2 KiB.
- Al escribir se eliminan los códigos ANSI de `message`, `stack`, las muestras de consola y `pageErrors`.
- Al aplicar un tope se conservan los elementos más cercanos al fallo. Las llamadas de red que seguían pendientes en el momento del fallo se conservan siempre.
- Los conteos `*Dropped` son enteros positivos y se omiten cuando valen 0.
- Si después de los topes la línea de un `TestResult` supera 768 KiB, el escritor recorta detalle en el orden del ADR y marca `detailTruncated: true`. Con los topes actuales, el resultado siempre queda por debajo.

### 9.3 Identidad de un test (`testId`)

```
testId = sha1(project | file | titlePath.join(" › ")).slice(0, 16)
```

- `|` es el carácter literal que separa los tres campos, sin espacios alrededor, y `›` es U+203A. Si el test no tiene `project`, se usa la cadena vacía: `sha1("|tests/a.spec.ts|cart › checkout")`. `file` es la ruta POSIX relativa a la raíz del repo.
- Como los niveles se unen con ` › `, un título que contiene ` › ` (o un `project` o `file` con `|`) puede dar el mismo `testId` que un test dividido de otra forma. No se corrige porque la fórmula la fija ADR-0003.
- No se aplica normalización Unicode: el mismo nombre en NFC y en NFD da `testId` distintos.
- Se calcula sobre los valores originales de `project`, `file` y `titlePath`, antes de los topes de [ADR-0018](../adr/0018-formato-archivos-run.md), para que la identidad del test no cambie al truncar.
- **Tests parametrizados:** cada variante tiene su propio título y por tanto su propio `testId`.
- **Renombres:** cuando en un mismo commit desaparece un `testId` y aparece otro, se vinculan si se cumple alguna de estas condiciones:
  - Git detecta el archivo como renombrado (`git diff -M`) y el `titlePath` es igual.
  - Mismo archivo y similitud de título ≥ 0.85 (Levenshtein normalizado).
  
  El vínculo se guarda en una tabla de alias para que el historial no se pierda.
- **Archivos movidos sin Git disponible:** se pierde el historial; se registra como test nuevo.

### 9.4 Shards y re-runs

- Cada shard produce su propio `Run`. Un **run lógico** es la unión de los shards con el mismo `ci.runId` y `ci.runAttempt`.
- Un re-run del mismo workflow (`runAttempt` > 1) sobre el mismo `commitSha` es una fuente valiosa de evidencia de flakiness.

### 9.5 Versionado del esquema

- Cada archivo de run incluye `schemaVersion` en su encabezado (línea 1). Formato y límites de tamaño: [ADR-0018](../adr/0018-formato-archivos-run.md).
- Los lectores soportan la versión actual y la anterior.
- La base SQLite local usa migraciones de Drizzle.

---

## 10. Contexto de ejecución y CI

Atium detecta automáticamente el proveedor de CI y completa `git` y `ci` del `Run` (con la librería `env-ci` más reglas propias).

| Proveedor | Commit | Rama | PR | Run / intento |
|---|---|---|---|---|
| GitHub Actions | `GITHUB_SHA` | `GITHUB_HEAD_REF` / `GITHUB_REF_NAME` | payload del evento (`GITHUB_EVENT_PATH`) | `GITHUB_RUN_ID` / `GITHUB_RUN_ATTEMPT` |
| GitLab CI | `CI_COMMIT_SHA` | `CI_COMMIT_REF_NAME` | `CI_MERGE_REQUEST_IID` | `CI_PIPELINE_ID` / `CI_JOB_ID` |
| Jenkins | `GIT_COMMIT` | `GIT_BRANCH` / `CHANGE_BRANCH` | `CHANGE_ID` | `BUILD_TAG` |
| CircleCI | `CIRCLE_SHA1` | `CIRCLE_BRANCH` | `CIRCLE_PULL_REQUEST` | `CIRCLE_WORKFLOW_ID` |
| Azure Pipelines | `BUILD_SOURCEVERSION` | `BUILD_SOURCEBRANCHNAME` | `SYSTEM_PULLREQUEST_PULLREQUESTID` | `BUILD_BUILDID` |
| Local | `git rev-parse HEAD` | `git branch --show-current` | — | uuid generado |

Detalles que afectan la calidad del análisis:

- **PR en GitHub:** `GITHUB_SHA` es el merge commit con la rama base, no el head del PR. Ese es el árbol que realmente se probó, así que se usa como `commitSha`; el head del PR se guarda en `headSha` para enlaces.
- **Ejecuciones locales con cambios sin commitear:** se marcan `dirty: true` y se excluyen del análisis de "mismo commit".
- **Overrides:** cualquier valor se puede forzar con variables `ATIUM_COMMIT_SHA`, `ATIUM_BRANCH`, etc.
