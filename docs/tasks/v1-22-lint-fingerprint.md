# Fingerprint de hallazgos de lint

- ID: v1-22-lint-fingerprint
- Fase: V1
- Paquete: packages/core/src/findings
- Depende de: v1-07

## Contexto

- Diseño: docs/design/03-linter.md §11.5, docs/design/14-architecture.md §22.3, docs/design/02-data-model.md §9.3
- ADRs: 0004, 0005
- Estándares: docs/engineering/01-typescript.md, 04-testing.md, 07-public-api.md

## Hacer

- `lintFingerprint({ ruleId, file, titlePath, nodeCode, occurrence })`. Es pura y usa `fingerprintOf` con las partes de §11.5:
  - el `titlePath` se une con `" › "`;
  - la ocurrencia se pasa como `String(n)`;
  - no usa el número de línea.
- Normalización del código del nodo (`normalizeNodeCode`).
- Asignación del índice de ocurrencia a una lista de hallazgos: dos hallazgos idénticos en el mismo test reciben 0, 1, … en orden de posición.
- Documentar en §11.5 la normalización y el `titlePath` de un hallazgo fuera de un test.

## Decisiones abiertas en esta tarea

- Qué normaliza `normalizeNodeCode`: espacios, saltos de línea `\r\n`, comentarios, comillas.
- Qué `titlePath` lleva un hallazgo que no está dentro de un test (un Page Object o el nivel de módulo): lista vacía u otra marca.

## Criterios de aceptación

- Property-based:
  - el fingerprint no cambia si se insertan líneas antes del nodo ni si cambian los espacios del nodo;
  - cambia si cambia cualquier otra parte.
- Test de dos hallazgos idénticos en el mismo test, con fingerprints distintos y estables.
- Test de que `\r\n` y `\n` dan el mismo fingerprint.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Sacar el `titlePath` y el código del nodo de un mensaje de ESLint (v1-37).
- Baseline (v1-28).
