# Comando `doctor`

- ID: v0-18-doctor
- Fase: V0
- Paquete: packages/cli
- Depende de: v0-13, v0-16, v0-17

## Contexto

- Diseño: docs/design/18-cli-config.md §26.1, docs/design/24-adoption.md §32

## Hacer

- Verificaciones: versión de Node, configuración encontrada y válida, Git disponible, contexto de CI detectado (mostrarlo), `.atium/` con permisos de escritura, frameworks detectados.
- Salida en tabla legible y en `--format json`.
- Cada verificación fallida incluye un `hint`.

## Decisiones abiertas en esta tarea

El diseño no define el código de salida de `doctor` cuando una verificación falla. Propón uno en el plan, coherente con §26.2.

## Criterios de aceptación

- Tests en un repositorio temporal: todo correcto, configuración inválida, sin Git, directorio sin permisos.
- La salida JSON valida contra un esquema Zod.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Verificación de storage remoto (V4).
