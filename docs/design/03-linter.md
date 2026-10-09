# Linter

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 11. Linter

Implementado como **plugin de ESLint** (`@atium/eslint-plugin`) para reglas por archivo, más un **motor cross-file** en el CLI para reglas que necesitan ver toda la suite.

```
Archivo  → ESLint + typescript-eslint → reglas por archivo ─┐
Suite    → índice de la suite (CLI)   → reglas cross-file  ─┴→ Findings
```

### 11.1 Presets y configuración

- `atium/recommended`: reglas propias de baja tasa de falsos positivos + reglas relevantes de `eslint-plugin-playwright` / `eslint-plugin-cypress`. Para no reportar dos veces, el preset desactiva la regla propia cuando el plugin externo ya cubre el mismo caso (tabla de equivalencias en la documentación).
- `atium/strict`: todas las reglas.
- Cero configuración: instalar y extender el preset en `eslint.config.js`.

Opciones comunes a varias reglas:

```ts
settings: {
  atium: {
    framework: "playwright",            // o "cypress"; autodetectado por imports
    pageObjectDirs: ["tests/pages/**"], // código donde se permiten selectores
    assertFunctionNames: ["expectToast", "verify*"],  // helpers que cuentan como assertion
    i18n: true,                         // penaliza selectores por texto visible
  },
}
```

### 11.2 Formato de un hallazgo

Cada regla incluye explicación, ejemplo antes/después, autofix o sugerencia cuando es seguro, y página de documentación.

```
E2E001 Hard wait detected                         login.spec.ts:42

  await page.waitForTimeout(5000)

Fixed waits slow down the suite and cause flakiness
when the app is slower than expected.

Suggestion:
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible()

Docs: https://atium.dev/rules/e2e001
```

El autofix solo se ofrece cuando la transformación es segura. Para E2E001 no hay autofix automático (no se puede saber qué esperar); se ofrece una sugerencia editable.

### 11.3 Reglas por archivo: detección exacta

| Código | Regla | Detecta | No detecta (evita falsos positivos) | Umbral por defecto |
|---|---|---|---|---|
| E2E001 | Hard waits | `page.waitForTimeout(n)`, `frame.waitForTimeout(n)`, `cy.wait(<número>)`, `await new Promise(r => setTimeout(r, n))` dentro de tests | `cy.wait("@alias")` (espera una request, es correcto) | — |
| E2E002 | Selector CSS frágil | Strings en `locator()`, `$()`, `cy.get()` parseados con un parser CSS: `:nth-child`, `:nth-of-type`, ≥ 3 combinadores, clases generadas (`css-1a2b3c`, `sc-*`, `jsx-*`), ids con secuencias numéricas | Selectores dentro de `pageObjectDirs` se reportan una sola vez, no por uso | Profundidad 3 |
| E2E003 | XPath posicional | Predicados posicionales `[n]`, rutas absolutas `/html/...` | XPath por atributo (`//button[@data-testid='x']`) | — |
| E2E004 | Uso de `.nth()` | `.nth(n)` con n > 0, `.first()` / `.last()` encadenados a locators no únicos | `.nth()` sobre `getByRole` con nombre | Configurable |
| E2E005 | Test demasiado grande | Acciones (`click`, `fill`, `goto`, `press`, `check`, `selectOption`, comandos `cy.*`) o líneas por test | — | 25 acciones o 150 líneas |
| E2E006 | Assertions insuficientes | Tests con acciones y cero assertions. Cuenta: `expect(...)`, `.should()` / `.and()`, funciones en `assertFunctionNames` y helpers del mismo archivo que contengan assertions (un nivel) | Helpers de otros archivos se resuelven en el motor cross-file | 1 assertion |
| E2E009 | Assertions no web-first | `expect(await x.isVisible()).toBe(true)`, `expect(await x.textContent())...`, `expect(await locator.count())...` | — | — |
| E2E010 | `.only` olvidado | `test.only`, `describe.only`, `it.only` | — | — |
| E2E012 | Secretos en tests | Literales asignados a identificadores tipo `password`, `token`, `secret`, `apiKey` con entropía alta; patrones conocidos (JWT, claves de nube) | Valores obviamente ficticios (`"password123"`, `"test"`) | Entropía ≥ 3.5 bits/char |

### 11.4 Reglas cross-file

ESLint analiza archivo por archivo. El CLI construye un **índice de la suite** (tests, locators normalizados, helpers, fixtures, imports) usando el parser de typescript-eslint con el project service de TypeScript para resolver referencias entre archivos.

| Código | Regla | Detección | Umbral por defecto |
|---|---|---|---|
| E2E006b | Assertions insuficientes (resolución completa) | Igual que E2E006, resolviendo helpers importados hasta 2 niveles | — |
| E2E007 | Selector repetido | Mismo selector normalizado en ≥ N archivos fuera de `pageObjectDirs` | 3 archivos |
| E2E008 | Dependencia entre tests | `describe.serial` / `mode: "serial"`; variables de módulo asignadas en un test y leídas en otro; archivos escritos por un test y leídos por otro | — |
| E2E011 | Código de test sin usar | Fixtures, helpers o miembros de Page Objects exportados sin referencias | — |
| E2E013 | Tests casi duplicados | Secuencia de acciones normalizada (acción + tipo de selector) comparada con shingles de 3 y similitud de Jaccard | ≥ 0.9 |

**Caché:** resultados por archivo indexados por hash de contenido + hash de configuración de reglas, en `.atium/cache/`. Las reglas cross-file se recalculan solo para archivos afectados por un cambio en el índice.

### 11.5 Fingerprint de un hallazgo de lint

Para que el baseline sobreviva a cambios de líneas, el fingerprint no usa el número de línea:

```
sha1(ruleId | file | titlePath del test que lo contiene | código del nodo normalizado | índice de ocurrencia)
```

El índice de ocurrencia distingue dos hallazgos idénticos dentro del mismo test.

### 11.6 Salidas

Consola, JSON, **SARIF 2.1.0** (anotaciones inline en PRs de GitHub) y Findings para el resto de la plataforma.

### 11.7 Calidad de las reglas

- Cada reporte de falso positivo se registra con una etiqueta en el repositorio.
- Una regla con más de 10% de falsos positivos reportados sale de `recommended` hasta corregirse.
