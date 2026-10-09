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
  storage: StorageReader;
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
  evidence?: Record<string, unknown>;  // datos que justifican el hallazgo
  suggestion?: { description: string; diff?: string };
  docsUrl?: string;
  owner?: string;                      // desde CODEOWNERS
}
```

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
