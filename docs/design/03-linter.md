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

Los valores por defecto viven en `packages/eslint-plugin/src/defaults.ts`:

- `framework`: no tiene default. Se detecta por los imports de cada archivo y solo acepta `"playwright"` o `"cypress"`; `undefined` cuenta como ausente.
- `pageObjectDirs`: `[]`, ningún archivo es Page Object si no se configura. Son globs POSIX que se comparan con la ruta del archivo relativa al directorio desde el que corre ESLint (`cwd`), con picomatch: `*` no cruza `/`, se distinguen mayúsculas, un `./` inicial se ignora, una ruta sin comodines (`tests/pages`) cubre todo lo que contiene, `.` cubre todo el `cwd`, los directorios y archivos que empiezan por punto también casan y un glob negado (`!tests/x`) se ignora. Un archivo fuera de ese directorio, o un nombre como `<input>`, no es Page Object. Decidido en #53.
- `assertFunctionNames`: `[]`, solo cuentan las assertions del framework.
- `i18n`: `false`.

`settings.atium` se valida con Zod cuando una regla lo lee. El esquema es estricto: una clave desconocida, un tipo incorrecto o una cadena vacía en las listas detienen ESLint con `CONFIG_INVALID`. El mensaje, en inglés, nombra cada clave con su ruta completa (`settings.atium.i18n`), también las desconocidas, y el hint lista las claves válidas.

### 11.2 Formato de un hallazgo

Cada regla incluye explicación, ejemplo antes/después, autofix o sugerencia cuando es seguro, y página de documentación.

```
E2E001 Hard wait detected                         login.spec.ts:42

  await page.waitForTimeout(5000)

Fixed waits slow down the suite and cause flakiness
when the app is slower than expected.

Suggestion:
  await expect(page.getByRole("TODO")).toBeVisible()

Docs: https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e001.md
```

El autofix solo se ofrece cuando la transformación es segura. Para E2E001 no hay autofix automático (no se puede saber qué esperar); se ofrece una sugerencia editable.

### 11.3 Reglas por archivo: detección exacta

| Código | Regla | Detecta | No detecta (evita falsos positivos) | Umbral por defecto |
|---|---|---|---|---|
| E2E001 | Hard waits | `page.waitForTimeout(n)`, `frame.waitForTimeout(n)`, `cy.wait(<número>)`, `await new Promise(r => setTimeout(r, n))` dentro de tests | `cy.wait("@alias")` (espera una request, es correcto); una promesa con `setTimeout` fuera de un test, sin `await` o devuelta (`return new Promise(...)`) | — |
| E2E002 | Selector CSS frágil | Strings en `locator()`, `$()`, `cy.get()` parseados con un parser CSS: `:nth-child`, `:nth-of-type`, ≥ `depth` combinadores, clases generadas (`css-1a2b3c`, `sc-*`, `jsx-*`), ids con secuencias numéricas | Selectores dentro de `pageObjectDirs` se reportan una sola vez, no por uso; `getBy*`, XPath (E2E003) y selectores desconocidos | Opción `depth`: 3 (se reporta con ≥ 3 combinadores) |
| E2E003 | XPath posicional | XPath en `locator()`, `$()` y `cy.xpath()`: predicados posicionales (`[n]`, `[last()]`, `[position()=n]`) y rutas absolutas `/html/...`, aunque usen atributos | XPath por atributo (`//button[@data-testid='x']`) | — |
| E2E004 | Uso de `.nth()` | `.nth(n)` con n > 0, `.first()` / `.last()` encadenados a locators no únicos | `.nth()` sobre `getByRole` con nombre | Opción `minIndex`: 1 (se reporta `.nth(n)` con n ≥ 1) |
| E2E005 | Test demasiado grande | Acciones (`click`, `fill`, `goto`, `press`, `check`, `selectOption`, comandos `cy.*`) o líneas por test | Acciones en hooks, helpers o fuera de un test | Opciones `maxActions`: 25 y `maxLines`: 150 (se reporta con más de 25 acciones o más de 150 líneas) |
| E2E006 | Assertions insuficientes | Tests con acciones y cero assertions. Cuenta: `expect(...)`, `.should()` / `.and()`, funciones en `assertFunctionNames` y helpers del mismo archivo que contengan assertions (un nivel) | Helpers de otros archivos se resuelven en el motor cross-file | 1 assertion |
| E2E009 | Assertions no web-first | `expect(await x.isVisible()).toBe(true)`, `expect(await x.textContent())...`, `expect(await locator.count())...` | Un valor guardado antes en una variable, `expect.poll`, `innerText` / `inputValue` / `getAttribute`, la consulta sin `await` y el estilo de Cypress, que no hace `await` sobre comandos | — |
| E2E010 | `.only` olvidado | `test.only`, `describe.only`, `it.only` | Un `.only` cuyo callback no es una función literal (`describe.only("d", suite)`); el resto de modificadores | — |
| E2E012 | Secretos en tests | Literales asignados a identificadores tipo `password`, `token`, `secret`, `apiKey` con entropía alta; patrones conocidos (JWT, claves de nube) | Valores obviamente ficticios (`"password123"`, `"test"`) | Entropía ≥ 3.5 bits/char |

