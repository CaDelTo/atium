# Imprecisiones del diseño de CI, storage y redacción

- ID: v1-63-design-imprecisions
- Fase: V1
- Paquete: docs/design, packages/core (storage, redact)
- Depende de: ninguna
- Origen: `design-auditor` en la revisión de #45 (v1-05)

## Contexto

- Diseño: docs/design/02-data-model.md §10 y §10.1, 15-storage.md §23.2.1, 20-security-privacy.md
- ADRs: 0018
- Estándares: docs/engineering/README.md (Definition of Done: diseño actualizado)

## Hacer

- **Solo diseño:**
  1. `02-data-model.md`, tabla de §10: la fila de Jenkins pone `GIT_BRANCH` / `CHANGE_BRANCH`, al revés que la precedencia de §10.1 y de `providers.ts` (`CHANGE_BRANCH` va antes). En la fila de GitHub la variable preferida va primero. Ordenar igual la de Jenkins.
  2. `15-storage.md` §23.2.1: "si después del paso 5 la línea sigue por encima" aparece justo después de una lista de 4 pasos de preparación. El paso 5 es el de la garantía final de ADR-0018. Aclarar a qué lista se refiere.
- **Diseño o código, según decida una persona:**
  3. Encabezado del run: el escritor no mide la línea 1 contra el límite de 64 KiB del lector (`runFileLines` en `run-file-writer.ts`). Las líneas de resultado sí tienen una garantía final que falla con un `Error` de bug. ADR-0018:130 calcula una cota de ≈ 54 KiB. Hay dos opciones: escribir en el diseño que la cota cubre el encabezado, o añadir la misma garantía.
  4. Claves de `statuses`: `cap-run.ts` las convierte con `Number(...)`, así que `"4e2"`, `" 404"` y `"0x190"` cuentan como status ≥ 400. Hay dos opciones: documentarlo o aceptar solo enteros decimales.
  5. Fronteras de `aws-key`: el lookbehind y el lookahead de `patterns.ts` usan `[A-Za-z0-9]`, más amplio que el alfabeto base32 del token. Un candidato pegado a una minúscula o a `0`, `1`, `8` o `9` no se redacta. 20-security-privacy.md habla de "su alfabeto". Hay dos opciones: escribir la frontera real en el diseño o ajustar el patrón.

## Decisiones abiertas en esta tarea

- Puntos 3 a 5: documentar el comportamiento actual o cambiar el código. Si se cambia el código, empezar por un test que lo fije. Si alguno contradice ADR-0018, proponer un ADR que lo reemplace.

## Criterios de aceptación

- El diseño describe lo que hace el código en cada punto, o el código cambia según lo decidido y el diseño lo refleja.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Los puntos ya resueltos en v1-05 (#45).
