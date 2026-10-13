# Comando `atium lint` (reglas por archivo)

- ID: v1-37-cli-lint
- Fase: V1
- Paquete: packages/cli
- Depende de: v1-20, v1-22, v1-25, v1-26, v1-27, v1-29

## Contexto

- Diseño: docs/design/18-cli-config.md §26.1 y §26.2, docs/design/03-linter.md §11.1, §11.5 y §11.6
- ADRs: 0005, 0006, 0012, 0019 y 0023 (cómo funciona `atium lint`)
- Estándares: docs/engineering/02-code-design.md, 03-errors-logging.md, 05-performance.md (arranque del CLI), 06-security.md

## Hacer

- Definición ligera de `lint` en `src/commands/`. La implementación, ESLint y los reporters se importan de forma diferida.
- Ejecutar ESLint con su API de Node sobre los archivos y la config que decidió ADR-0023 (03-linter.md §11.10).
- Sección `lint` (`include`, `exclude`) en el esquema de config de `@atium/core`, con sus defaults (18-cli-config.md §26.3), y argumentos `atium lint [paths...]`.
- **Convertir cada mensaje de ESLint de una regla de Atium en un Finding:**
  - `titlePath` y código del nodo con `extractFileIndex` (v1-29) y el rango del mensaje;
  - fingerprint con `lintFingerprint` (v1-22);
  - `location` POSIX relativa;
  - severidad, categoría, confianza y fuente del catálogo (03-linter.md §11.8), y `docsUrl` con `ruleDocsUrl(code)`.
  - Los mensajes de reglas externas equivalentes se convierten con la tabla de equivalencias de v1-20; los de las demás reglas se ignoran; los errores de parseo se avisan por stderr y no son Findings (ADR-0023).
- **Config de ESLint (03-linter.md §11.10):**
  - la del usuario si ESLint encuentra un `eslint.config.*`;
  - si no, el preset interno `recommended` con `overrideConfigFile`, y un aviso por stderr;
  - un aviso por stderr si la config no activa ninguna regla de Atium;
  - los `ignores` de ESLint se aplican además de `lint.exclude`.
- Construir el reporte (v1-24) y escribirlo:
  - `--format` (`console` por defecto, `json`, `sarif`; otro valor es un error de uso);
  - `--output`, que escribe en un archivo en lugar de stdout.
- Código de salida según ADR-0023, y fail-open ante errores internos (§26.2). Actualizar la descripción de `gateFailed` en `packages/cli/src/exit-codes.ts`, que solo menciona `atium gate`.
- Textos en `messages.ts` y valores en `defaults.ts`. Actualizar §26.1 con el comando.

## Criterios de aceptación

- Tests en un proyecto temporal:
  - sin hallazgos;
  - con hallazgos en cada formato, con la salida comparada con golden files;
  - `--output` a un archivo;
  - `--format` inválido (código 2);
  - un archivo con error de sintaxis.
- Test de que `atium --help` no carga ESLint ni los reporters (como el de v0-17).
- Test de fail-open: un error interno simulado sale con 0 y aviso, o con 3 si se usa `--strict`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Reglas cross-file y baseline (v1-38).
- Caché de ESLint (v1-40).