#### 11.3.1 Reconocimiento de sintaxis

Las reglas por archivo, `suite-index` y los analizadores reconocen el código E2E con los helpers de `@atium/eslint-plugin/syntax` ([ADR-0023](../adr/0023-arquitectura-linter.md)). Son funciones puras sobre el AST de typescript-eslint, sin información de tipos: reconocen por nombres. Las listas de nombres viven en `packages/eslint-plugin/src/defaults.ts`.

Los envoltorios de TypeScript (`x!`, `x as T`, `<T>x`, `x satisfies T`) y el encadenamiento opcional (`a?.b`) son transparentes: `cy.get("a")!.click()` se reconoce igual que `cy.get("a").click()`.

- **Framework:** el de `settings.atium.framework`. Si no está, el que revelan los imports del archivo, incluidos los `import type`:
  - Playwright: `@playwright/test` o `playwright/test`;
  - Cypress: `cypress`.

  También cuentan los subpaths, como `cypress/react` o `@playwright/test/reporter`. Solo cuentan las declaraciones `import`; no cuentan `export … from`, `require()` ni `/// <reference types="cypress" />`.

  Si el archivo no importa ninguno, o importa los dos, el framework es `undefined`. Es el caso habitual de un spec de Cypress, que no importa nada, o de uno de Playwright que importa `test` desde un archivo de fixtures. Por eso el reconocimiento de la estructura no depende del framework.
- **Estructura:** una declaración es una llamada cuyo callee es uno de estos nombres y cuyo último argumento es una función:

  | Tipo | Playwright | Mocha/Cypress |
  |---|---|---|
  | Test | `test`, `test.only`, `test.skip`, `test.fixme`, `test.fail` | `it`, `it.only`, `it.skip` |
  | Describe | `test.describe` y `.only`, `.skip`, `.fixme`, `.serial`, `.serial.only`, `.parallel`, `.parallel.only` | `describe`, `context` y `.only`, `.skip` |
  | Hook | `test.beforeEach`, `test.afterEach`, `test.beforeAll`, `test.afterAll` | `before`, `after`, `beforeEach`, `afterEach` |
  | Step | `test.step`, `test.step.skip` | — |

  - Las declaraciones que empiezan por `test` siguen la sintaxis de Playwright; el resto, la de Mocha.
  - Los modificadores son las partes del nombre `only`, `skip`, `fixme`, `fail`, `serial` y `parallel`. Qué modificadores reporta E2E010 lo decide la regla: solo `only`.
  - Un test y un step necesitan título: `test.skip()`, `test.skip(isMobile, "reason")` y `test.skip(({ browserName }) => ...)` son anotaciones, no tests.
  - El título es el primer argumento cuando hay más de uno; la función es el último. Por eso `test.step(title, body, { box: true })` no se reconoce como step; sus nodos siguen perteneciendo al test que lo contiene.
  - Quedan fuera `specify`, `xit` y `xdescribe`.
- **`titlePath`:** los títulos de los describes que contienen el test y el suyo, unidos con `" › "` (sección 9.3), como los construye cada runner.
  - Un describe sin título no añade nivel; los steps y los hooks tampoco.
  - Un describe de Playwright titulado `""` no añade nivel, porque Playwright lo descarta de su `titlePath`. En Mocha/Cypress sí lo añade, como hace Mocha. Un test titulado `""` siempre añade su nivel.
  - Un nodo pertenece al test cuyo callback lo contiene, también dentro de un `test.step`. Un nodo en un hook, un helper o el nivel de módulo no tiene test.
  - **Títulos no estáticos:** un string literal o una plantilla sin `${}` son estáticos. Cualquier otro título se marca como no estático y su texto se reconstruye desde el AST, así que no depende de espacios, saltos de línea, comillas ni envoltorios de TypeScript:
    - Las partes de texto se escriben tal cual y el resto como `${código}`: `` `logs in as ${user.name}` `` da `logs in as ${user.name}`, y `"cart " + item` da `cart ${item}`.
    - Un `+` une texto solo si uno de sus lados es texto, como en JavaScript: `"Item " + (count + 1)` da `Item ${count + 1}`.
    - El código se reconstruye para identificadores, `this`, identificadores privados, literales (los números en su forma decimal: `1_000` da `1000`), miembros (también `?.`), llamadas, plantillas, operadores binarios y lógicos y spread. Cualquier otra expresión se escribe `…`, también dentro de otra: `${a ? b : c}` da `${…}`.
    - No se normaliza el contenido de los literales (sección 9.3).
