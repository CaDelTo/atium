# Score, baseline y reportes

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 21. Score, baseline y reportes

### 21.1 Score por categoría

Cada Finding tiene un peso según su severidad: $w(\text{info}) = 0.25$, $w(\text{warning}) = 1$, $w(\text{error}) = 3$. Para una categoría $c$ con hallazgos $F_c$ y $N$ tests:

$$
D_c = \frac{\sum_{f \in F_c} w(f)}{N}
\qquad
S_c = 100 \cdot e^{-\lambda_c D_c}
$$

Con $\lambda_c = 3.5$ por defecto, una densidad de 0.1 (un hallazgo de tipo warning por cada 10 tests) da $S_c \approx 70$.

**Confiabilidad** usa una densidad propia, porque cada test flaky o roto pesa mucho más que un hallazgo de estilo:

$$
D_{\text{rel}} = \frac{\#\text{flaky} + 2 \cdot \#\text{broken}}{N}, \qquad \lambda_{\text{rel}} = 10
$$

### 21.2 Score global

$$
S = \frac{\sum_c \alpha_c S_c}{\sum_c \alpha_c}
$$

- $\alpha_c$ son pesos configurables por categoría.
- Las categorías sin datos (por ejemplo, red con ingesta JUnit) se muestran como `N/A` y se excluyen de la suma; los pesos se renormalizan.
- Hallazgos con `source: "llm"` nunca entran al cálculo.

```
Test Health Score
────────────────────
Reliability          82
Maintainability      74
Selector Quality     68
Assertions           91
Network Stability    77
Coverage Gaps        70
Test Architecture    84

Overall              79/100   (▼ 3 vs main)
```

Lo importante es la **tendencia y el delta por PR**, no el número absoluto.

### 21.3 Baseline ("clean as you code")

- `atium baseline` guarda los fingerprints de los Findings actuales en `.atium/baseline.json` (versionado en el repo).
- El gate evalúa solo Findings **nuevos**.
- Los Findings del baseline que desaparecen se eliminan del archivo en la siguiente actualización, para que no vuelvan a entrar sin aviso.

### 21.4 Ownership

Con `CODEOWNERS`, cada Finding se asigna al equipo dueño del archivo del test.

### 21.5 Reportes

| Reporter | Uso |
|---|---|
| Consola | Desarrollo local |
| JSON | Integraciones; esquema publicado y versionado |
| HTML | Un solo archivo estático; datos embebidos comprimidos y tablas virtualizadas para suites grandes |
| SARIF 2.1.0 | Anotaciones en PRs de GitHub |
| JUnit | Compatibilidad con CI existente |
| PR comment | Un solo comentario por PR, identificado con un marcador HTML y actualizado en cada push |

#### Modelo del reporte

Todos los reporters reciben el mismo reporte ([ADR-0027](../adr/0027-modelo-reporte-json.md)). Su esquema Zod es `ReportSchema` (`packages/core/src/model/report.ts`) y su JSON Schema se publica en `packages/core/schemas/report.v1.json`. Es API pública y versionada (07-public-api.md).

```ts
interface Report {
  schemaVersion: 1;
  toolVersion: string;                 // versión de Atium que generó el reporte
  findings: ReportFinding[];
  summary: {
    overall: Count;
    bySeverity: { error: Count; warning: Count; info: Count };
    byRule: { ruleId: string; total: number; new: number }[];
  };
  rules: RuleDescriptor[];
  skippedAnalyzers: SkippedAnalyzerEntry[];
}

type ReportFinding = Finding & { baselineState: "new" | "unchanged" }; // §22.3 + estado
interface Count { total: number; new: number }                       // enteros ≥ 0
interface RuleDescriptor {
  id: string;                          // código, como Finding.ruleId: "E2E001"
  name: string;                        // nombre legible, obligatorio para toda regla
  shortDescription: string;            // título de §11.2 ("Hard wait detected"); shortDescription de SARIF
  docsUrl?: string;                    // http o https
}
type SkippedAnalyzerEntry =
  | { analyzer: string; reason: "missing-capabilities"; missing: Capability[] }
  | { analyzer: string; reason: "duplicate-id" | "invalid-config" | "timeout" | "failed" | "aborted" };
```

- Todos los objetos rechazan campos desconocidos; un opcional ausente se omite. Los textos no pueden estar vacíos.
- `baselineState` usa los valores de `result.baselineState` de SARIF: `"new"` si el fingerprint no está en el baseline (§21.3), `"unchanged"` si está. Sin baseline, todos los Findings son `"new"`.
- El reporte no lleva fecha: la misma entrada produce los mismos bytes (02-code-design.md, "Salida determinista").
- Un analizador omitido lleva solo el tipo de motivo (`SkipReason.kind`, §22.2) y, con `missing-capabilities`, las capacidades que faltan. El texto del error no entra; `runAnalyzers` lo registra en stderr.
- `createReport` (`packages/core/src/report/create-report.ts`) es la única función que construye reportes. Recibe la versión, los Findings ya clasificados con `baselineState`, los descriptores y los omitidos de `runAnalyzers`, y garantiza lo que el esquema no comprueba:
  - `findings` en el orden de `compareFindings` (§22.3);
  - `summary.overall` y `bySeverity` cuentan todos los Findings (`total`) y los `"new"` (`new`); `bySeverity` tiene siempre las tres severidades, con cero si no hay Findings;
  - `byRule` tiene una entrada por cada `ruleId` con Findings, ordenadas por `ruleId`;
  - `rules` ordenadas por `id`; un `id` repetido es un error de programación y lanza;
  - `skippedAnalyzers` ordenados por `analyzer` y después por `reason`, y `missing` en el orden de `CAPABILITIES`;
  - los textos se comparan por unidades de código UTF-16, sin locale, como en `compareFindings`.
- `rules` puede describir reglas sin Findings (por ejemplo, todas las activas, para `tool.driver.rules` de SARIF); `createReport` no exige un descriptor por cada `ruleId`.
- El JSON Schema no puede expresar la restricción de `docsUrl` a `http` o `https` (solo `format: "uri"`) ni las garantías de orden y resumen.
