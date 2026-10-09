# Rendimiento

## Presupuestos

Los objetivos están en [01-requirements.md](../design/01-requirements.md). Se miden con benchmarks en `bench/` (Vitest bench) sobre suites sintéticas de 1,000 y 5,000 tests. CI compara contra la última medición de `main` y falla si un benchmark empeora más de 20%.

**Primero se mide, después se optimiza.** Ninguna optimización que complique el código entra sin un benchmark que la justifique.

## Datos grandes

- **Streaming:** archivos NDJSON y gzip se leen línea por línea con streams; nunca se carga el historial completo en memoria con `readFile`.
- **Límites de tamaño** ([ADR-0018](../adr/0018-formato-archivos-run.md)). Los textos se miden en bytes UTF-8 del valor ya escapado para JSON, y los códigos ANSI se eliminan al escribir.
  - Por resultado: 20 intentos, 50 tags, `titlePath` de 20 niveles y 200 pasos BDD (`text` 512 B, `definition` 256 B).
  - Por intento: mensajes de error 2 KB, stacks 8 KB, 5 muestras de consola de 1 KiB, 20 `pageErrors` de 2 KiB, 200 `NetworkCall` y 200 endpoints. `matcher.expected` y `matcher.actual`, 2 KiB cada uno.
  - Por run: 100 proyectos de 256 B.
  - Cualquier otro string: 2 KiB.
  - Líneas de los archivos de run: 768 KiB al escribir y 1 MiB al leer.
- **Estructuras indexadas:** búsquedas por `testId` o `fingerprint` con `Map`, no con `Array.find` dentro de bucles. Cualquier algoritmo O(n²) sobre tests × runs requiere justificación.
- **Agregados precalculados:** los analizadores trabajan sobre rollups y stats (diseño, sección 23) siempre que sea posible.

## SQLite

- Modo WAL.
- Inserciones en lote dentro de una transacción.
- Sentencias preparadas reutilizadas.
- Toda consulta frecuente usa un índice definido en el esquema; una consulta nueva sobre una tabla grande incluye su índice en la migración.

## Concurrencia

- Concurrencia limitada con `p-limit`: CPU = número de núcleos; I/O de red = 4 a 8.
- Nunca `Promise.all` sobre una lista de tamaño arbitrario sin límite.
- Trabajo intensivo de CPU en repos muy grandes (índice de la suite) puede moverse a worker threads más adelante, con benchmark que lo justifique.

## Reporter y fixture (camino caliente)

Se ejecutan dentro de la suite del usuario, así que cada milisegundo cuenta:

- Sin I/O síncrono por test.
- Sin cálculos pesados en `onTestEnd`: se acumula en memoria y se procesa en `onEnd`.
- Escucha de eventos con el mínimo trabajo por evento (contar y guardar lo esencial).

## Arranque del CLI

- `atium --help` en menos de 300 ms.
- Las dependencias pesadas (TypeScript, ESLint, AWS SDK, SQLite) se importan de forma diferida dentro del comando que las usa (`await import(...)`).
