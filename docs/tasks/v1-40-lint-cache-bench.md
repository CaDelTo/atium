# Caché de ESLint y benchmark de 1,000 archivos

- ID: v1-40-lint-cache-bench
- Fase: V1
- Paquete: packages/cli y benchmarks
- Depende de: v1-31, v1-38

## Contexto

- Diseño: docs/design/01-requirements.md §7 (lint de 1,000 archivos: < 20 s en frío, < 3 s con caché), docs/design/03-linter.md §11.4, docs/design/21-testing-strategy.md §29 (rendimiento)
- ADRs: 0006
- Estándares: docs/engineering/05-performance.md, 10-tooling.md (`pnpm bench`)

## Hacer

- Activar la caché de ESLint en `.atium/cache/`, junto a la del índice (v1-31), invalidada por el contenido y la configuración.
- Generador determinista (con semilla) de una suite sintética de 1,000 archivos de test de Playwright, con tamaños y problemas variados. Se genera en un directorio temporal y no se versiona.
- Benchmark de `atium lint` en frío y con caché, integrado en `pnpm bench`.
- Optimizar lo necesario para cumplir los presupuestos y documentar los resultados.

## Criterios de aceptación

- El benchmark mide < 20 s en frío y < 3 s con caché sobre los 1,000 archivos, en la máquina de CI de Linux. Si no se cumple, se para la tarea y se explica por qué.
- Test de que con la caché activa los Findings son idénticos a los de sin caché.
- `perf-benchmarker` sin regresiones frente a `main` en el arranque del CLI.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Benchmarks de V2 (reporter y fixture).
