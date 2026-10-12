# Progreso

Bitácora entre sesiones de trabajo. La escribe `/handoff` al cerrar cada sesión y se lee al empezar la siguiente.

- Las entradas más recientes van primero.
- Se conservan las 10 últimas; las anteriores pasan a `docs/progress-archive.md`.
- El estado de cada tarea vive en su issue de GitHub (índice en `docs/tasks/README.md`); aquí va el contexto que no cabe ahí.

## Entradas

### 2026-10-12 — #11 v0-10-redaction

- **Hecho:**
  - `/task 11 en paralelo con #10`, en el worktree `atium-11`. Rama `feat/11-redaction` creada desde `origin/main` (`86a01a2`). El usuario hizo el push. PR #30 abierto con `Closes #11`, sin mergear.
  - Commit `03f5f2a` `feat(core): add secret redaction`:
    - `packages/core/src/redact/patterns.ts`: `REDACT_PATTERN_IDS` = `jwt`, `bearer`, `aws-key`, `gcp-key`, `azure-key` (en ese orden se aplican, sin importar el orden de la config) y `createTextRedactor(ids)`, que crea copias propias de cada regex.
    - `packages/core/src/redact/fields.ts`: `redactFieldsWith(value, { isSensitive, redactText })`. Copia iterativa (sin recursión) de arrays y objetos planos; soporta ciclos, escribe con `defineProperty` (seguro con `__proto__`) y no muta la entrada. Otros valores (`Error`, `Map`, clases) se devuelven tal cual, sin redactar.
    - `packages/core/src/redact/redactor.ts`: `RedactConfigSchema`, `RedactConfig`, `HeaderValue`, `Redactor` y `createRedactor(config)`, que devuelve `{ redact, redactHeaders, redactFields }`.
    - `src/defaults.ts`: bloque añadido al final con `REDACTED_MARKER = "[REDACTED]"` y `REDACT_DEFAULTS` (congelado). `src/index.ts`: exports nuevos tras `./paths.js`.
  - Commit `e294609` `fix(core): close partial leaks and match sensitive names by fragment`: correcciones de `/review`, todas pedidas por el usuario ("Corrige todos"):
    - `bearer` y `azure-key` consumen el valor hasta un delimitador (`[^\s"'<>,;[\]]+`), y `azure-key` no distingue mayúsculas y admite espacios alrededor de `=`.
    - Comparación por fragmento en `headers` y `bodyFields`, con defaults ampliados.
    - TSDoc completo; README, §28.1 y 18-cli-config.md actualizados; tests nuevos.
  - Verificado:
    - `pnpm verify` exit 0 con Node 22: 490 tests. Cobertura de `patterns.ts` y `redactor.ts` al 100 %; en `fields.ts` solo falta la rama `default: assertNever` del `switch`.
    - Tiempo lineal: entradas adversarias de 1 MiB con tope de 2 s. A mano se comprobó que una regex JWT anclada con `\b` tarda 10 s con 256 KiB (cuadrática); con el lookbehind tarda menos de 1 ms.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, security-reviewer, design-auditor): sin bloqueantes. Se aplicaron los 5 importantes y todas las sugerencias.
    - CI del PR #30: no revisado al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas en el plan (el usuario respondió "Si" a las recomendaciones):
    - Se añaden `gcp-key` y `azure-key` a `aws-key`, y los cinco patrones están activos por defecto.
    - Una lista de la config reemplaza a su default, no lo amplía.
    - La API es un objeto `Redactor`, no solo la función `redact` (anotado en `docs/tasks/v0-10-redaction.md`).
  - Tomadas por el agente (el usuario pidió "busca la mejor decisión posible"):
    - `headers` y `bodyFields` son fragmentos de nombre. El nombre se normaliza (minúsculas, solo letras y dígitos de cualquier alfabeto) y basta con que contenga el fragmento, como el scrubbing por defecto de Sentry.
    - Defaults de headers: `authorization`, `cookie`, `apikey`, `token`, `secret`, `session`.
    - Defaults de `bodyFields`: `password`, `passwd`, `secret`, `token`, `apikey`, `credential`, `privatekey`, `sessionid`, `cardnumber`, `cvv`.
    - Un fragmento sin letras ni dígitos se rechaza. No se usa `auth` porque redactaría `author`.
    - Falsos positivos aceptados: `tokenCount`, `passwordPolicy` y la palabra que sigue a "bearer" en prosa.
  - Ambigüedades del diseño resueltas por el agente:
    - El JWT sin firma necesita el segundo punto.
    - `aws-key` y `gcp-key` exigen la longitud exacta.
    - `redactFields` solo recorre valores JSON; un cuerpo sin parsear solo pasa por los patrones.
    - Las claves de los objetos no se redactan.
  - Todo lo anterior quedó escrito en `docs/design/20-security-privacy.md` §28.1 y en el ejemplo `redact` de `18-cli-config.md` §26.3, que ahora muestra los defaults. No hay ADR: se consideró suficiente el diseño.
  - Sin changeset porque `@atium/core` es `private`. Solo está escrito aquí y en el PR.
- **Problemas:**
  - El PR #30 tiene unas 1.020 líneas cambiadas, más que las 400 de `08-git-workflow.md`: 572 son tests y 68 documentación. Está dicho en el PR.
  - Conflicto esperado con #10 (v0-09, en paralelo en el worktree `atium-10`). Ambos añaden un bloque al final de `packages/core/src/defaults.ts` y exports en `src/index.ts`, y ambos escriben su entrada en `docs/progress.md`. Se resuelve conservando ambos lados (`12-ai-workflow.md`, "Cuando otra tarea se mergea antes").
  - Nada llama todavía a `createRedactor`. v0-11 (logger) y v0-14 (escritor de runs) deben redactar **antes** de truncar con `truncateUtf8`.
  - Fuera de alcance: emails, patrones definidos por el usuario y JWE.
  - La rama del `default: assertNever` en `fields.ts` queda sin cubrir; no se puede alcanzar.
  - Este handoff archivó la entrada más antigua ("2026-10-08 — Preparación del repositorio") en un `docs/progress-archive.md` nuevo.
  - Sin cambios desde #9:
    - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
    - `pnpm verify` necesita `source ~/.nvm/nvm.sh && nvm use 22`.
    - Contradicción sobre changesets: `11-code-review.md:70` frente al DoD.
