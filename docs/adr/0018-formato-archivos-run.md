# ADR-0018: Formato NDJSON de los archivos de run y límites de tamaño

- Estado: Aceptada
- Fecha: 2026-10-09
- Diseño relacionado: 15-storage.md (23.2), 02-data-model.md (9.2, 9.3, 9.5)

## Contexto

Cada job escribe su run en un archivo inmutable `<runId>.ndjson.gz` (ADR-0007, diseño 23.2), pero el diseño no define qué va en cada línea. El esquema de estos archivos es una API pública (07-public-api.md).

Los archivos se leen en streaming (05-performance.md) y pueden venir de un bucket compartido o de otros jobs, así que se tratan como entrada no confiable: hay que limitar su tamaño antes de procesarlos (06-security.md) y protegerse de archivos maliciosos, como un gzip bomb.

Referencia de volumen: un run de 5.000 tests sin fallos ocupa ≈ 1 MB comprimido (23.4). Suponiendo una compresión de gzip de ≈ 8:1 para JSON, son ≈ 8 MB descomprimidos, unos 1,6 KB por test.

## Decisión

### Formato

- Archivo gzip con NDJSON en UTF-8: un objeto JSON por línea, separado por `\n`.
- Línea 1: encabezado del run, que es el `Run` sin `results`. Incluye `schemaVersion`.
- Líneas siguientes: un `TestResult` por línea, en el orden de `results`. Un run sin resultados tiene solo el encabezado.
- El lector lee `schemaVersion` del encabezado antes que cualquier resultado y acepta la versión actual y la anterior (ADR-0003).
- Escritura atómica: archivo temporal + rename.

### Límites del lector

Son una red de seguridad: se miden sobre los bytes descomprimidos y se comprueban durante el streaming, antes de parsear la línea.

| Límite | Valor |
|---|---|
| Encabezado (línea 1) | 64 KiB |
| Cada línea de `TestResult` | 1 MiB |
| Total descomprimido | 256 MiB |

Un archivo que supera un límite se rechaza sin cargarlo completo en memoria, con un `AtiumError` que indica el límite superado y el número de línea. Una línea que no pasa la validación de Zod también produce un error con su número de línea.

### Escritor: preparación

El escritor nunca debe producir una línea que el lector rechace. Antes de validar y serializar:

1. El `testId` ya está calculado sobre los valores originales (02-data-model.md §9.3), antes de cualquier recorte. La identidad del test no cambia por los topes.
2. Elimina los códigos de escape ANSI de `message`, `stack`, las muestras de consola y `pageErrors`; se guarda texto plano.
3. Aplica los topes de listas y de textos.

### Topes de listas

| Lista | Tope | Qué se conserva | Conteo de descartados |
|---|---|---|---|
| `TestResult.attempts` | 20 | El primero y los 19 últimos | `TestResult.attemptsDropped` |
| `TestCase.tags` | 50 | Los 50 primeros | — |
| `TestCase.titlePath` | 20 niveles | El primero y los 19 últimos | — |
| `Run.frameworkConfig.projects` | 100 | Los 100 primeros | — |
| `NetworkSummary.calls` por intento | 200 | Ver abajo | `NetworkSummary.callsDropped` |
| `NetworkSummary.endpoints` por intento | 200 | Ver abajo | `NetworkSummary.endpointsDropped` |
| `Attempt.pageErrors` por intento | 20 | Los 20 últimos | `Attempt.pageErrorsDropped` |
| `Attempt.console.samples` por intento | 5 (05-performance.md) | — | — |
| `BddContext.steps` por resultado | 200 | Ver abajo | `BddContext.stepsDropped` |

- Los conteos `*Dropped` son enteros positivos y se omiten cuando valen 0. Solo cuentan lo que descartan estos topes; los recortes de la garantía final se señalan con `detailTruncated`.
- Los elementos conservados mantienen su orden original. Los intentos conservan su `index` original, así que el hueco queda visible.
- **`NetworkCall`:** el punto de referencia es `error.failedAtMs` del intento o, si el intento no tiene error, su final (`durationMs`).
  - Se conservan siempre las llamadas pendientes en la referencia: las que empezaron en la referencia o antes y no habían terminado (`durationMs` ausente o `startedAtMs + durationMs > referencia`).
  - El resto del tope se completa con las llamadas de menor `|startedAtMs − referencia|`. En caso de empate gana la anterior a la referencia y después la de menor índice original.
  - Si las pendientes superan el tope, se conservan las 200 pendientes más cercanas a la referencia, con el mismo desempate.
- **Endpoints:** no tienen marca de tiempo. Primero se conservan los que tienen fallos (`failures > 0` o algún status ≥ 400), después los de mayor `count`. En caso de empate gana el de menor índice original.
- **`pageErrors`:** no tienen marca de tiempo y están en orden cronológico. Un intento fallido termina en el fallo, así que se conservan los 20 últimos.
- **Pasos BDD:** el paso de referencia es el primer paso con estado distinto de `passed` y `skipped` o, si no hay ninguno, el último paso. Se conservan los 200 pasos con menor distancia de índice a la referencia. En caso de empate gana el de menor índice.

### Topes de textos

Todos los topes de texto se miden en bytes UTF-8 del valor ya escapado para JSON, sin las comillas que lo delimitan, y no sobre el texto original. El truncado no corta caracteres multibyte, pares sustitutos ni secuencias de escape.

