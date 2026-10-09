# ADR-0005: Linter como plugin de ESLint más índice cross-file en el CLI

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 03-linter.md

## Contexto

Ya existen `eslint-plugin-playwright` y `eslint-plugin-cypress`. El valor del linter está en actuar mientras el QA escribe, y en reglas que necesitan ver toda la suite.

## Decisión

- Reglas por archivo en `@atium/eslint-plugin`, compatible con ESLint 9 (flat config).
- Presets `recommended` y `strict` que incluyen reglas relevantes de los plugins existentes y desactivan las propias que se solapan.
- Reglas cross-file en el CLI, sobre un índice de la suite construido con typescript-eslint y el project service de TypeScript.
- Fingerprint de hallazgos sin número de línea.

## Consecuencias

- Funciona en el editor y en cualquier CI que ya use ESLint, sin extensión propia.
- Sin soporte para `.eslintrc` legacy.

## Alternativas descartadas

- Motor AST propio: duplica trabajo y pierde la integración con editores.
