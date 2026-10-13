# Diseño de código

## Capas y dependencias permitidas

| Paquete | Puede depender de | No puede depender de |
|---|---|---|
| `core` | Solo librerías externas | Ningún otro paquete interno |
| `suite-index` | `core`, `@atium/eslint-plugin/syntax` | Adapters, analizadores, el resto de `eslint-plugin`, CLI |
| `eslint-plugin` | `@atium/core/pure` (módulos sin I/O) | La raíz de `@atium/core`, storage, adapters, CLI |
| `adapters/*` | `core` | Analizadores, otros adapters, CLI |
| `storage/*` | `core` | Analizadores, adapters, CLI |
| `analyzers/*` | `core`, `suite-index`, `@atium/eslint-plugin/syntax` | Otros analizadores, adapters, storage concreto, el resto de `eslint-plugin`, CLI |
| `reporters/*` | `core` | Analizadores, adapters, storage |
| `bdd` | `core` | Analizadores, CLI |
| `cli` | Todos | — |
| `github-action` | `cli`, `core` | — |

Sin dependencias circulares. Lo verifica dependency-cruiser en `pnpm verify` ([10-tooling.md](10-tooling.md)).

Si un analizador necesita algo de otro, ese algo pertenece a `core` (por ejemplo, el fingerprinting lo usan triage y flaky, por eso vive en `core`).

Entradas compartidas del linter ([ADR-0023](../adr/0023-arquitectura-linter.md)):

- `@atium/core/pure` reexporta solo módulos de `core` sin I/O (`model/`, `findings/`, `redact/`, `identity`, `paths`, `errors`, `result`, `assert-never`). dependency-cruiser comprueba que su grafo no llega a módulos con I/O.
- `@atium/eslint-plugin/syntax` contiene la lógica E2E que comparten las reglas, `suite-index` y `analyzers/lint-crossfile`: framework, estructura de tests, `titlePath`, acciones, assertions, locators y selectores. Son funciones puras sobre el AST de typescript-eslint; `src/syntax/` no importa las reglas ni ESLint en runtime.
- Las reglas de `.dependency-cruiser.cjs` para cada paquete de la tabla se añaden en la tarea que crea ese paquete.

## Núcleo funcional, borde imperativo

