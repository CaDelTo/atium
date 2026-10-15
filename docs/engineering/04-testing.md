# Testing

Complementa la estrategia por niveles del diseño ([21-testing-strategy.md](../design/21-testing-strategy.md)).

## Organización

| Tipo | Ubicación | Herramienta |
|---|---|---|
| Unitarios | Junto al código: `src/foo.ts` → `src/foo.test.ts` | Vitest |
| Reglas de ESLint | `src/rules/<regla>.test.ts` | `RuleTester` |
| Integración | `packages/<paquete>/test/` | Vitest |
| Contrato | `packages/core/test-contracts/` (reutilizados por cada implementación) | Vitest |
| End-to-end | `examples/*` con `expected-findings.json`: `examples/*/verify/` comprueba su formato, y el test de integración de `atium lint` (v1-38), que se cumple | Vitest |
| Benchmarks | `packages/<paquete>/bench/` | Vitest bench |

## Cómo se escribe un test

- **El nombre describe el comportamiento**, no la implementación:

```ts
// ✗
it("works", ...);
it("calls computeState", ...);

// ✓
it("marks a test as broken after 3 consecutive runs with all attempts failing", ...);
it("does not report cy.wait with an alias as a hard wait", ...);
```

- **Arrange, Act, Assert**, separados visualmente.
- **Un comportamiento por test.**
- **Sin lógica en los tests** (`if`, bucles). Para varios casos se usa `it.each` con una tabla.
- **Un bug corregido empieza con un test que lo reproduce** y falla antes del arreglo.
- **Nunca se debilita un test para que pase.** Si el test está mal, se explica en el PR. En Claude Code lo hace cumplir el hook `test-guard` ([12-ai-workflow.md](12-ai-workflow.md#hooks)).

## TDD

Cuando una tarea lo permite, se implementa guiada por tests: los tests de especificación se escriben primero, a partir de los criterios de aceptación y del diseño, y la implementación se escribe después para que pasen. Así el código cumple los requisitos, en lugar de que los tests describan lo que el código ya hace. Los pasos están en el [pipeline de entrega](12-ai-workflow.md#pipeline-de-entrega).

**Con TDD:** funciones puras, fórmulas, esquemas Zod, normalizadores, reglas de lint (`RuleTester` con casos válidos e inválidos del diseño), analizadores, reporters, y el contrato de storage y adapters con fakes.

**Sin TDD:** CI, documentación, configuración de herramientas, scaffolding de paquetes, y lo que solo se puede comprobar de punta a punta. El plan lo justifica y los tests se escriben junto al código.

Reglas:

- **Un test por criterio, como mínimo,** con el criterio en el nombre: `it("AC-3: …")`, donde `AC-3` es el tercer criterio de aceptación del issue. Así cada requisito se puede trazar hasta su test.
- **Los escribe un agente distinto del que implementa** (`spec-tester`), sin ver la implementación. Los valores esperados salen del diseño, nunca de ejecutar el código.
- **Rojo verificado:** antes de implementar, cada test `AC-n` falla por una assertion o por el `not implemented` de un stub, nunca por un error del propio test. Un test que ya pasa sin implementación no especifica nada.
- **Los tests de especificación no se tocan durante la implementación.** Si uno parece incorrecto, lo decide `spec-tester` con el diseño en la mano, o una persona.
- **Endurecimiento:** con los tests en verde, `test-writer` busca los casos que la especificación no cubre.

## Determinismo

Un test que falla a veces es un bug, sobre todo en una herramienta que detecta tests flaky.

- Reloj inyectado o fake timers de Vitest; nunca la hora real.
- Aleatoriedad con semilla fija.
- Sin red real en unitarios ni integración.
- Directorios temporales con `fs.mkdtemp`, limpiados al terminar.
- Los tests deben pasar en paralelo y en orden aleatorio (`--sequence.shuffle` en CI).
- Un job nocturno ejecuta la suite completa varias veces; un test inestable se arregla antes de cualquier otra tarea.

## Datos de prueba

**Builders en lugar de JSON gigantes copiados:**

```ts
const run = aRun()
  .onCommit("abc123")
  .withResult(aTestResult("checkout").failedThenPassed())
  .build();
```

- Los builders viven en `packages/core/src/testing/` y se exportan desde `@atium/core/testing`.
- Los valores por defecto de un builder son válidos según el esquema Zod.
- Los builders son inmutables: cada método devuelve un builder nuevo. `build()` valida con el esquema Zod y devuelve el objeto congelado.
- Los valores por defecto son deterministas: fecha fija, id del run derivado de una semilla (`withSeed`) e ids de test y fingerprints derivados del contenido. Nunca hay contadores ni estado global.

**Fixtures reales:**

- Salidas reales de Playwright y Cypress en `fixtures/<framework>/<versión>/`.
- Solo se generan con `pnpm fixtures:generate`, que registra la versión usada. No se editan a mano.

## Mocks, fakes y stubs

- Se aíslan solo los **bordes**: sistema de archivos, red, Git, procesos, reloj.
- No se mockean módulos internos del proyecto.
- **No se mockea lo que no es tuyo:** las librerías de terceros se envuelven en una interfaz propia y se reemplaza esa interfaz.
- Se prefieren **fakes** (implementaciones simples en memoria) sobre mocks con expectativas de llamadas. Ejemplo: `InMemoryStorage` (`@atium/core/testing`) implementa `Storage`, que reúne `StorageReader`, `StorageWriter` y `close`.

## Tests de contrato

Cuando hay varias implementaciones de una interfaz, todas pasan la misma suite:

```ts
// packages/core/test-contracts/storage.contract.ts
export function storageContract(create: () => Promise<Storage>): void {
  describe("storage contract", () => {
    it("keeps every run written by concurrent writers", async () => { /* ... */ });
    it("accepts exactly one of several concurrent writes of the same id", async () => { /* ... */ });
  });
}

// packages/storage/sqlite/src/sqlite-storage.test.ts
import { storageContract } from "@atium/core/test-contracts";

storageContract(async () => openIn(await newRepository())); // openIn: openSqliteStorage + unwrap
```

Los demás paquetes importan las suites por nombre de paquete, desde `@atium/core/test-contracts`; los tests de core las importan con rutas relativas.

Aplica a: backends de storage, adapters (todos producen un modelo válido desde sus fixtures) y reporters.

## Property-based testing

Para normalizadores, fingerprints y fórmulas, con fast-check. Se prueban propiedades que deben cumplirse para cualquier entrada:

```ts
it("Wilson interval contains the observed rate and stays within [0, 1]", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10_000 }), fc.double({ min: 0, max: 1 }), (n, ratio) => {
      const failures = Math.round(n * ratio);
      const { lower, upper } = wilsonInterval(failures, n);
      const observed = failures / n;
      expect(lower).toBeGreaterThanOrEqual(0);
      expect(upper).toBeLessThanOrEqual(1);
      expect(lower).toBeLessThanOrEqual(observed);
      expect(upper).toBeGreaterThanOrEqual(observed);
    }),
  );
});
```

Otras propiedades útiles: la normalización de mensajes es idempotente; dos mensajes que difieren solo en UUIDs producen el mismo fingerprint; el score siempre está entre 0 y 100.

## Snapshots

- Solo para salidas de reporters (golden files), revisados en el PR.
- No se hacen snapshots de objetos internos grandes: ocultan qué se está verificando.

## Cobertura y mutation testing

| Paquete | Cobertura mínima (líneas y ramas) |
|---|---|
| `core` | 90% |
| `analyzers/*`, `eslint-plugin` | 85% |
| Resto | 80% |

- La cobertura es un piso, no un objetivo: un test que ejecuta código sin verificar nada no cuenta.
- **Stryker** corre de forma nocturna sobre `core` y `analyzers/*`. Objetivo: mutation score ≥ 70% en `core`. Es dogfooding: es la misma herramienta que el proyecto integra.

## Fail-open

Cada borde fail-open tiene tests que inyectan un error y verifican que:

- El resultado del test del usuario no cambia.
- Se registra un aviso.
- La ejecución continúa.
