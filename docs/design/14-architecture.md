# Arquitectura

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 22. Arquitectura

### 22.1 Capas

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
 │   Adapters   │   │ ESLint plugin│   │ Git · OpenAPI ·  │
 │  (runtime)   │   │ + índice CLI │   │ rutas · CODEOWN. │
 └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘
        ▼                  │                    │
 ┌──────────────┐          │                    │
 │ Modelo (Zod) │          │                    │
 └──────┬───────┘          │                    │
        ▼                  │                    │
 ┌──────────────┐          │                    │
 │   Storage    │          │                    │
 └──────┬───────┘          │                    │
        ▼                  ▼                    ▼
 ┌──────────────────────────────────────────────────────┐
 │                      Analyzers                       │
 └──────────────────────────┬───────────────────────────┘
                            ▼
 ┌──────────────────────────────────────────────────────┐
 │  Findings → Baseline → Score → Gate → Reporters      │
 └──────────────────────────────────────────────────────┘
```

Pipeline: **collect → upload → sync → analyze → findings → gate → report**.

### 22.2 Interfaz de analizador

```ts
interface Analyzer<C = unknown> {
  id: string;                          // "flaky", "triage", "gaps"...
  version: string;                     // invalida cachés al cambiar
  kind: "static" | "runtime" | "history";
  requires: Capability[];              // "history" | "network" | "dom" | "traces" | "coverage" | "git" | "openapi"
  configSchema: ZodType<C>;            // validación y defaults de su sección de config
  analyze(ctx: AnalysisContext<C>): Promise<Finding[]>;
}

