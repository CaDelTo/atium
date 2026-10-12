# Aceptación de V0

- ID: v0-19-v0-acceptance
- Fase: V0
- Paquete: packages/cli (tests de integración)
- Depende de: todas las anteriores

## Contexto

- Diseño: docs/design/22-roadmap.md §30 (criterio de V0)
- Agentes: docs/engineering/12-ai-workflow.md (auditoría al cerrar fase)

## Hacer

- Test de integración: para cada proveedor de CI (variables simuladas) y para local, construir un run con builders y `detectRunContext`, guardarlo en SQLite y en archivo de run, leerlo de vuelta y compararlo.
- Ejecutar `/audit` y convertir los hallazgos en tareas nuevas.
- Comprobar en GitHub que los issues de las tareas anteriores de V0 están cerrados.

## Criterios de aceptación

- El test de integración pasa en los 6 entornos de CI.
- `/audit` sin hallazgos bloqueantes abiertos.
- Cobertura sobre los umbrales en todos los paquetes.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Cualquier funcionalidad de V1.
