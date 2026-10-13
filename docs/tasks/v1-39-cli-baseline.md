# Comando `atium baseline`

- ID: v1-39-cli-baseline
- Fase: V1
- Paquete: packages/cli
- Depende de: v1-38

## Contexto

- Diseño: docs/design/13-score-baseline-reports.md §21.3, docs/design/18-cli-config.md §26.1
- ADRs: 0006, 0012
- Estándares: docs/engineering/03-errors-logging.md, 06-security.md (escritura de archivos)

## Hacer

- Comando `atium baseline`:
  - ejecuta el mismo análisis que `atium lint`;
  - escribe `.atium/baseline.json` con `updateBaseline` (v1-28), de forma atómica;
  - informa cuántos Findings se añadieron y cuántos se eliminaron.
- No reemplaza un baseline inválido sin `--force` (error de uso). La forma sigue la de `init` en §26.1.
- Textos en `messages.ts`. Actualizar §26.1.

## Decisiones abiertas en esta tarea

- Si `atium baseline` sale con 0 aunque haya Findings: lo esperable, porque congelarlos es su propósito.
- Si `--force` es el nombre adecuado para reemplazar un baseline inválido.

## Criterios de aceptación

- Tests en un proyecto temporal:
  - crear un baseline;
  - volver a ejecutar sin cambios no modifica el archivo (mismos bytes);
  - corregir un problema lo elimina del baseline;
  - después de `atium baseline`, `atium lint` sale con 0.
- Test de que una escritura fallida no deja un baseline parcial.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- `gate` (V4).
