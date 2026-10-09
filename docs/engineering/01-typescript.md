# TypeScript

## Configuración del compilador

`tsconfig.base.json` en la raíz; cada paquete lo extiende.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

Por qué las opciones menos comunes:

| Opción | Evita |
|---|---|
| `noUncheckedIndexedAccess` | Suponer que `array[i]` o `record[key]` siempre existe |
| `exactOptionalPropertyTypes` | Confundir "propiedad ausente" con "propiedad con valor `undefined`", importante en el modelo serializado |
| `noPropertyAccessFromIndexSignature` | Acceder con `.` a claves dinámicas como si fueran conocidas |
| `verbatimModuleSyntax` | Imports de tipos que terminan en el JavaScript emitido |

## Tipos

**`any` está prohibido.** Usa `unknown` y estrecha el tipo. Única excepción: tipos de terceros incorrectos, con comentario explicando el motivo.

```ts
// ✗
function parse(input: any) { return input.results; }

// ✓
function parse(input: unknown): Run {
  return RunSchema.parse(input);
}
```

**Sin non-null assertion (`!`).** Estrecha el tipo o lanza un error con contexto.

```ts
// ✗
const first = attempts[0]!;

// ✓
const first = attempts[0];
if (first === undefined) {
  throw new AtiumError("MODEL_INVALID", `Test ${testId} has no attempts`);
}
```

**Aserciones `as` solo en casos justificados:** `as const`, tests, y el interior de un helper validado. Prefiere `satisfies` para comprobar que un valor cumple un tipo sin perder información.

```ts
export const SEVERITY_WEIGHTS = {
  info: 0.25,
  warning: 1,
  error: 3,
} as const satisfies Record<Severity, number>;
```

**Los tipos del modelo se derivan de Zod.** Nunca se escribe a mano un tipo que ya tiene esquema.

```ts
export const AttemptSchema = z.object({ /* ... */ });
export type Attempt = z.infer<typeof AttemptSchema>;
```

**Identificadores con tipo propio (branded types).** Evitan pasar un `RunId` donde se espera un `TestId`.

```ts
export const TestIdSchema = z.string().regex(/^[0-9a-f]{16}$/).brand<"TestId">();
export type TestId = z.infer<typeof TestIdSchema>;

export const FingerprintSchema = z.string().regex(/^[0-9a-f]{16}$/).brand<"Fingerprint">();
export type Fingerprint = z.infer<typeof FingerprintSchema>;
```

**Uniones discriminadas en lugar de banderas combinadas**, con `switch` exhaustivo:

```ts
type FlakyState =
  | { kind: "stable" }
  | { kind: "suspected"; strongEvents: number }
  | { kind: "flaky"; strongEvents: number; failureRate: Interval }
  | { kind: "broken"; consecutiveFailingRuns: number };

function label(state: FlakyState): string {
  switch (state.kind) {
    case "stable": return "Stable";
    case "suspected": return "Suspected";
    case "flaky": return "Flaky";
    case "broken": return "Broken";
    default: return assertNever(state);
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
```

**Sin `enum` de TypeScript.** Usa uniones de literales y objetos `as const`.

```ts
export const TRIAGE_CATEGORIES = ["regression", "flaky", "infra", "test-maintenance", "environment", "unknown"] as const;
export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];
```

**`readonly` por defecto** en datos del modelo, parámetros y valores de retorno compartidos: `readonly T[]`, `Readonly<T>`, `ReadonlyMap`.

**Tipos de retorno explícitos** en toda función exportada.

**Sin `namespace`.** Sin clases salvo cuando hay estado o identidad real (errores, backends de storage con conexión, reporters que exige un framework). El resto, funciones y objetos.

## Nulos, fechas y unidades

| Tema | Regla |
|---|---|
| Ausencia | `undefined`. `null` solo en el borde con formatos externos (JSON de terceros, SQLite) y se convierte al entrar |
| Fechas en el modelo | Strings ISO 8601 en UTC (`2026-10-08T14:03:00.000Z`) |
| Fechas internas | `Date` o epoch en ms; nunca hora local |
| Reloj | Siempre inyectado (`ctx.clock.now()`), nunca `Date.now()` directo en lógica de análisis |
| Duraciones | Enteros en milisegundos, con sufijo `Ms` en el nombre (`durationMs`, `timeoutMs`) |
| Tamaños | Bytes, con sufijo `Bytes` |
| Porcentajes | Proporciones entre 0 y 1 en el código; se formatean como porcentaje solo en reporters |

## Imports y exports

- Solo exports con nombre. `export default` únicamente donde un framework lo exige (configs de Playwright, ESLint, Vite).
- `import type` para tipos (lo exige `verbatimModuleSyntax`).
- Dentro de un paquete: imports relativos con extensión `.js` (requisito de `NodeNext`).
- Entre paquetes: por nombre de paquete (`@atium/core`), nunca rutas a `src/` de otro paquete.
- Cada paquete expone su API pública solo desde `src/index.ts` y el campo `exports` de `package.json`.
