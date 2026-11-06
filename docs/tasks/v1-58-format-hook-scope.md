# Hook de formato solo dentro del proyecto

- ID: v1-58-format-hook-scope
- Fase: V1
- Paquete: .claude/hooks
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 13

## Contexto

Diseño: docs/engineering/12-ai-workflow.md (sección Hooks)
ADRs: ninguno
Estándares: docs/engineering/10-tooling.md

- Los permisos prohíben al agente editar `.claude/hooks/`: esta tarea la implementa una persona, o una sesión con permiso explícito para esos archivos.
- `format.mjs` (`:21-25`) ejecuta `prettier --write` sobre cualquier `file_path` editado, también fuera del repo (otro repo, notas del usuario), con la configuración de Prettier de Atium.
- No pone `--` antes del archivo, así que una ruta que empieza por `-` se lee como opción.

## Hacer

- Saltar los archivos cuya ruta relativa al proyecto empieza por `..` o es absoluta en otra unidad.
- Agregar `--` antes de la ruta.
- Test del hook con una ruta dentro y otra fuera del proyecto, ejecutado desde `pnpm test:claude`.

## Criterios de aceptación

- Editar un archivo fuera del proyecto no lo formatea.
- Editar un archivo dentro del proyecto lo sigue formateando.
- `pnpm test:claude` ejecuta el test del hook.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Cambiar la configuración de Prettier.