- **Analizadores = funciones puras:** reciben datos y devuelven `Finding[]`. No leen archivos, no hacen requests, no consultan Git directamente; todo llega por el `AnalysisContext`.
- **I/O solo en los bordes:** storage, adapters, `suite-index` (lectura de archivos) y CLI. En `core`, solo la búsqueda y la carga del archivo de configuración (`core/src/config/config-file.ts`, [ADR-0017](../adr/0017-carga-config-jiti.md)) y la detección del contexto de Git y CI, que los reporters necesitan y no pueden pedir al CLI: `core/src/ci/git-client.ts` ejecuta Git, `core/src/ci/github-event.ts` lee el payload del evento de GitHub y `core/src/ci/env-ci-fallback.ts` usa env-ci ([02-data-model.md §10.1](../design/02-data-model.md#101-detección-detectruncontext)). También la escritura y la lectura de los archivos de run, que hacen los reporters y todos los backends de storage: `core/src/storage/run-file-writer.ts` y `core/src/storage/run-file-reader.ts` ([15-storage.md §23.2.1](../design/15-storage.md#2321-archivos-de-run-locales)). La precedencia, la validación, las reglas por proveedor, los topes y la división en líneas son puros.
- **Determinismo:** reloj, generador aleatorio y entorno se inyectan. La misma entrada produce la misma salida.

```ts
// ✗ Lógica mezclada con I/O y reloj global
export async function detectBroken(testId: TestId): Promise<boolean> {
  const runs = await sqlite.query(/* ... */);
  return runs.filter((r) => Date.now() - r.time < WINDOW).every((r) => r.failed);
}

// ✓ Función pura; el I/O ocurre antes, en el orquestador
export function isBroken(results: readonly RunOutcome[], policy: BrokenPolicy): boolean {
  const recent = results.slice(-policy.consecutiveRuns);
  return recent.length === policy.consecutiveRuns && recent.every((r) => r.allAttemptsFailed);
}
```

## Sin estado global

- Nada de singletons ni variables mutables a nivel de módulo.
- Las dependencias se pasan por parámetro o por el contexto.
- Constantes inmutables a nivel de módulo están permitidas.

## SOLID aplicado al proyecto

| Principio | Cómo se aplica aquí |
|---|---|
| Responsabilidad única | Un paquete por analizador; un archivo por regla de lint; separar cálculo, formato y salida |
| Abierto/cerrado | Reglas, analizadores, reporters y backends se agregan vía plugins sin tocar el orquestador |
| Sustitución de Liskov | Todos los backends de storage pasan la misma suite de tests de contrato; lo mismo para adapters |
| Segregación de interfaces | `StorageReader` y `StorageWriter` separados; un analizador recibe solo lo que declara en `requires` |
| Inversión de dependencias | `core` define interfaces (`StorageReader`, `Logger`, `Clock`); las implementaciones viven en otros paquetes, salvo las que necesitan todos y solo pueden venir de `core`: `createStderrLogger` (los reporters no pueden depender del CLI) y `systemClock` ([ADR-0022](../adr/0022-logger-reloj-en-core.md)) |

## Funciones

- Hacen una cosa, a un solo nivel de abstracción.
- Máximo 3 parámetros posicionales; más, un objeto de opciones con nombre.
- Retornos tempranos en lugar de anidación profunda.
- Complejidad ciclomática ≤ 10, ≤ 60 líneas por función, ≤ 400 líneas por archivo (avisos de ESLint; superarlos requiere justificación en el PR).
- No mutan sus parámetros. Mutación local dentro de una función está permitida si mejora claramente el rendimiento y no escapa de ella.
- Composición antes que herencia.

## Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos y carpetas | kebab-case | `wilson-interval.ts` |
| Tipos e interfaces | PascalCase, sin prefijo `I` | `TestResult`, `StorageReader` |
| Funciones | camelCase, empiezan con verbo | `computeFlipRate`, `normalizeMessage` |
| Booleanos | `is`, `has`, `should`, `can` | `isQuarantined`, `hasTrace` |
| Constantes verdaderas | UPPER_SNAKE_CASE | `DEFAULT_WINDOW_DAYS` |
| Unidades | Sufijo en el nombre | `timeoutMs`, `maxSizeBytes` |
| IDs de reglas | Constantes exportadas | `RULE_HARD_WAIT = "E2E001"` |
| Nombres de reglas en ESLint | kebab-case descriptivo, catálogo en [03-linter.md §11.8](../design/03-linter.md#118-catálogo-de-reglas) | `atium/no-hard-wait` |
| Tests | Mismo nombre que el archivo + `.test.ts` | `wilson-interval.test.ts` |

Sin abreviaturas salvo las universales en este dominio: `id`, `url`, `ci`, `pr`, `dom`, `api`, `har`.

## Valores por defecto y números mágicos

- Cada analizador tiene un `defaults.ts` con todos sus umbrales y pesos.
- Cada valor lleva un comentario con la sección del diseño de donde sale.
- El `configSchema` del analizador usa esos defaults; no se repiten en otro lugar.

```ts
// packages/analyzers/flaky/src/defaults.ts
export const FLAKY_DEFAULTS = {
  windowDays: 30,           // Design §15.2
  brokenConsecutiveRuns: 3, // Design §15.2
  minStrongEvents: 2,       // Design §15.2
  wilsonZ: 1.96,            // Design §15.3
} as const;
```

## Comentarios

- Explican **por qué**, no qué. Si el código necesita un comentario para entender qué hace, primero se mejora el código.
- Las fórmulas y decisiones no obvias citan el diseño: `// Design §15.3: Wilson lower bound`.
- `TODO` solo con issue asociado: `// TODO(#123): support WebSockets`.
- Sin código comentado; Git guarda la historia.

## Simplicidad

- **YAGNI:** no se escribe código para fases futuras salvo las interfaces ya definidas en el diseño.
- **Regla de tres:** se abstrae al tercer caso repetido, no antes.
- **DRY con criterio:** se elimina duplicación de conocimiento (una regla de negocio en dos lugares); la duplicación accidental de código parecido es aceptable si las razones de cambio son distintas.

## Salida determinista

- Todo lo que se escribe (reportes, JSON, SARIF, fingerprints) se ordena explícitamente con un criterio y un desempate.
- No se depende del orden de iteración de objetos, `Map` o resultados de la base de datos sin `ORDER BY`.
- Las salidas para máquinas (JSON, SARIF, JUnit) no dependen del locale: números con punto decimal, fechas ISO 8601 en UTC. El formato localizado solo se usa en salidas para personas.
