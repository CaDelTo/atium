# Linter

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 11. Linter

Implementado como **plugin de ESLint** (`@atium/eslint-plugin`) para reglas por archivo, más un **motor cross-file** en el CLI para reglas que necesitan ver toda la suite.

```
Archivo  → ESLint + typescript-eslint → reglas por archivo ─┐
Suite    → índice de la suite (CLI)   → reglas cross-file  ─┴→ Findings
```

### 11.1 Presets y configuración

- `atium/recommended`: reglas propias de baja tasa de falsos positivos + reglas relevantes de `eslint-plugin-playwright` / `eslint-plugin-cypress`. Para no reportar dos veces, el preset desactiva la regla propia cuando el plugin externo ya cubre el mismo caso (tabla de equivalencias en `docs/rules/presets.md`, §11.9).
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

Docs: https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e001.md
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

Las partes se combinan con `fingerprintOf` (sección 22.3): se codifican con `JSON.stringify`, no se unen con un `|` literal, y el índice de ocurrencia se pasa como texto (`String(n)`). El `titlePath` se une con `" › "`, como en el `testId` (sección 9.3).

### 11.6 Salidas

Consola, JSON, **SARIF 2.1.0** (anotaciones inline en PRs de GitHub) y Findings para el resto de la plataforma.

### 11.7 Calidad de las reglas

- Cada reporte de falso positivo se registra con una etiqueta en el repositorio.
- Una regla con más de 10% de falsos positivos reportados sale de `recommended` hasta corregirse.

### 11.8 Catálogo de reglas

Nombres, severidades y presets decididos en [ADR-0023](../adr/0023-arquitectura-linter.md).

- **Identificadores:** el código (`E2E001`) es el identificador estable de la regla: va en `Finding.ruleId`, en SARIF, en el baseline, en el fingerprint (§11.5), en la URL de la documentación y en la constante `RULE_*` del código. El nombre de ESLint (`atium/no-hard-wait`) solo sirve para configurar la regla y desactivarla con `eslint-disable`. Las reglas cross-file no tienen nombre en ESLint.
- **Severidad:** la del Finding es la de esta tabla, sea cual sea el nivel que el usuario dé a la regla en ESLint. Los presets activan las reglas `error` como `"error"` en ESLint y las `warning` e `info` como `"warn"`. Una regla en `"off"` no produce Findings.
- **Preset:** las reglas por archivo marcadas `recommended` entran en `atium/recommended`; todas entran en `atium/strict` (§11.1). Las reglas cross-file no son de ESLint: "activa" significa que `atium lint` la ejecuta salvo que `analyzers["lint-crossfile"].rules` la ponga en `"off"`, y "desactivada", que solo se ejecuta si la pone en `"on"` (§11.10). E2E011 y E2E013 vienen desactivadas porque son `info`, de confianza `medium` y las de más falsos positivos.
- **Categoría de E2E012:** `Finding.category` no tiene `security`; los secretos van en `maintainability` (§22.3).

| Código | Nombre en ESLint | Severidad | Categoría | Confianza | Fuente | Preset |
|---|---|---|---|---|---|---|
| E2E001 | `atium/no-hard-wait` | warning | reliability | high | rule | recommended |
| E2E002 | `atium/no-fragile-css-selector` | warning | selectors | medium | rule | recommended |
| E2E003 | `atium/no-positional-xpath` | warning | selectors | high | rule | recommended |
| E2E004 | `atium/no-positional-locator` | warning | selectors | medium | rule | strict |
| E2E005 | `atium/max-test-size` | info | maintainability | high | rule | strict |
| E2E006 | `atium/require-assertion` | warning | assertions | medium | rule | recommended |
| E2E009 | `atium/prefer-web-first-assertion` | warning | assertions | high | rule | recommended |
| E2E010 | `atium/no-focused-test` | error | reliability | high | rule | recommended |
| E2E012 | `atium/no-hardcoded-secret` | error | maintainability | medium | rule | recommended |
| E2E006b | — (cross-file) | warning | assertions | high | rule | activa |
| E2E007 | — (cross-file) | warning | selectors | high | rule | activa |
| E2E008 | — (cross-file) | warning | reliability | medium | rule | activa |
| E2E011 | — (cross-file) | info | maintainability | medium | rule | desactivada |
| E2E013 | — (cross-file) | info | maintainability | medium | heuristic | desactivada |

Una regla que sale de `recommended` por falsos positivos (§11.7) se actualiza en esta tabla.

### 11.9 Páginas de documentación

- Cada regla, por archivo o cross-file, tiene una página en inglés ([ADR-0020](../adr/0020-idioma-documentacion-publica.md)) en `docs/rules/<código en minúsculas>.md`, por ejemplo `docs/rules/e2e001.md`, con las 5 secciones de [09-documentation.md](../engineering/09-documentation.md#reglas).
- La tabla de equivalencias de los presets (§11.1) es la página `docs/rules/presets.md`.
- `meta.docs.url` de ESLint y `Finding.docsUrl` los construye `ruleDocsUrl(code)` (`core/findings`). Mientras no exista el sitio de documentación, apunta al archivo en GitHub: `https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e001.md`. El enlace da 404 mientras el repositorio sea privado.

### 11.10 `atium lint`

- **Config de ESLint:** si ESLint encuentra un `eslint.config.*` desde el directorio de trabajo, se usa ese, con sus `settings.atium` (§11.1), sus `files`, sus `ignores` y los comentarios `eslint-disable`. Si no hay ninguno, se usa un preset interno equivalente a `atium/recommended`, y se avisa por stderr. Si la config del usuario no activa ninguna regla de Atium, también se avisa.
- **Archivos:** los de `lint.include` (por defecto `["."]`) menos los de `lint.exclude` (por defecto `[]`), en `atium.config` (18-cli-config.md §26.3). Los argumentos `atium lint [paths...]` reemplazan a `lint.include`. El índice de la suite (§11.4) usa los mismos archivos, con los `settings.atium` que ESLint resuelve para cada uno, o los defaults con el preset interno.
- **Mensajes de ESLint:**
  - Los de las reglas `atium/*` se convierten en Findings con el código de la regla y los valores del catálogo (§11.8).
  - Los de una regla externa que la tabla de equivalencias de los presets (§11.1) declara equivalente a una propia (§11.9) se convierten en Findings con el código de la regla propia.
  - Los de las demás reglas se ignoran.
  - Un error de parseo se avisa por stderr con el archivo y no es un Finding.
- **Reglas cross-file:** sus umbrales y cuáles se ejecutan se configuran en `analyzers["lint-crossfile"]`, validado por el `configSchema` del analizador. `rules` es un objeto de código a `"on"` u `"off"` (por ejemplo, `{ E2E011: "on" }`); los códigos que no aparecen toman el valor por defecto del catálogo (§11.8). El CLI construye el índice y crea el analizador con él (14-architecture.md §22.2).
- **Código de salida:** 1 si hay algún Finding nuevo (fuera del baseline, [13-score-baseline-reports.md §21.3](13-score-baseline-reports.md#213-baseline-clean-as-you-code)) con severidad `error`; 0 si solo hay `warning` o `info` (18-cli-config.md §26.2).