- **Acciones (E2E005):** en Playwright, una llamada a `click`, `fill`, `goto`, `press`, `check` o `selectOption` sobre cualquier objeto que no sea una cadena de `cy`. En Cypress, cada llamada de una cadena que empieza en `cy`, salvo `.should()` y `.and()`: `cy.get("a").click()` son dos acciones. Sin información de tipos, `$el.click()` dentro de un `.then()` de Cypress cuenta como acción de la lista de Playwright.
- **Assertions (E2E006):**
  - `expect(...)`, `expect.soft(...)` y `expect.poll(...)` cuentan una vez, sin importar los matchers que sigan;
  - cada `.should()` y `.and()` encadenado;
  - una llamada cuyo nombre (el identificador, o la propiedad en `loginPage.verifyLoggedIn()`) encaja con `assertFunctionNames`. El patrón encaja con el nombre completo y distingue mayúsculas; `*` encaja con cualquier secuencia, también vacía, y es el único comodín.

  Los helpers que contienen assertions no se siguen aquí: los del mismo archivo los resuelve E2E006 y los de otros archivos, E2E006b.
- **Locators:** `locator()` y `$()` sobre cualquier objeto, `getBy*` (el prefijo seguido de una mayúscula), y `cy.get()` y `cy.xpath()` (del plugin cypress-xpath, decidido en #54) en una cadena de `cy`. `.nth()`, `.first()` y `.last()` son refinamientos, y `.eq()` también en una cadena de `cy` (decidido en #55); `.nth()` y `.eq()` llevan índice; su locator base es la consulta más cercana de la misma cadena, aunque haya otras llamadas o propiedades en medio, como `.filter()`. Un `getByRole` con la opción `name` se marca como tal, para E2E004.
- **Selectores (E2E002, E2E003, E2E007 y nivel de §14.1):** solo se analiza el texto de un selector que es un string literal o una plantilla sin `${}`; cualquier otro argumento es desconocido. El texto se recorta y sus espacios fuera de comillas se colapsan antes de analizarlo. Un selector de más de 2048 caracteres (`SELECTOR_MAX_LENGTH`), medido tras colapsar sus espacios, también es desconocido: el tokenizador de parsel-js crece más rápido que lineal con muchas cadenas o paréntesis, y un selector real no pasa de unos cientos de caracteres.
  - **XPath:** el texto que empieza por `xpath=`, `/`, `(` o `..`, como lo lee Playwright, y siempre el de `cy.xpath()` (ver E2E003 más abajo). Un predicado es posicional si su contenido es un entero (`[2]`) o empieza por `last()` o `position()`; el texto entre comillas no cuenta, así que `//a[@title='[2]']` no es posicional. La ruta es absoluta si empieza por `/` sin `//` (`/html/body/div`). `//button[@data-testid='x']` no es posicional. Un `@` sin nombre (`@*`) no cuenta como atributo, y los atributos de test id se reconocen sin distinguir mayúsculas. Una cadena de Playwright con `>>` fuera de comillas (`//a >> nth=1`) es desconocida.
  - **CSS:** el resto, con un prefijo `css=` opcional, analizado con el tokenizador de parsel-js. No se usa su `parse`, que anida el árbol con un coste cuadrático en el número de combinadores. Es desconocido lo que no tokeniza o no forma una lista de selectores: otros motores de Playwright (`text=`, `role=`, `internal:`), cadenas con `>>`, alias de Cypress (`@user`) y el texto vacío.
  - De cada selector complejo de una lista se reconocen las pseudoclases `:nth-child` y `:nth-of-type`, los combinadores (en una lista cuenta el selector con más), los tipos, los atributos, los ids y las clases. No se analizan los argumentos de las pseudoclases, como el `li` de `:has(li)`.
  - **Ids con secuencias numéricas:** 3 o más dígitos seguidos (`#ember123`, `#react-select-456-input`; no `#step2`).
  - **Clases generadas:** `css-` seguido de un hash con al menos un dígito (`css-1a2b3c`, no `css-grid`), `sc-` con cualquier sufijo y `jsx-` seguido de dígitos (`jsx-123456`, no `jsx-wrapper`).
  - **Normalización (E2E007):** el CSS se vuelve a escribir desde sus tokens, sin el prefijo `css=` (`css=a` y `a` son el mismo selector), con un espacio a cada lado de los combinadores y tras cada coma, los valores de atributo entre comillas dobles y los nombres de tipo y de atributo en minúsculas. Clases, ids y valores conservan sus mayúsculas y nada se reordena: `.a.b` y `.b.a` siguen siendo distintos. El XPath y los selectores desconocidos solo se recortan y colapsan. La normalización es idempotente. Se dejan como están escritos los atributos con namespace o con escapes (`[a\:b=x]`), los valores entre comillas simples que contienen una comilla doble, los tipos con namespace y las pseudoclases con sus argumentos. Los tipos pasan a minúsculas aunque en SVG distingan mayúsculas (`linearGradient`). El XPath pierde su prefijo `xpath=`, como el CSS el suyo, si lo que queda sigue leyéndose como XPath (`xpath= //a` da `//a`; `xpath=A` se queda igual). Las comillas no reconocen escapes con `\`, así que en `[a="x\"  y"]` los espacios tras la comilla escapada se colapsan.
  - El análisis y la normalización nunca lanzan y, con el tope de longitud, tardan un tiempo lineal en la longitud del texto.
  - Los patrones viven en `defaults.ts`. Las formas de los ids, las clases, la normalización y el tope de longitud se decidieron en #50.
  - **E2E002:** un hallazgo por selector, con el primer motivo en este orden: pseudoclase posicional, combinadores (≥ `depth`), clase generada, id numérico. En un archivo de `pageObjectDirs`, el mismo selector normalizado se reporta solo en su primera aparición del archivo; fuera, en cada una. Un `eslint-disable` sobre la primera aparición oculta también las siguientes de ese archivo. Decidido en #53.
  - **E2E003:** el texto de `cy.xpath()` siempre es XPath, aunque no empiece por `/`, `(` o `..`: se lee como `xpath=` + texto, también para la clasificación de §14.1 y la normalización. Un hallazgo por selector, con el primer motivo en el orden de §11.3: predicado posicional y después ruta absoluta. `cy.get("//tr[2]")` no se reporta, porque `cy.get()` lee CSS, aunque la clasificación de §14.1 le dé nivel 1. Decidido en #54.
  - **E2E004:** `.nth(n)` y `.eq(n)` se reportan cuando `n` es un literal numérico entero ≥ `minIndex` (por defecto 1), tenga o no locator base reconocido (`items.nth(2)` se reporta), salvo si la base es un `getByRole` con `name`. Un índice no literal o no entero (`.nth(i)`, `.nth(1.5)`) no se reporta. Un índice negativo (`.nth(-1)`, `.eq(-2)`) cuenta desde el final y se trata como `.last()`, sin depender de `minIndex`. `.first()`, `.last()` y el índice negativo se reportan cuando la base existe y no es única: solo son únicas un `getByRole` con `name` y un `getByTestId`; cualquier `locator()`, `$()`, otro `getBy*`, `cy.get()` o `cy.xpath()` no lo es, y sin base reconocida (`items.first()`) no se reporta. Decidido en #55.
- **Esperas fijas (E2E001):** `waitForTimeout(n)` sobre cualquier objeto, `.wait` con un número literal en una cadena de `cy` (`cy.wait(500)`, también `cy.get("a").wait(500)`), y `new Promise(r => setTimeout(r, n))` cuando la llamada a `setTimeout` es todo el cuerpo del executor y recibe su primer parámetro. No cuentan `cy.wait("@alias")`, `cy.wait(delay)` (el tipo de `delay` no se conoce sin información de tipos), `window.setTimeout`, `return setTimeout(...)` ni `setTimeout(() => r(), n)`. E2E001 reporta `waitForTimeout` y `cy.wait(n)` en cualquier sitio (también hooks, helpers y Page Objects) y la promesa solo cuando está esperada con `await`, a través de `as`, `!`, `satisfies` y `?.`, dentro de un test. Su sugerencia editable reemplaza `X.waitForTimeout(n)` por `expect(X.getByRole("TODO")).toBeVisible()`, con el receptor sin sus `as` ni paréntesis (sin sugerencia si no es un nombre, `this` o una cadena de miembros), `cy.wait(n)` por `cy.get("TODO").should("be.visible")` y un `.wait(n)` encadenado por `.should("be.visible")`; la promesa no tiene sugerencia, porque no se conoce su receptor. Decidido en #52.
- **E2E005:** cuenta las acciones de cada test (las de sus `test.step` incluidas) y las líneas físicas de su callback, de la primera a la última, con líneas en blanco y comentarios (`test("t", async () => {` en la línea 1 y `});` en la 151 son 151 líneas). Se reporta con más de `maxActions` acciones (entero ≥ 0, por defecto 25) o más de `maxLines` líneas (entero ≥ 1, por defecto 150): 25 acciones y 150 líneas no se reportan. Un solo hallazgo por test aunque supere los dos límites, sin autofix ni sugerencia, sobre la cabecera del callback (del inicio del callback al inicio de su cuerpo): es un nodo dentro del test, así que el `titlePath` del fingerprint (§11.5) incluye el título del test. Los helpers no se siguen, pero se cuenta lo escrito en el callback: las acciones de una función local definida dentro del test cuentan para él. En un test anidado en otro, el más interno se queda sus acciones y las líneas del externo incluyen las del interno. Un hook o un describe declarado dentro del callback de un test (código que los runners no admiten) no tiene test propio: sus acciones suman al test exterior. Toda llamada de una cadena `cy` salvo `.should()` y `.and()` es una acción, también `cy.then`, `cy.wrap`, `cy.log`, `cy.its` y `cy.wait("@alias")`, por la lectura literal de "Acciones (E2E005)". Si la cabecera del callback empieza en otra línea que `test(`, las líneas del título no cuentan. Decidido en #57.
- **E2E009:** se reporta un `expect(…)` o `expect.soft(…)` cuyo primer argumento es `await x.isVisible()`, `await x.textContent()` o `await x.count()`, con o sin argumentos en la consulta y con cualquier matcher o ninguno. No cuentan `expect.poll`, la consulta sin `await` (`expect(x.isVisible())`), otros métodos (`innerText`, `inputValue`, `getAttribute`) ni un valor guardado antes en una variable; en Cypress no hay `await` sobre comandos y `.should()` ya reintenta. Reemplazos, que conservan `.not`, `expect.soft` y el segundo argumento de `expect`, y añaden `await` si la llamada no lo tiene:

  | Consulta | Matcher | Reemplazo |
  | --- | --- | --- |
  | `x.isVisible()` | `toBe(true)`, `toEqual(true)`, `toBeTruthy()` | `toBeVisible()` |
  | `x.isVisible()` | `toBe(false)`, `toEqual(false)`, `toBeFalsy()` | `toBeHidden()` |
  | `x.count()` | `toBe(n)`, `toEqual(n)` | `toHaveCount(n)` |
  | `x.textContent()` | `toBe(s)`, `toEqual(s)` | `toHaveText(s)` |
  | `x.textContent()` | `toContain(s)` | `toContainText(s)` |
  | `x.textContent()` | `toMatch(re)` | `toHaveText(re)` |

  - **Autofix:** solo en las filas de `isVisible` y `count`, y solo si el receptor `x`, sin envoltorios, es una consulta de Playwright distinta de `$()` (que da un ElementHandle), es decir `locator()` o `getBy*`, o un refinamiento (`.nth()`, `.first()`, `.last()`) cuyo locator base es una consulta así.
  - **Sugerencia:** en las filas de `textContent`, porque `toHaveText` normaliza los espacios y `textContent()` puede ser `null`, y en las de `isVisible` y `count` con cualquier otro receptor (un identificador, `page.$("a")`, `items.first()`, `cy.get("a").first()`, `page.locator("a").filter(…)`).
  - **Solo el hallazgo:** con otro matcher o ninguno, con argumentos en la consulta (`page.isVisible("#a")`), con un número de argumentos del matcher distinto del de su fila, con un argumento que no es el literal de la fila (`toBe(1)` o `toBe(shown)` sobre `isVisible()`), con un literal que no es un número en la fila de `count` (`toBe("3")`, `toBe(null)`, `toEqual({})`) o con comentarios en el código que se reemplaza.
  - Decidido en #56.

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
- **En el código:** esta tabla fija los valores (ADR-0023 §3). Cada regla por archivo copia su fila en su `meta.docs` (`AtiumCatalogDocs`: `code`, `severity`, `category`, `confidence`, `source` y `recommended`), y un test del plugin comprueba que cada regla registrada coincide con su fila. Decidido en #51.

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
