# Aceptación de V1

- ID: v1-42-v1-acceptance
- Fase: V1
- Paquete: todos
- Depende de: todas las anteriores (v1-01 a v1-41)

## Contexto

- Diseño: docs/design/22-roadmap.md §30, docs/design/01-requirements.md §7, docs/design/21-testing-strategy.md §29
- Estándares: docs/engineering/README.md (Definition of Done), 11-code-review.md

## Hacer

- Comprobar el criterio de aceptación de V1 (§30):
  - las reglas detectan el 100 % de los problemas sembrados en el demo;
  - el lint de 1,000 archivos está dentro del presupuesto;
  - las anotaciones se ven en un PR de GitHub.
- Probar a mano, en un repo temporal fuera del monorepo:
  - `eslint.config.js` con `atium.configs.recommended`, en ESLint y en el editor;
  - `atium lint` en los tres formatos;
  - `atium baseline`.
- Ejecutar `/audit` y convertir los hallazgos en tareas de V2, sin issue (los crea `/plan-phase v2`).

## Criterios de aceptación

- El test de integración de v1-38 pasa: recall del 100 % y ningún hallazgo inesperado sobre `examples/playwright-demo`.
- El benchmark de v1-40 cumple < 20 s en frío y < 3 s con caché.
- Enlace a un PR con las anotaciones visibles (v1-41).
- `/audit` sin hallazgos bloqueantes, y los demás convertidos en tareas.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Publicar los paquetes en npm.
