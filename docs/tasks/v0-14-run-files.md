# Archivos de run (`.ndjson.gz`)

- ID: v0-14-run-files
- Fase: V0
- Paquete: packages/core/src/storage
- Depende de: v0-13

## Contexto

- Diseño: docs/design/15-storage.md §23.2, docs/design/02-data-model.md §9.2, §9.5
- ADRs: 0007, 0018
- Estándares: 05-performance.md (streaming), 06-security.md (límites de tamaño), 07-public-api.md (el esquema de archivos de run es público)

## Hacer

- Formato de ADR-0018: línea 1 = encabezado del run sin `results`; una línea por `TestResult` a continuación.
- Escritura de un `Run` en `.atium/runs/<runId>.ndjson.gz`, de forma atómica (archivo temporal + rename).
- Antes de validar y serializar, el escritor elimina los códigos ANSI de `message`, `stack`, las muestras de consola y `pageErrors`, y aplica los topes de listas y textos de ADR-0018. Los textos se miden en bytes UTF-8 del valor ya escapado para JSON. Conserva los elementos según las reglas del ADR (las llamadas pendientes en el momento del fallo se conservan siempre) y rellena los conteos `*Dropped`.
- Garantía final de ADR-0018: si la línea serializada supera 768 KiB, el escritor recorta en el orden del ADR (intentos intermedios, `calls`, muestras de consola y `pageErrors`, ventana de pasos BDD, campos mínimos) hasta quedar debajo y marca `detailTruncated: true`.
- Lectura en streaming, validando cada línea con Zod.
- Límites del lector medidos sobre bytes descomprimidos y comprobados antes de parsear cada línea: encabezado 64 KiB, línea de `TestResult` 1 MiB, total 256 MiB. Los valores viven en el `defaults.ts` de core.
- Lectores que aceptan `schemaVersion` actual y anterior (hoy solo existe la 1).

## Criterios de aceptación

- Escribir y leer un run construido con builders devuelve el mismo objeto.
- Un archivo con una línea inválida produce un error con el número de línea.
- Un archivo que supera cualquiera de los tres límites se rechaza sin cargarse completo en memoria, con un error que indica el límite y el número de línea.
- Un run con más elementos que un tope se escribe con el tope y el conteo de descartados correcto. Tests property-based comprueban que los conservados son los más cercanos al fallo y mantienen su orden original.
- Un run escrito vuelve a leerse sin errores.
- Las llamadas de red pendientes en el momento del fallo se conservan aunque haya llamadas más cercanas a `failedAtMs`.
- Un `TestResult` con 10 intentos fallidos y cada campo de `Attempt` al máximo de su tope, con strings que incluyen caracteres de control y caracteres multibyte justo en el límite, se escribe en una línea de menos de 768 KiB, con `detailTruncated: true`, y se lee sin error.
- Un `TestResult` con todos los campos al máximo (más de 20 intentos, más de 200 pasos BDD, más de 50 tags y `titlePath` de más de 20 niveles) se escribe por debajo de 768 KiB y se lee sin error.
- Con más de 20 intentos se conservan el primero y los 19 últimos, con su `index` original y `attemptsDropped`.
- El `testId` no cambia cuando se truncan `titlePath` u otros campos.
- Los textos guardados no contienen códigos ANSI.
- El paso de pasos BDD de la garantía final conserva el paso de referencia y hasta 10 antes y 10 después.
- Un `TestResult` que no supera 768 KiB se escribe sin `detailTruncated`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Layout remoto y compactación (V4).