- **Siguiente paso:**
  1. Revisar que los jobs del PR #30 pasen. Si #10 se mergea antes, en este worktree: `git fetch origin && git merge origin/main`, resolver conservando ambos bloques, `/verify` y pedir el push.
  2. Cuando una persona mergee el PR #30, `/parallel --cleanup` en el repo principal para retirar el worktree `atium-11`.
  3. La siguiente tarea de V0 según la regla de `CLAUDE.md` (probablemente #12, v0-11 logger y reloj, que debe usar `createRedactor`).

### 2026-10-12 — #9 v0-08-identity-and-paths

- **Hecho:**
  - Al empezar, `/task 8`: el issue #8 estaba cerrado y el PR #26 mergeado; no se tocó nada. Se siguió con `/task 9` (decisión del usuario: "como prefieras").
  - Rama `feat/9-identity-and-paths` (desde `main` en `f9eee62`). Push hecho por el usuario. PR #27 abierto con `Closes #9`, sin mergear.
  - Commit `847bbaf` `feat(core): add test identity and path helpers`:
    - `packages/core/src/identity.ts`: `TITLE_PATH_SEPARATOR = " › "`, tipo `TestIdentity` y `computeTestId({ project, file, titlePath })` = `sha1([project ?? "", file, titlePath.join(" › ")].join("|")).slice(0, 16)`, validado con `TestIdSchema.parse`. Valores fijos en los tests calculados con `shasum`: `chromium|tests/cart.spec.ts|cart › checkout` → `2417ec6bdaef918a`; sin project → `77170b81b86e01a4`.
    - `packages/core/src/paths.ts`:
      - `toPosixRelative(root, absolutePath)`: usa `path.win32` si la raíz o la ruta empiezan por letra de unidad (`C:\`, `C:/`) o UNC (`\\`), y `path.posix` en otro caso. Lanza `AtiumError("MODEL_INVALID")` si la ruta es la raíz o está fuera.
      - `resolveInside(root, relative)` (usa el `path` del sistema) y la interna `resolveInsideWith(api, root, relative)` (`@internal`, no exportada desde `index.ts`; existe para probar `posix` y `win32` en cualquier SO). Comprueba con `path.relative`: rechaza `""`, `..`, `../…`, resultado absoluto (otra unidad) y NUL; con separador `\` además rechaza segmentos con punto o espacio final y nombres de dispositivo (`CON`, `PRN`, `AUX`, `NUL`, `COM0-9`, `LPT0-9`, con `¹²³` y con cualquier extensión). Léxica: no sigue symlinks.
      - Los mensajes de error citan la ruta con `JSON.stringify` y la recortan con `truncateUtf8` a `ERROR_PATH_PREVIEW_BYTES = 200` (nuevo en `src/defaults.ts`), añadiendo `…` si se recorta.
    - `src/index.ts` exporta `computeTestId`, `TITLE_PATH_SEPARATOR`, `TestIdentity`, `resolveInside` y `toPosixRelative`.
    - Docs: README de core; `docs/design/02-data-model.md` §9.3 (separador `|` sin espacios, `""` sin project, colisiones posibles, sin normalización Unicode); `docs/engineering/06-security.md` "Rutas de archivos" (reemplaza el snippet de `startsWith` por las reglas de `resolveInside` y el tope de 200 bytes).
  - Verificado:
    - `pnpm verify` exit 0 con Node 22: 361 tests y 100% de cobertura.
    - `/review` (code-reviewer, duplication-auditor, docs-checker y security-reviewer, este añadido aunque las reglas de `/review` no lo pedían para core): sin bloqueantes. Se corrigieron los 3 importantes (mensajes de error con entrada sin escapar, segmentos con punto o espacio final en Windows, README sin `TITLE_PATH_SEPARATOR` ni `TestIdentity`) y todas las sugerencias (pedido por el usuario: "Corrige todos").
    - CI del PR #27 (run `38210836909`): todos los jobs pendientes al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan. Escritas en §9.3, `06-security.md`, el TSDoc y el código:
    - sha1 según ADR-0003.
    - Campos unidos con `|` literal y `""` si falta `project`.
    - `toPosixRelative` lanza `MODEL_INVALID` fuera de la raíz o en la raíz.
    - `resolveInside` con `path.relative` en lugar del snippet de `startsWith`.
  - Tomadas en la implementación o en la revisión:
    - Sin `eslint-disable` para `sonarjs/hashing`: la regla no marca `createHash("sha1")` cuando el resultado se asigna y se recorta (sí cuando se devuelve directamente). Solo está en esta entrada y en el PR.
    - `aTestCase` sigue con `seededHex`: con `computeTestId`, `["cart › checkout"]` y `["cart", "checkout"]` colisionan, y el test existente `test-case-builder.test.ts` "derives different testIds for titles that only differ in how they are split" lo prohíbe. Escrito en el TSDoc de `aTestCase` (ya decía que no es el de §9.3); el motivo concreto solo está aquí.
    - Rechazo de nombres de Windows y NUL, y el tope de 200 bytes: escritos en `06-security.md` y `defaults.ts`.
    - Sin changeset porque `@atium/core` es `private`. Solo en el PR y aquí.
- **Problemas:**
  - El PR #27 tiene 630 líneas cambiadas, más que las 400 de `08-git-workflow.md`; cerca de la mitad son tests. No se dividió; se dice en el PR.
  - No se pudo comprobar en Windows real si `".. "` podría escapar de la raíz; el rechazo es preventivo.
  - Contradicción sin resolver: `docs/engineering/11-code-review.md:70` pide changeset para cualquier cambio de API pública; el DoD (`docs/engineering/README.md:47`) y `08-git-workflow.md:110` solo para paquetes publicados.
  - `knip --production` marca `packages/core/src/model/json-schema.ts` y `model/samples.test-support.ts` como archivos sin usar (fuera del alcance de #9; `pnpm unused` pasa).
  - Sin cambios desde #8:
    - `audit` falla por `shell-quote` y `source-map-js`.
    - `05-fingerprinting.md` §13.2: no está claro el `family = sha1(...)` sin `slice`. Cuando se implemente `fingerprint`, aplicar la misma convención de separadores que §9.3 (`|` literal sin espacios).
    - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
    - `pnpm verify` hay que ejecutarlo con `source ~/.nvm/nvm.sh && nvm use 22` (Node 23.1.0 por defecto no lo admite dependency-cruiser).
- **Siguiente paso:**
  1. Revisar que los jobs `verify` del PR #27 pasen, en especial `windows-latest`. El usuario mergea.
  2. `/task 10` (v0-09 modelo de Finding y orden determinista), si sus dependencias están cerradas.
  3. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` descrito en la entrada de #6. Antes, preguntar al usuario la rama y el issue.
  4. En v0-14: `RunHeaderSchema` (`RunSchema` sin `results`), límites del lector (64 KiB, 1 MiB y 256 MiB), umbral de 768 KiB y ventana de 10 pasos en `defaults.ts`.

### 2026-10-11 — #8 v0-07-test-builders

- **Hecho:**
  - Rama `feat/8-test-builders` (desde `main` en `49d9ae6`). El push lo hizo el usuario (el agente no tiene permiso para `git push`). PR #26 abierto con `Closes #8`, sin mergear.
  - Commit `71f0ae5` `docs(repo): add handoff entry for #7`: la entrada de #7 que estaba sin commitear al empezar la sesión.
  - Commit `3cb82c3` `feat(core): add test data builders`, en `packages/core/src/testing/`:
    - `run-builder.ts` (`aRun`: `.withSeed(n)`, `.onCommit(sha)`, `.onProvider(name)`, `.withResult(builder)`, `.with(patch)`), `test-result-builder.ts` (`aTestResult(title?)`: `.passed()`, `.failedThenPassed()`, `.failedAllAttempts(n)`, `.forTest(builder)`, `.inFile(file)`, `.with(patch)`), `test-case-builder.ts` (`aTestCase(title?)`: `.inFile`, `.inProject`, `.withTags`, `.with`), `attempt-builder.ts` (`anAttempt()`: `.withIndex`, `.passed()`, `.failed(errorBuilder?)`, `.with`) y `error-builder.ts` (`anError(type?)`: `.withMessage`, `.with`). Exportados con sus tipos `*Builder` desde `src/testing/index.ts`.
    - Sin clases: cada builder es una función que devuelve un objeto congelado con `Object.freeze`; cada método crea un builder nuevo. `.with(patch)` copia el patch con `structuredClone`. `build()` hace `XSchema.parse(...)`: valida, da los tipos branded sin `as` y devuelve el objeto congelado (`.readonly()` de Zod).
    - `deterministic.ts` (interno, no sale por `index.ts`): `FIXED_START = "2026-10-08T14:03:00.000Z"`, `fixedTimePlus(ms)`, `seededHex(seed)` (sha256, 16 hex) y `seededRunId(seed)` (UUID v7 con el timestamp de `FIXED_START` y bits aleatorios de `sha256("run:" + seed)`).
    - Defaults:
      - `aRun()`: id de seed 1, sin `ci`, playwright en linux/x64/22.20.0, `finishedAt` = inicio + 150 s.
      - `aTestCase()`: `tests/example.spec.ts`, `titlePath = [title]`, título por defecto `"example test"`. `testId` = `seededHex(JSON.stringify([project, file, titlePath]))`.
      - `anError()`: `TimeoutError`, `"Timeout 5000ms exceeded."`, `failedAtMs` 1000. `fingerprint` = `seededHex(JSON.stringify([type, message]))`; `family` = `seededHex("family:" + type)`.
      - `anAttempt()`: índice 0, `passed`, 1000 ms. `startedAt` = inicio + índice × su propia duración.
    - `failedAllAttempts(n)` lanza `RangeError` si `n` no es un entero ≥ 1. Con más de 20 intentos, el Zod de `build()` lanza.
    - Tests: un `.test.ts` por archivo, con defaults válidos, inmutabilidad, determinismo (incluido un id de run fijo como golden value), round trip JSON del `Run` y property-based de `seededHex` y `seededRunId` (seed `20261011`).
    - Docs: README de core, `docs/engineering/04-testing.md` (dos viñetas en "Datos de prueba") y un comentario en `src/model/samples.test-support.ts` que explica por qué los tests de esquema no usan los builders.
  - Verificado:
    - `pnpm verify` exit 0 con Node 22.23.3: 279 tests y 100% de cobertura.
    - `/review` (code-reviewer, duplication-auditor, docs-checker): sin bloqueantes. Se corrigieron los 2 importantes (TSDoc inexacto de `family` y tags faltantes en `deterministic.ts`) y las 7 sugerencias.
    - CI del PR #26 (run `38204259056`): `audit` falla (ver Problemas); los jobs `verify` estaban pendientes al cerrar la sesión.
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan. Están en el código, el TSDoc, el README y `04-testing.md`:
    - Builders como funciones, sin clases.
    - `build()` valida con Zod.
    - Los valores por defecto de los builders son datos de prueba, no defaults del producto, así que no van en `defaults.ts`.
    - `samples.test-support.ts` se queda sin migrar a los builders.
    - La entrada de #7 se commitea en esta rama.
  - Tomadas durante la implementación o en `/review`. Solo están en el código y el TSDoc:
    - El `testId` por defecto NO es el de §9.3: se calcula con sha256 y `JSON.stringify` para evitar colisiones.
    - Se usa sha256 en lugar de sha1 porque la regla `sonarjs/hashing` marca sha1 como error.
    - Los patches se copian con `structuredClone`.
- **Problemas:**
  - En v0-08, `computeTestId` debe usar sha1 según §9.3, y `sonarjs/hashing` lo marcará como error. Hay que decidir con el usuario si se desactiva la regla en esa línea con una justificación (hoy no hay ningún `eslint-disable` en el repo).
  - Cuando exista `computeTestId`, conviene que `aTestCase` lo use en lugar de `seededHex`. Hoy esto no está escrito en ninguna tarea.
  - Sin cambios desde #7:
    - `audit` falla en el PR #26 por `shell-quote` y `source-map-js`.
    - `05-fingerprinting.md` §13.2: no está claro el `family = sha1(...)` sin `slice`.
    - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
  - El Node activo por defecto del shell es 23.1.0, y dependency-cruiser no lo admite. `pnpm verify` hay que ejecutarlo con `source ~/.nvm/nvm.sh && nvm use 22`.
  - El hook `test-guard` bloqueó borrar un archivo de test temporal que el agente usaba para inspeccionar valores. No se rodeó, y el archivo nunca llegó a crearse.
- **Siguiente paso:**
  1. Revisar que los jobs `verify` del PR #26 pasen. El usuario mergea.
  2. `/task 9` (v0-08 identidad de tests y rutas). Depende solo de v0-06. Antes de implementar `computeTestId`, preguntar por `sonarjs/hashing` y proponer que `aTestCase` lo use.
  3. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` descrito en la entrada de #6. Antes, preguntar al usuario la rama y el issue.
  4. En v0-14: `RunHeaderSchema` (`RunSchema` sin `results`), límites del lector (64 KiB, 1 MiB y 256 MiB), umbral de 768 KiB y ventana de 10 pasos en `defaults.ts`.

### 2026-10-11 — #7 v0-06-model-schemas

- **Hecho:**
  - Rama `feat/7-model-schemas` (desde `main` en `aa3d005`). PR #25 con `Closes #7`, mergeado por el usuario (merge `49d9ae6`); el issue #7 quedó cerrado. `main` local actualizado a `49d9ae6`.
  - Commit `b77f58f` `docs(repo): add handoff entry for #6`: la entrada de #6 que estaba sin commitear al empezar la sesión.
  - Commit `349d2fc` `feat(core): add Zod schemas of the data model`:
    - `packages/core/src/model/`: un archivo por entidad (`run.ts`, `test-result.ts`, `test-case.ts`, `attempt.ts`, `error-occurrence.ts`, `network.ts`, `bdd.ts`), con los campos de §9.2. Objetos `z.strictObject(...).readonly()`: rechazan claves desconocidas y el objeto parseado queda congelado. Opcionales con `.exactOptional()` (rechazan `undefined` explícito). Tipos con `z.infer`.
    - `ids.ts`: `RunIdSchema` (UUID v7 estricto), `TestIdSchema` y `FingerprintSchema` (`/^[0-9a-f]{16}$/`), branded.
    - `fields.ts` (interno): `cappedString(maxBytes)` (`.max(n, { abort: true })` como precheck más un `refine` con la medida exacta), `TextSchema` (2 KiB), `cappedList`, `NonNegativeIntSchema`, `MillisecondsSchema`, `DroppedCountSchema` (entero ≥ 1), `TimestampSchema` (`z.iso.datetime()` solo UTC con `Z`, más `.max(2048)`).
    - `text.ts`: `jsonEscapedByteLength` (interno, para el escritor de v0-14) y `truncateUtf8(value, maxBytes)` (público; lanza `RangeError` si `maxBytes` no es un entero ≥ 0). Sin marcador ni elipsis.
    - `src/defaults.ts`: `MODEL_LIST_CAPS` y `MODEL_TEXT_CAPS_BYTES` (ADR-0018). No se exportan desde `index.ts`.
    - Constantes exportadas: `SCHEMA_VERSION`, `ATTEMPT_STATUSES`, `TEST_OUTCOMES`, `FRAMEWORK_NAMES`.
    - JSON Schema en `packages/core/schemas/run.v1.json`, generado por `pnpm --filter @atium/core schema:export` (`vitest run src/model/json-schema.test.ts --update`, con `toMatchFileSnapshot`). `runJsonSchema()` quita `readOnly` y añade `title` y `description`. `schemas` añadido a `files` y a `.prettierignore`.
    - Dependencias: `zod@4.6.5` (dependency de core) y `fast-check@4.10.2` (dev). Son las últimas versiones que admite `minimumReleaseAge`.
    - Tests: uno por esquema, con casos válidos e inválidos en `it.each`, más el round trip JSON del `Run` y property-based de `text.ts` (seed fija `20261011`, 1000 runs, contra `JSON.stringify`). Las muestras válidas están en `src/model/samples.test-support.ts` (solo tests).
    - Docs: README de core, `docs/engineering/10-tooling.md` (`.prettierignore`) y `docs/design/16-repository-structure.md` (`core/schemas/` contiene el JSON Schema publicado).
  - Verificado:
    - `pnpm verify` exit 0 con Node 22.23.3: 223 tests y 100% de cobertura.
    - `pnpm --filter @atium/core pkg:check` pasa.
    - `/review` (code-reviewer, duplication-auditor, docs-checker, design-auditor). Bloqueantes corregidos: timestamps sin tope y TSDoc de las muestras. Importantes corregidos: `10-tooling.md`, `16-repository-structure.md` y `files`. Sugerencias 6–8 aplicadas.
    - CI del PR #25 (run `38200407349`): los 6 jobs `verify` pasan; `audit` falla (ver Problemas).
- **En curso:** nada.
- **Decisiones:**
  - Aprobadas por el usuario en el plan; están en el código y el TSDoc, no en `docs/design/`:
    - Topes de `message` y `stack`: 2048 y 8192 bytes ("2 KB" y "8 KB" de §9.2 leídos como KiB).
    - `ci.shard.index` en base 1, con `index ≤ total`.
    - `Run.id` como UUID v7 estricto.
    - Objetos estrictos: las claves desconocidas se rechazan.
  - Aprobadas por el usuario en `/review`; tampoco están en `docs/design/`:
    - `runAttempt`, `prNumber`, `workers`, `location.line` y `location.column` exigen ≥ 1.
    - `retries` y el resto de conteos, índices, duraciones y offsets son enteros ≥ 0. `p95Ms` también es entero.
    - `NetworkCall.status` acepta 0.
    - `TestId` y `Fingerprint` van en hex minúscula.
    - `attempts`, `titlePath` y `steps` pueden ir vacíos, y los strings vacíos se aceptan.
    - La única validación entre campos es la del shard.
  - `family` es un string libre con el tope por defecto.
  - `schema:export` usa `toMatchFileSnapshot` para no añadir `tsx` u otro runner.
  - El PR #25 superó las 400 líneas de la guía de `08-git-workflow.md`: unas 670 de código y docs más unas 880 de tests. El usuario lo aceptó como un solo PR, porque "una tarea por PR" choca con el límite. No quedó escrito como excepción.
- **Problemas:**
  - `docs/design/05-fingerprinting.md` §13.2 define `family = sha1(...)` sin `.slice(0, 16)`, a diferencia de `fingerprint`. No está claro si es el sha1 completo; afecta al cálculo de `family` en la fase de fingerprinting.
  - El job `audit` sigue fallando en el PR #25 y en `main` (run `38200827926`, `49d9ae6`) por `shell-quote` (critical) y `source-map-js` (high). Es el mismo problema de #6. `zod` y `fast-check` no aparecen en el audit.
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. `/task 8` (v0-07 Builders de datos de prueba). Depende de v0-06. Las muestras de `src/model/samples.test-support.ts` pueden servir de punto de partida o quedar sustituidas por los builders.
  2. A partir del 2026-10-14T14:08Z, el bump de `shell-quote` y `source-map-js` descrito en la entrada de #6. Antes, preguntar al usuario la rama y el issue.
  3. En v0-14: `RunHeaderSchema` (`RunSchema` sin `results`), límites del lector (64 KiB, 1 MiB y 256 MiB), umbral de 768 KiB y ventana de 10 pasos en `defaults.ts`.

### 2026-10-11 — #6 v0-05-errors-result-failopen

- **Hecho:**
  - Rama `feat/6-errors-result-failopen` (desde `main` en `da2762b`). Push hecho por el usuario. PR #24 abierto con `Closes #6`, sin mergear.
  - Commit `c15f32d` `feat(core): add errors, Result, Logger interface and failOpen`, en `packages/core/src/`:
    - `errors.ts`: `ERROR_CODES` (los 8 de `03-errors-logging.md`, sin agregar ninguno), `ErrorCode` y `AtiumError`. `cause` solo se define si la clave está en las opciones (`"cause" in options`), como en un `Error` nativo.
    - `errors.ts`: `isAtiumError(value)`, que no usa `instanceof`. Comprueba que sea un objeto con `name === "AtiumError"` y un `code` conocido, para reconocer errores de la otra copia ESM/CJS del paquete o de otro realm (`vm`, workers).
    - `result.ts`: `Result<T, E = AtiumError>`, `ok` y `err`.
    - `logger.ts`: `LogLevel`, `LogContext = Readonly<Record<string, unknown>>` e interfaz `Logger` (`error`/`warn`/`info`/`debug(message, context?)`). Solo tipos.
    - `fail-open.ts`: `FailOpenOptions` y `failOpen`, idénticos a `03-errors-logging.md`. Solo async.
    - `testing/fake-logger.ts`: `FakeLogger` (guarda las llamadas en `entries`) y `LogEntry`, exportados desde `@atium/core/testing`.
    - Un test por módulo: 28 tests y 100% de cobertura en los archivos con lógica. El smoke test de exports no se tocó.
    - `docs/engineering/03-errors-logging.md`: firma de `Logger`, regla "un Logger nunca lanza", semántica de `cause` e `isAtiumError`.
    - `packages/core/README.md` actualizado. Sin changeset, porque core es `private`.
  - Commit `ddee398` `chore(repo): run format hook from the project root`: `.claude/hooks/format.mjs` ahora ejecuta Prettier con `cwd` = `CLAUDE_PROJECT_DIR`. Antes, si el directorio de trabajo de la sesión era `packages/core`, Prettier no leía el `.prettierignore` de la raíz y reformateaba los `.md`. El agente no puede editar `.claude/hooks/**`: el usuario copió el archivo desde el scratchpad y pidió el commit en esta misma rama. Está mencionado en la descripción del PR #24.
  - Verificado:
    - `pnpm verify` pasa en local con Node 22.23.3.
    - `/review` (code-reviewer, duplication-auditor, docs-checker): sin bloqueantes. Se corrigieron los 4 importantes (reformateo del `.md`, snippet de `AtiumError` desactualizado y TSDoc incompleto de `Logger` y `FakeLogger`) y las 5 sugerencias.
    - CI del primer push (`c15f32d`, run `38197467024`): los 6 jobs `verify` pasan.
- **En curso:** nada. CI del segundo push (`ddee398`, run `38198130585`): los 6 jobs `verify` pasan y `audit` falla (ver Problemas).
- **Decisiones:**
  - Aprobadas por el usuario en el plan y escritas en `03-errors-logging.md` y en el TSDoc:
    - Firma de `Logger`.
    - Contrato "un `Logger` nunca lanza", así que `failOpen` no protege `logger.warn`.
    - Solo `failOpen` async: los hooks síncronos del reporter usarán `void failOpen(...)` o pedirán una variante síncrona en la fase del collector. Esto último no está escrito en ningún lado.
  - "Los riesgos resuélvelos como consideres": se añadió `isAtiumError` (escrito en `03-errors-logging.md`).
  - Sugerencia de `/review` aplicada: `LogLevel` como tipo propio, en lugar de `keyof Logger`.
  - El hook va en la rama de #6 por decisión del usuario, sin issue propio.
- **Problemas:**
  - El job `audit` falla en el PR #24 por `shell-quote` 1.10.0 (critical) y `source-map-js` 1.2.1 (high), igual que en #22, que ya se mergeó con `audit` en rojo. El usuario pidió hacer el bump en esta sesión, pero no se pudo: `minimumReleaseAge: 20160` solo los admite desde el 2026-10-13T02:34Z (`shell-quote` 1.11.0) y el 2026-10-14T14:08Z (`source-map-js` 1.2.2). El bump no tiene rama ni issue; la entrada de #5 lo ubicaba en `ci/5-ci-pipeline`, que ya se mergeó.
  - Node local por defecto 23.1.0: hay que usar `nvm use` (22).
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. Cuando una persona mergee el PR #24: `/task 7` (v0-06 Esquemas Zod del modelo de datos, depende de #6).
  2. Desde el 2026-10-14T14:08Z, con `nvm use`:
     - Preguntar al usuario la rama y el issue del bump, porque la convención `<tipo>/<n>-<nombre>` necesita un número.
     - Ejecutar `pnpm update --depth Infinity shell-quote source-map-js` y comprobar en `pnpm-lock.yaml` que quedan `shell-quote@1.11.0` y `source-map-js@1.2.2` sin otros cambios.
     - Ejecutar `pnpm audit --audit-level high` y `pnpm verify`.
     - Commit `build(repo): bump shell-quote and source-map-js to patched versions`.

### 2026-10-11 — #5 v0-04-ci-pipeline

- **Hecho:**
  - Rama `ci/5-ci-pipeline` (desde `main` en `3204c6b`); commit `6fbf88d` `ci(repo): add verify workflow, Renovate config and PR template`. Push hecho por el usuario. PR #22 abierto con `Closes #5`, sin mergear.
  - `.github/workflows/verify.yml`:
    - Job `verify`: `pnpm install --frozen-lockfile` y `pnpm verify` en Node 22/24 × ubuntu/macos/windows-latest, con `fail-fast: false` y `cache: pnpm`.
    - Job `audit`: `pnpm audit --audit-level high`.
    - `permissions: contents: read`; `concurrency` por PR, que solo cancela en `pull_request`; `timeout-minutes: 30` por job; `persist-credentials: false`.
  - SHA de las Actions resueltos con `gh api` desde los tags de las releases oficiales (los tags anotados, desreferenciados). Se usó la última release estable con al menos 14 días:
    - `actions/checkout` v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`
    - `actions/setup-node` v7.0.0 `820762786026740c76f36085b0efc47a31fe5020`. La v7.1.0, del 2026-10-08, se descartó por tener menos de 14 días.
    - `pnpm/action-setup` v6.1.0 `ea17c68df8912ef543352723c149a84f56e3d413`
  - `renovate.json`: el de `10-tooling.md`, más la regla `typescript` `allowedVersions: "<7"` (ADR-0021).
  - `.github/pull_request_template.md`: idéntica a `08-git-workflow.md`.
  - `.gitattributes`: `* text=auto eol=lf` y `fixtures/** -text`.
  - Docs:
    - `10-tooling.md`: fila CI en el resumen, ejemplo de Renovate actualizado, nueva sección "CI" y política LF en la sección de Prettier.
    - `06-security.md`: nivel de audit y formato del pin por SHA.
    - `08-git-workflow.md`: ubicación de la plantilla de PR.
  - Verificado:
    - `pnpm verify` pasa en local con Node 22.23.3.
    - `/review` sin bloqueantes; se corrigieron los 4 importantes y las sugerencias de timeout, `fixtures/` y ubicación de la plantilla.
    - En el PR #22, los 6 jobs `verify` pasan (run `38194643302`).
- **En curso:** el job `audit` del PR #22 falla, como se esperaba. `pnpm audit --audit-level high` encuentra:
  - `shell-quote@1.10.0` (critical, GHSA-pqg4-j6r4-53mv, vía `@changesets/cli>launch-editor`). Parche 1.11.0, publicado el 2026-09-29T02:34Z.
  - `source-map-js@1.2.1` (high, GHSA-68fv-2mgg-jv7q, vía `vitest>vite>postcss` y `magicast`). Parche 1.2.2, publicado el 2026-09-30T14:08Z.

  `minimumReleaseAge: 20160` impide resolver esos parches hasta el 2026-10-13T02:34Z y el 2026-10-14T14:08Z (UTC). Los rangos de los padres (`launch-editor` `^1.10.0` y `postcss`) ya los admiten, así que no hacen falta overrides.
- **Decisiones:**
  - Decisiones del usuario:
    - `pnpm audit --audit-level high` y bloqueante (escrito en `06-security.md`).
    - Esperar a que los parches cumplan los 14 días en lugar de excepciones o `ignoreGhsas` (escrito en `06-security.md` como regla general; la fecha concreta solo está aquí y en el PR #22).
  - Decisiones de esta sesión:
    - `.gitattributes` con LF, que añade un archivo fuera de la lista de la tarea (escrito en `10-tooling.md`).
    - `timeout-minutes: 30`. El valor lo propuso el agente y el usuario aceptó "los que consideres". Está escrito en `10-tooling.md` pero no en el diseño.
    - Rama con tipo `ci`.
- **Problemas:**
  - Node local por defecto 23.1.0: dependency-cruiser lo rechaza y `deps:check` falla. Hay que usar `nvm use` (22).
  - No se aplicaron estas sugerencias de `/review`:
    - `config:recommended` no fija por SHA una Action nueva añadida por tag (haría falta `helpers:pinGitHubActionDigests`).
    - `internalChecksFilter: "strict"` en Renovate.
  - La dimensión "3 últimas menores de Playwright" de §29 queda para cuando existan los adapters.
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código".
- **Siguiente paso:**
  1. Hacer commit de esta entrada en `ci/5-ci-pipeline`, en la línea de `docs(repo): add handoff entry for #4`. Quedó sin commitear porque el usuario no lo pidió. Si se cambia de rama antes, la entrada se mueve con el working tree.
  2. `/task 6` (v0-05-errors-result-failopen). Solo depende de v0-02 (Hecha), no de #5, y es el issue abierto más antiguo de `V0` después de #5. Su rama sale de `main`, que todavía no tiene `verify.yml`: hasta que se mergee el PR #22 no habrá CI en su PR; se verifica con `pnpm verify` en local, o rebaseando cuando #22 entre. Si #6 añade dependencias, `pnpm-lock.yaml` chocará con la actualización de #5; se regenera en la rama que se mergee después.
  3. A partir del 2026-10-14T14:08Z, en `ci/5-ci-pipeline`, con `nvm use`: `pnpm update --depth Infinity shell-quote source-map-js`. Comprobar en `pnpm-lock.yaml` que quedan `shell-quote@1.11.0` y `source-map-js@1.2.2` y que no cambió nada más. Después, `pnpm audit --audit-level high` y `pnpm verify`; commit `build(repo): bump shell-quote and source-map-js to patched versions`; pedir el push al usuario y confirmar que el PR #22 queda en verde. Hasta entonces, no mergear el PR #22.

### 2026-10-11 — #4 Seguimiento de tareas con GitHub Issues

- **Hecho:**
  - `main` local avanzado (fast-forward) a `origin/main` (`757ce22`, PR #3).
  - En GitHub: issue de seguimiento #4 (sin milestone ni `type:task`); milestone `V0`; etiquetas `phase:v0` y `type:task`; issues #5–#20 para v0-04 → v0-19 (v0-04 = #5 … v0-19 = #20), creados por `issue-writer` (lanzado como `general-purpose` con haiku porque el agente se creó en la sesión) y verificados con `gh`: sin duplicados, etiquetas y milestone correctos, dependencias de #5, #19 y #20 correctas, cuerpos de #6 y #15 idénticos a los criterios de sus archivos.
  - Rama `chore/4-issues-workflow`, commit `1daf6dc` `docs(repo): track tasks with GitHub Issues`: sección "Issues" en `08-git-workflow.md` (única fuente del formato), ramas `<tipo>/<n>-<nombre>`, `Closes #<n>` en la plantilla de PR, fila de idioma; `.claude/agents/issue-writer.md`; `/task`, `/handoff`, `/plan-phase`; `CLAUDE.md`; `12-ai-workflow.md` (tablas, comandos, diagrama, memoria, apartado `gh`); columna Issue en `docs/tasks/README.md`; línea de estado en `docs/progress.md`; `v0-19` ya no pide actualizar el README.
  - Verificado: `pnpm format:check` pasa; `/review` sin bloqueantes, los dos importantes corregidos (v0-19 obsoleto; `/task N` localiza el archivo por el prefijo `[vN-xx]` porque el enlace del issue da 404 hasta que el archivo llega a `main`).
  - Push hecho por el usuario; PR #21 abierto con `Closes #4`, sin mergear.
- **En curso:** nada. PR #21 pendiente de revisión y merge por una persona.
- **Decisiones:** todas las del plan aprobado quedaron escritas en `08-git-workflow.md`, `CLAUDE.md`, `12-ai-workflow.md` y los comandos.
- **Problemas:**
  - Permisos de `gh` incluidos en el PR #21.
  - La tabla de estados y la regla de siguiente tarea están repetidas en `08-git-workflow.md`, `docs/tasks/README.md`, `CLAUDE.md` y `12-ai-workflow.md` (pedido en el plan); pueden divergir.
  - `/audit` convierte hallazgos en tareas pero no crea sus issues.
  - `CLAUDE.md` sigue diciendo "El repositorio todavía no tiene código", ya falso.
  - `issue-writer` no aparece como tipo de subagente hasta reiniciar la sesión de Claude Code.
- **Siguiente paso:** cuando una persona mergee el PR #21, `/task 5` (v0-04, depende de v0-03 Hecha; es el issue abierto más antiguo de `V0`).

### 2026-10-09 — v0-01-monorepo-bootstrap

- **Hecho:** tarea v0-01 terminada en la rama `chore/root-monorepo-bootstrap` (sin push ni PR; `git push` está en `deny` en `.claude/settings.json`). Dos commits:
  - `a27d07b` `docs(adr): decide English for public documentation`: ADR-0020 (Aceptada) y actualizados `CLAUDE.md`, `08-git-workflow.md`, `23-risks-open-decisions.md` y el índice de ADRs.
  - `372b52e` `chore(root): bootstrap pnpm monorepo with turbo and changesets`: `package.json` (pnpm@12.10.1, Node `>=22`, solo el script `build`, devDeps exactas turbo 2.11.7 y @changesets/cli 3.0.3), `pnpm-workspace.yaml`, `turbo.json` (`build`/`typecheck`/`test`, `globalDependencies: ["tsconfig.base.json"]`), `tsconfig.base.json` (idéntico a 01-typescript.md), `.nvmrc`, `.editorconfig`, `.gitignore` (lo pedido más `.env`, `.env.*`, `*.log`, `.DS_Store`), `.changeset/`, `README.md` en inglés y `pnpm-lock.yaml`. Se borró `atium-docs.zip` (pedido por el usuario). v0-01 marcada Hecha en `docs/tasks/README.md`.
  - Verificado en una copia limpia: `pnpm install --frozen-lockfile` y `pnpm turbo run build typecheck test` terminan con código 0 sin paquetes; agregar esbuild falla con `ERR_PNPM_IGNORED_BUILDS`. `/review` sin bloqueantes. `/verify` no se ejecutó antes del commit porque `pnpm verify` no existe hasta v0-03.
- **En curso:** nada.
- **Decisiones:**
  - Documentación pública en inglés: ADR-0020. Queda abierto el idioma de `CONTRIBUTING.md`, plantillas de issues y código de conducta (`CLAUDE.md`, `23-risks-open-decisions.md`).
  - Últimas versiones estables de npm (decisión del usuario). pnpm 11 eliminó `onlyBuiltDependencies`; se usa `allowBuilds: {}` + `strictDepBuilds: true` en `pnpm-workspace.yaml`. Escrito en `06-security.md`, v0-01 y v0-16 (v0-16 ahora dice agregar `better-sqlite3: true` a `allowBuilds`).
  - Los paquetes de V0 nacen con `"private": true` mientras el nombre sea provisional: escrito en la tarea v0-02.
  - Sin documentar fuera de los archivos de config: la versión fijada de pnpm (12) no está en `17-tech-stack.md`; Changesets usa `access: "restricted"` y `privatePackages: { version: true, tag: false }`; el prefijo de rama `chore/` no figura en `08-git-workflow.md` (solo lista `feat/` y `fix/`).
- **Problemas:**
  - El pnpm global del usuario (10.28.2) no puede cambiar solo a pnpm 12 (`exec format error`: pnpm 12 se distribuye como binario nativo). Hasta instalar pnpm 12 (`npm i -g pnpm@12.10.1`), `pnpm install` falla; en esta sesión se usó `npx pnpm@12.10.1`.
  - Node local v23.1.0: `@changesets/cli` pide `^22.11 || ^24 || >=26` (solo advierte). Usar `nvm use` (`.nvmrc` = 22).
  - La entrada anterior dice que el commit `adbb0cd` se hizo en `master`; la rama real es `main` y existe `origin/main`.
  - El hook `format.mjs` llama a Prettier, que no está instalado hasta v0-03 (fail-open, no hace nada).
- **Siguiente paso:** el usuario decide cómo integrar `chore/root-monorepo-bootstrap` en `main` (push y PR o merge local); después, `/task docs/tasks/v0-02-core-skeleton.md`.

### 2026-10-09 — Decisiones abiertas de V0 (ADR-0017, 0018, 0019)

- **Hecho:** commit `adbb0cd` (`docs(adr): decide config loading, run file format, size limits and language`), solo documentación:
  - ADR-0017 (config con jiti), ADR-0018 (formato NDJSON de los archivos de run, límites del lector, topes del escritor y garantía final) y ADR-0019 (CLI, reglas, reportes y comentarios en PR en inglés), todos en estado Aceptada.
  - Actualizados `02-data-model.md` (§9.2, §9.3, §9.5), `17-tech-stack.md`, `23-risks-open-decisions.md`, `05-performance.md`, `08-git-workflow.md`, `CLAUDE.md` y las tareas v0-06, v0-12, v0-14 y v0-17. Las tres ya no tienen sección de decisiones abiertas.
- **En curso:** nada. No hay código; ninguna tarea cambió de estado.
- **Decisiones:**
  - Todas están escritas en los ADR 0017–0019. El detalle numérico (topes de listas y textos, regla de qué elementos se conservan, umbral de escritura de 768 KiB, pasos 1–5 de la garantía final y cálculo del peor caso, ≈ 620 KiB por línea y ≈ 54 KiB de encabezado) está en ADR-0018. Esos valores deben ir al `defaults.ts` de core cuando se implementen v0-06 y v0-14.
  - Los topes de texto se miden en bytes UTF-8 del valor ya escapado para JSON. Esto cambia la semántica de `truncateUtf8` en v0-06.
  - Decisión operativa sin documentar: el commit se hizo directamente en `master`, que es la única rama local y no tiene remoto.
- **Problemas:**
  - **Idioma de la documentación pública** (incluidas las páginas de cada regla): sigue abierto en `CLAUDE.md` y en `23-risks-open-decisions.md`.
  - **Posible inconsistencia en v0-14:** el criterio "escribir y leer un run construido con builders devuelve el mismo objeto" solo se cumple si los builders (v0-07) generan valores dentro de los topes y sin códigos ANSI. Si no, el escritor los altera. Conviene aclararlo al planificar v0-07 o v0-14.
  - **`04-collector.md` §12.1** dice que el fixture captura `ariaSnapshot` y lo envía por attachments, pero no dice que se guarde como archivo aparte (ADR-0018). No se actualizó; revisarlo al llegar a la fase del collector.
  - **Sugerencias sin escribir en ningún lado:**
    - El subagente `test-writer` tiene Edit y Write sin restricción de rutas; solo su prompt lo limita a archivos de test. Un hook podría hacerlo cumplir.
    - `explorer` (proyecto) y `Explore` (integrado) se confunden fácilmente al delegar.
- **Siguiente paso:** `/task docs/tasks/v0-01-monorepo-bootstrap.md`.

### 2026-10-08 — Cambio de codename a atium

- **Hecho:** codename cambiado de `nameless` a `atium` en toda la documentación, la configuración de `.claude/` y las tareas.
- **En curso:** nada.
- **Decisiones:** ADR-0016 reemplaza al ADR-0013. Las entradas anteriores de esta bitácora mantienen el nombre viejo.
- **Problemas:** siguen abiertas las decisiones de V0: c12 o jiti (v0-12), formato interno de los archivos de run (v0-14), idioma de los mensajes del CLI (v0-17).
- **Siguiente paso:** `/task docs/tasks/v0-01-monorepo-bootstrap.md`.
