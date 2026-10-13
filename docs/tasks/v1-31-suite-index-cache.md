# Caché del índice de la suite

- ID: v1-31-suite-index-cache
- Fase: V1
- Paquete: packages/suite-index
- Depende de: v1-30

## Contexto

- Diseño: docs/design/03-linter.md §11.4 (caché), docs/design/01-requirements.md §7 (< 3 s con caché), docs/design/15-storage.md (`.atium/`)
- ADRs: 0006
- Estándares: docs/engineering/05-performance.md, 06-security.md

## Hacer

- Guardar en `.atium/cache/` el `FileIndex` de cada archivo, indexado por el hash del contenido, el hash de la configuración de reglas y la versión del esquema de `FileIndex`.
- Al construir el índice, reutilizar las entradas válidas y extraer de nuevo solo los archivos que cambiaron.
- Una entrada corrupta o de otra versión se ignora y se regenera, con un aviso en `debug`. La caché nunca hace fallar el lint (fail-open).
- Escritura atómica, sin dejar archivos parciales.
- Documentar en §11.4 el formato de la caché y la estrategia de recálculo de las reglas cross-file.

## Decisiones abiertas en esta tarea

- §11.4 dice que las reglas cross-file "se recalculan solo para archivos afectados por un cambio en el índice", pero no da el algoritmo. Propuesta: caché por archivo del índice y recálculo completo de las reglas cross-file sobre el índice, que es barato. Hay que confirmarlo con el benchmark de v1-40.
- Si la caché tiene límite de tamaño o limpieza de entradas huérfanas.

## Criterios de aceptación

- Tests:
  - la segunda construcción sin cambios no vuelve a parsear ningún archivo (contador inyectado);
  - al cambiar un archivo, solo se vuelve a parsear ese;
  - al cambiar la configuración, se invalida todo;
  - una entrada corrupta se regenera sin error.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Caché de ESLint y benchmark (v1-40).