| Texto | Tope |
|---|---|
| `ErrorOccurrence.message` | 2 KB (02-data-model.md §9.2) |
| `ErrorOccurrence.stack` | 8 KB (02-data-model.md §9.2) |
| Cada `pageErrors[i]` | 2 KiB |
| Cada muestra de consola | 1 KiB |
| `matcher.expected` y `matcher.actual` | 2 KiB cada uno |
| `text` de cada paso BDD | 512 B |
| `definition` de cada paso BDD | 256 B |
| Cada nombre de `frameworkConfig.projects` | 256 B |
| Cualquier otro string sin tope propio | 2 KiB |

El esquema Zod valida la longitud máxima de cada lista y de cada texto, con la misma medida.

### Garantía final del escritor

Después de aplicar los topes, el escritor mide en bytes UTF-8 la línea serializada de cada `TestResult`. Si supera 768 KiB (25 % de margen bajo el límite del lector), recorta en este orden. Vuelve a medir tras cada paso y se detiene en cuanto queda por debajo:

1. Intentos intermedios (ni el primero ni el último de los conservados): se dejan solo `index`, `status`, `startedAt`, `durationMs` y `error` sin `stack`.
2. `network.calls` (con `callsDropped`) de todos los intentos. Se conservan los `endpoints`.
3. `console.samples` (se conservan los contadores `errors` y `warnings`) y `pageErrors` (con `pageErrorsDropped`) de todos los intentos.
4. Pasos BDD: se conserva el paso de referencia (el mismo criterio que en el tope) y hasta 10 pasos antes y 10 después.
5. Todos los intentos se reducen a los campos mínimos: los mismos del paso 1.

Si se aplica cualquiera de los pasos, el `TestResult` lleva `detailTruncated: true`. Si no, el campo se omite.

### Artefactos

`artifacts.ariaSnapshot` se guarda como archivo aparte, igual que `trace` y `screenshots`. En el modelo va su ruta, nunca su contenido.

### Valores

Los límites del lector, los topes del escritor, el umbral de 768 KiB y la ventana de 10 pasos viven en el `defaults.ts` de `@atium/core`, con referencia a este ADR.

### Cambios en el modelo

Este ADR agrega al esquema de 02-data-model.md §9.2:

- los campos `attemptsDropped`, `callsDropped`, `endpointsDropped`, `pageErrorsDropped`, `stepsDropped` y `TestResult.detailTruncated`;
- las longitudes máximas de listas y de textos.

`schemaVersion` sigue en `1` porque todavía no se ha publicado ninguna versión.

## Consecuencias

- Lectura en streaming línea a línea; una línea inválida se localiza por su número.
- `TestResult` es la unidad que usan los analizadores, así que cada línea se puede procesar de forma independiente.
- En la práctica un intento fallido ocupa decenas de KB. Los topes por campo permiten casos mucho mayores, como 200 llamadas con todos sus textos al máximo; para esos casos existe la garantía final.
- **Después del paso 5, una línea ocupa como máximo ≈ 620 KiB, así que la garantía siempre se cumple.** Como los topes se miden sobre el valor escapado, la suma es exacta salvo la estructura del JSON:

  | Parte | Tamaño máximo |
  |---|---|
  | 20 intentos mínimos (≈ 18 KiB cada uno: `startedAt` y ocho strings del error) | ≈ 364 KiB |
  | `TestCase` (50 tags y 20 niveles de 2 KiB, más `testId`, `project` y `file`) | ≈ 146 KiB |
  | `BddContext` con 21 pasos | ≈ 106 KiB |

  Las listas sin tope propio (`screenshots`, las claves de `statuses`) desaparecen en el paso 5. Agregar un campo al modelo obliga a revisar este cálculo.
- **El encabezado ocupa como máximo ≈ 54 KiB, por debajo de 64 KiB:** 14 strings de 2 KiB más 100 nombres de proyecto de 256 B.
- La garantía final recorta primero lo menos útil para el triage y conserva hasta el final el error del primer y del último intento, los `endpoints` y el paso BDD que falló.
- El texto guardado no tiene colores ANSI. Los reportes que quieran colores los vuelven a aplicar.
- 256 MiB admite del orden de 150.000 tests sin fallos en un solo archivo. Un run legítimo más grande debe dividirse en shards.
- Si un consumidor materializa el `Run` completo, el límite total también acota su memoria.
- Se pierde el detalle más allá de los topes. Los conteos `*Dropped` y `detailTruncated` dejan constancia de que se truncó; `tags`, `titlePath` y `projects` se truncan sin conteo.

## Alternativas descartadas

- Un solo documento JSON con el `Run` completo: no se puede leer en streaming y no permite limitar el tamaño por línea.
- Una línea por `Attempt`: hay que reagrupar los intentos para reconstruir cada `TestResult`, y el `outcome` queda separado de sus intentos.
- Manifiesto y resultados en archivos separados: rompe la unidad de un archivo inmutable por job (ADR-0007).
- Descartar el `TestResult` completo cuando la línea es demasiado grande: pierde un resultado y corrompe el historial y la evidencia de flakiness. Es mejor truncar listas concretas y dejar constancia.
- Fallar la escritura si una línea es demasiado grande: el reporter es fail-open (ADR-0006) y se perdería el run completo.
- Medir los topes sobre el texto original: un carácter de control ocupa hasta 6 bytes escapado, así que el tamaño de la línea no quedaría acotado.
- Límites configurables por el usuario: son una red de seguridad, no una preferencia, y en V0 no hay un caso que lo justifique.
