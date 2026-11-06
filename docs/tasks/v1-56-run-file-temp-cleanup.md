# Temporales huérfanos en .atium/runs

- ID: v1-56-run-file-temp-cleanup
- Fase: V1
- Paquete: packages/core (storage)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 11

## Contexto

Diseño: docs/design/15-storage.md
ADRs: 0018 (formato de los archivos de run)
Estándares: docs/engineering/06-security.md

- `writeRunFile` escribe en un directorio `.tmp-*` creado con `mkdtemp` (`run-file-writer.ts:111`) y lo borra en el `finally`.
- Si el proceso muere a mitad de la escritura (por ejemplo, SIGKILL al cancelar un job de CI), el archivo parcial (hasta 256 MiB) queda en `.atium/runs/.tmp-*` para siempre, y se sube o cachea junto con la carpeta.

## Hacer

- Al empezar una escritura, borrar los directorios `.tmp-*` de `.atium/runs/` más antiguos que un umbral, ignorando errores (best-effort, con aviso en el logger).
- Poner el umbral en `defaults.ts` y en el diseño.

## Decisiones abiertas en esta tarea

- El umbral de antigüedad: el diseño no lo define (propuesta: 1 hora).

## Criterios de aceptación

- Un `.tmp-*` más antiguo que el umbral se borra en la siguiente escritura.
- Un `.tmp-*` reciente (de otra escritura en curso) no se toca.
- Un fallo al borrar no impide escribir el archivo de run.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Cambiar el mecanismo de publicación (`rename`).
