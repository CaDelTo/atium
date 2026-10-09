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
  frameworkConfig?: { retries?: number; workers?: number; projects?: string[] };
  startedAt: string;
  finishedAt: string;
  results: TestResult[];
}

interface TestCase {
  testId: string;                     // ver 9.3
  project?: string;                   // proyecto de Playwright / browser
  file: string;                       // POSIX, relativo a la raíz del repo
  titlePath: string[];                // describe › describe › test
  tags: string[];                     // @smoke, @slow, etc.
  location?: { line: number; column: number };
}

interface TestResult {
  test: TestCase;
  outcome: "passed" | "failed" | "flaky" | "skipped";   // flaky = falló y luego pasó en este run
  attempts: Attempt[];
  workerIndex?: number;
  sequenceInWorker?: number;          // orden de ejecución dentro del worker
  quarantined: boolean;
  bdd?: BddContext;
}

interface Attempt {
  index: number;
  status: "passed" | "failed" | "timedOut" | "interrupted" | "skipped";
  startedAt: string;
  durationMs: number;
  error?: ErrorOccurrence;
  network?: NetworkSummary;
  console?: { errors: number; warnings: number; samples: string[] };   // muestras redactadas
  pageErrors?: string[];              // excepciones JS no capturadas
  artifacts?: {
    trace?: string;
    screenshots?: string[];
    ariaSnapshot?: string;
    video?: string;
  };
}

interface ErrorOccurrence {
  fingerprint: string;                // sección 13
  family: string;                     // agrupación gruesa: tipo + ubicación
  type: string;                       // TimeoutError, AssertionError, ...
  message: string;                    // redactado, máx. 2 KB
  stack?: string;                     // redactado, máx. 8 KB
  locator?: string;                   // si el error involucra un locator
  matcher?: { name: string; expected?: string; actual?: string };
  failedAtMs: number;                 // offset desde el inicio del intento
}

interface NetworkSummary {
  endpoints: Array<{
    method: string;
    urlTemplate: string;              // sección 12.4
    count: number;
    statuses: Record<string, number>;
    failures: number;
    p95Ms: number;
  }>;
  calls?: NetworkCall[];              // solo en intentos fallidos o modo de captura completa
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
  steps: Array<{ keyword: string; text: string; status: string; durationMs: number; definition?: string }>;
}
```

### 9.3 Identidad de un test (`testId`)

```
testId = sha1(project | file | titlePath.join(" › ")).slice(0, 16)
```

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

- Cada archivo de run incluye `schemaVersion`.
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
