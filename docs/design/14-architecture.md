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
  currentRun?: LogicalRun;
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
