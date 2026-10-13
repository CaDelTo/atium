# Regla E2E012: secretos en tests

- ID: v1-19-rule-e2e012-secrets
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-08

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E012)
- ADRs: 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar literales asignados a identificadores del tipo `password`, `token`, `secret` o `apiKey` (en variables, propiedades y argumentos) con entropía de Shannon ≥ 3.5 bits/char (§11.3, en `defaults.ts`).
- Detectar patrones conocidos (JWT y claves de nube), reutilizando los patrones de `core/redact` según las capas de v1-07.
- No detectar valores obviamente ficticios (`"password123"`, `"test"`).
- El mensaje nunca incluye el valor: solo el identificador y el tipo de patrón.
- Severidad, categoría y nombre en ESLint según el catálogo de v1-07; constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Decisiones abiertas en esta tarea

- La lista o el criterio de "valores obviamente ficticios" (§11.3 solo da dos ejemplos).
- La lista de identificadores, más allá de los cuatro de §11.3, y si se comparan por fragmento como en la redacción (§28.1).

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- Property-based de la función de entropía: está entre 0 y log2 del tamaño del alfabeto, y es 0 con un solo símbolo repetido.
- Test de que ni el mensaje ni los datos del reporte contienen el literal detectado.
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
