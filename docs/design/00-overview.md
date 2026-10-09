# Visión general

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 1. Resumen

Atium es una plataforma open source que ayuda a los equipos de QA a **escribir mejores pruebas** y a **mantener sanas sus suites**, independientemente del framework con el que se ejecuten.

No compite con Playwright, Cypress o Cucumber. Se coloca encima de ellos y acompaña al QA en tres momentos:

| Momento | Pregunta que responde |
|---|---|
| Al escribir | ¿Este test está bien diseñado? ¿Este selector es robusto? |
| Al ejecutar | ¿Por qué falló? ¿Es una regresión, un problema del test o infraestructura? |
| Al mantener | ¿Qué tests son flaky? ¿Qué no estoy probando? ¿Qué debería correr primero? |

```
                 ┌──────────────────────────────┐
                 │            ATIUM             │
                 │    Test Quality Platform     │
                 └──────────────┬───────────────┘
                                │
                      Normalized Test Model
                                │
       ┌────────────────┬───────┴────────┬────────────────┐
       ▼                ▼                ▼                ▼
   Playwright        Cypress         JUnit XML          CTRF
    Adapter          Adapter          Ingest           Ingest
       └────────────────┴───────┬────────┴────────────────┘
                                │   + capa BDD (Cucumber)
                                ▼
                 ┌──────────────────────────────┐
                 │          Analyzers           │
                 ├──────────────────────────────┤
                 │ Al escribir                  │
                 │   Linter · Selector Advisor  │
                 │ Al ejecutar                  │
                 │   Failure Triage · Red/Chaos │
                 │ Al mantener                  │
                 │   Flaky · Test Gaps ·        │
                 │   Priorización · Higiene BDD │
                 └──────────────┬───────────────┘
                                ▼
              Findings → Baseline → Score → Reportes / Gate
```

---

## 2. Principios de diseño

1. **Útil en cada fase.** Cada módulo aporta valor por sí solo. Un QA puede usar solo el linter, o solo flaky detection.
2. **Integrar antes que construir.** Donde exista una herramienta madura (ESLint, Stryker, CTRF, HAR, SARIF), Atium se apoya en ella y aporta el cruce de información que nadie más hace.
3. **Sugerir, no imponer.** Atium nunca modifica tests automáticamente en CI. Propone cambios con evidencia; el QA decide.
4. **Explicable.** Todo hallazgo, puntaje o clasificación se rastrea a datos concretos y declara su nivel de confianza.
5. **Fail-open.** Un error interno de Atium nunca cambia el resultado de un test ni rompe la ejecución de la suite.
6. **Adopción incremental.** Un proyecto legacy puede empezar a usarlo sin que el CI se ponga rojo el primer día (baseline).
7. **Determinista.** La misma entrada produce los mismos Findings y el mismo score. Lo no determinista (LLM) se marca y nunca afecta el score ni el gate.
8. **Local-first y privado.** Sin telemetría, datos sensibles redactados por defecto, LLM solo opt-in.
9. **Agnóstico donde importa.** Ejecución, historial y análisis son comunes a todos los frameworks; las reglas estáticas son específicas por framework.

---

## 3. Problemas que resuelve

### 3.1 Tests frágiles

```ts
page.locator("#app > div:nth-child(2) > div > button")
```

Un pequeño cambio del frontend rompe el test.

### 3.2 Tests mal diseñados

```ts
await page.waitForTimeout(5000);
```

```ts
test("everything", async () => {
  // 700 líneas
});
```

El framework lo permite, pero no avisa que probablemente está mal diseñado.

### 3.3 Flaky tests

```
Run 1 → PASS   Run 2 → PASS   Run 3 → FAIL
Run 4 → PASS   Run 5 → PASS   Run 6 → FAIL
```

Los frameworks reintentan dentro de **una** ejecución, pero no muestran el patrón **entre ejecuciones** ni explican por qué ocurre.

### 3.4 Triage manual de fallos

Una suite falla con 40 errores. El QA revisa uno por uno para descubrir que 35 vienen de la misma API caída, 4 de un selector roto y solo 1 es una regresión real.

### 3.5 No saber qué no se está probando

El code coverage dice 94%, pero nadie sabe qué endpoints, rutas o respuestas de error nunca se ejercitan en una prueba.

### 3.6 Suites enormes

8,000 tests, de los cuales un cambio afecta 127. Ejecutar todo en cada commit es lento y costoso.

---

## 4. Objetivo

```
Test Health Score        82/100   (▼ 3 vs main)

Tests analyzed:          2,431
Flaky tests:                37   (+2 nuevos)
Broken tests:                4
Fragile selectors:          84
Hard waits:                 21
Untested endpoints:         19
Failure groups (last run):   3   (1 probable regresión)
CI time lost to retries:    14 min/día
```

---

## 5. Posicionamiento

| Área | Herramientas existentes | Decisión en Atium |
|---|---|---|
| Lint de tests | `eslint-plugin-playwright`, `eslint-plugin-cypress` | Plugin de ESLint que incluye esas reglas en sus presets y agrega reglas propias y cross-file |
| Flaky | Trunk, BuildPulse (comerciales) | Módulo propio, open source, agnóstico |
| Test impact | Launchable (comercial) | Priorización por riesgo primero; impacto por coverage después |
| Self-healing | Healenium, testRigor | Se reemplaza por Selector Advisor (prevención + sugerencia) |
| Mutation | Stryker | Integración opcional, no motor propio |
| BDD sobre Playwright | playwright-bdd | Se soporta como fuente de la capa BDD |
| Formatos | CTRF, JUnit XML, HAR, SARIF, Cucumber Messages | Se adoptan como estándar de entrada y salida |

El diferenciador: **un solo modelo de datos que cruza lint, ejecución, red, historial y Git**, algo que las herramientas aisladas no pueden hacer.

---

## 6. Módulos

| # | Módulo | Momento | Tipo | Datos que necesita |
|---|---|---|---|---|
| 1 | Linter | Escribir | Estático | Código fuente |
| 2 | Selector Advisor | Escribir / Mantener | Estático + runtime | Código, traces, historial |
| 3 | Failure Triage | Ejecutar | Runtime | Errores, red, historial |
| 4 | Flaky Detection | Mantener | Historial | Intentos por commit y entorno |
| 5 | Red (análisis + chaos) | Ejecutar | Runtime | Resumen de red por intento |
| 6 | Test Gap Analysis | Mantener | Runtime + specs | Red, OpenAPI, rutas |
| 7 | Priorización e impacto | Ejecutar (CI) | Historial + Git | Historial, diff, mapas |
| 8 | Higiene BDD | Escribir / Mantener | Estático + runtime | Gherkin, step definitions |
| 9 | Score, baseline y reportes | Transversal | — | Findings de todos |

Todos los módulos producen el mismo tipo de salida: **Findings** ([sección 22.3](14-architecture.md)).