interface AnalysisContext<C> {
  config: C;
  project: ResolvedProject;            // raíz, frameworks detectados, CODEOWNERS
  storage?: StorageReader;            // solo si la capacidad "history" está disponible
  git?: GitContext;                    // diff, renombres, commits
  currentRun?: LogicalRun;             // git y currentRun: pendientes, ver "Implementación"
  logger: Logger;
  signal: AbortSignal;                 // cancelación y timeouts
}
```

El orquestador:

- Ejecuta solo los analizadores cuyas `requires` están disponibles; el resto se reporta como omitido con el motivo.
- Ejecuta analizadores independientes en paralelo.
- Aplica un timeout por analizador; si se excede, se omite con aviso (fail-open).

Datos de entrada ([ADR-0023](../adr/0023-arquitectura-linter.md)):

- `storage` solo está presente cuando la capacidad `history` está disponible. Un analizador que la necesita la declara en `requires`; si no está disponible, el orquestador lo omite con el motivo y nunca lo ejecuta sin `storage`.
- El índice de la suite (§11.4) no viaja en el `AnalysisContext`, porque `core` no conoce su forma. El CLI construye el índice (I/O en el borde) y crea el analizador con él: `createLintCrossfileAnalyzer({ index })`. Si el índice no se puede construir, el CLI no registra el analizador y lo reporta como omitido con el motivo.

Implementación (`runAnalyzers` en `packages/core/src/pipeline`):

- `ResolvedProject` solo tiene `root` por ahora. Los frameworks detectados y CODEOWNERS los añaden las tareas que los resuelven. Lo mismo vale para `git` (`GitContext`) y `currentRun` (`LogicalRun`): son campos opcionales del contexto que se añaden con la tarea que defina cada tipo.
- Orden de comprobaciones:
  1. Un analizador con el mismo `id` que uno anterior se omite con aviso (`duplicate-id`).
  2. Si faltan capacidades de `requires`, se omite sin aviso del orquestador (`missing-capabilities`, con la lista de las que faltan). El comando muestra la lista de omitidos con su motivo: ese es el aviso de [01-requirements.md §8](01-requirements.md#8-compatibilidad). `history` está disponible exactamente cuando se pasa `storage`, aunque un llamador la incluya en las capacidades.
  3. La sección `analyzers.<id>` de la config se valida con `configSchema`, ya dentro del timeout del analizador. Si falta, se valida `{}`, para que el esquema ponga los defaults. Si no es válida, se omite con aviso y `CONFIG_INVALID` (`invalid-config`). Si el esquema lanza en vez de devolver issues, se omite como `failed`.
- Concurrencia y timeout:
  - Los analizadores que pasan las comprobaciones se ejecutan con `p-limit`, como máximo `ANALYZER_CONCURRENCY` iniciados a la vez. Al vencer el timeout o cancelarse el análisis, su hueco se libera aunque el analizador ignore su `signal` y siga trabajando; si no, un analizador colgado bloquearía la cola.
  - Cada uno tiene `ANALYZER_TIMEOUT_MS` desde que empieza, validación de la config incluida. Al excederlo, su `signal` se aborta con un `AtiumError` `ANALYZER_TIMEOUT` y se omite con aviso (`timeout`). Lo que devuelva después, o el error con que rechace, se ignora sin aviso. El timeout no interrumpe un bloqueo síncrono del hilo.
  - Ambos valores se pueden sobrescribir (`timeoutMs`, `concurrency`); un valor que no es un entero positivo, o un `timeoutMs` mayor que 2^31 - 1 (el máximo de un timer), lanza `RangeError`.
- Fail-open: un analizador que lanza, o que devuelve algo que no es un array, se omite con aviso (`failed`).
- Cancelación: si se aborta la señal del orquestador, los analizadores en curso o pendientes, incluidos los que validan su config, se omiten sin aviso (`aborted`).
- Findings inválidos: se descarta solo el Finding que no cumple `FindingSchema` y se conservan los válidos del mismo analizador. Se emite un aviso por analizador, con el número de descartados y los problemas del primero (`MODEL_INVALID`).
- Determinismo: los Findings se ordenan con `compareFindings`. Los omitidos y los avisos del orquestador siguen el orden de entrada de los analizadores, no el orden en que terminan. Los avisos que registra cada analizador con su `logger` salen cuando los emite.

Valores del orquestador (`packages/core/src/defaults.ts`):

| Valor | Default | Motivo |
|---|---|---|
| `ANALYZER_TIMEOUT_MS` | 60 000 ms | Margen amplio para un analizador sobre una suite grande. Un analizador colgado no bloquea el comando más de un minuto |
| `ANALYZER_CONCURRENCY` | 4 | Los analizadores comparten un hilo, así que el límite acota I/O concurrente, no CPU. Es el extremo bajo del rango de I/O de red de [05-performance.md](../engineering/05-performance.md) (4 a 8) |

### 22.3 Finding unificado

```ts
interface Finding {
  fingerprint: string;                 // estable entre runs (lint: sección 11.5)
  analyzer: string;
  ruleId: string;                      // "E2E001", "FLAKY001", "TRIAGE003", "GAP002"...
  severity: "info" | "warning" | "error";
  category:
    | "reliability"
    | "maintainability"
    | "selectors"
    | "assertions"
    | "network"
    | "coverage-gap"
    | "architecture";
  source: "rule" | "heuristic" | "llm";
  confidence: "high" | "medium" | "low";
  message: string;
  location?: { file: string; line?: number; column?: number };
  testId?: string;
  evidence?: Record<string, JsonValue>; // datos que justifican el hallazgo; solo valores JSON
  suggestion?: { description: string; diff?: string };
  docsUrl?: string;
  owner?: string;                      // desde CODEOWNERS
}
```

- `fingerprint` = `sha1(partes).slice(0, 16)`, con las partes codificadas con `JSON.stringify` (`fingerprintOf` en `packages/core/src/findings`). Ningún separador es ambiguo: `["a|b"]` y `["a", "b"]` dan fingerprints distintos. En los fingerprints de Finding, la notación `sha1(a | b | c)` (por ejemplo, en la sección 11.5) enumera las partes; el `|` no es un separador literal.
- Orden de salida (`compareFindings`): `location.file`, `line`, `column`, `ruleId` y `fingerprint` como desempate. Los strings se comparan por unidades de código UTF-16, sin locale. Lo ausente va después de lo presente: los Findings sin `location` van al final, y dentro de un archivo, los que no tienen `line` o `column` van después de los que sí.
- El esquema Zod (`FindingSchema`) es más estricto que la interfaz, porque los Findings también vienen de plugins de terceros:
  - `fingerprint` son 16 caracteres hex en minúscula, como los devuelve `fingerprintOf`, y `testId` tiene el formato de la sección 9.3.
  - `analyzer`, `ruleId`, `message`, `location.file`, `suggestion.description`, `suggestion.diff` y `owner` no pueden estar vacíos. `location.file` es una ruta POSIX relativa a la raíz del repositorio, como `TestCase.file`.
  - `line` y `column` son enteros ≥ 1.
  - `evidence` solo admite valores JSON, y `docsUrl`, URLs `http` o `https`, porque los reportes la muestran como enlace.
  - Rechaza campos desconocidos en `Finding`, `location` y `suggestion`, y un opcional con valor `undefined` explícito: un campo ausente se omite.
  - Los textos no tienen tope: los de ADR-0018 son de los archivos de run.

### 22.4 Plugins

Los plugins se declaran en la configuración, igual que en ESLint o Vite, y pueden aportar analizadores, reglas de triage, reporters, adapters o backends de storage:

```ts
plugins: ["@atium/analyzer-gaps", "./tools/my-company-rules.ts"]
```

```ts
interface Plugin {
  name: string;
  analyzers?: Analyzer[];
  triageRules?: TriageRule[];
  reporters?: Reporter[];
  storage?: Record<string, StorageFactory>;
}
```

### 22.5 Proveedor LLM (opcional)

```ts
interface LlmProvider {
  complete(req: { system: string; prompt: string; maxTokens: number }): Promise<string>;
}
```

- Usos permitidos: grupos de triage `unknown`, escenarios BDD sugeridos, candidatos de selector ambiguos.
- Las entradas pasan por la misma redacción que el resto de datos.
- Las respuestas se cachean por hash de entrada.
- Todo Finding generado lleva `source: "llm"` y no afecta el score ni el gate.
