# Errores, `Result` y `failOpen`

- ID: v0-05-errors-result-failopen
- Fase: V0
- Paquete: packages/core
- Depende de: v0-02

## Contexto

- Estándares: docs/engineering/03-errors-logging.md
- ADRs: 0006

## Hacer

- `ERROR_CODES`, `ErrorCode` y `AtiumError` con `code`, `hint` y `cause`.
- Tipo `Result` y helpers `ok` / `err`.
- Interfaz `Logger` (solo la interfaz; la implementación es v0-11).
- Helper `failOpen` con objeto de opciones, como en 03-errors-logging.md.
- Exportar todo desde `src/index.ts` con TSDoc.

## Criterios de aceptación

- Tests: `cause` se conserva al envolver; `failOpen` devuelve el fallback, registra un aviso con el error y no relanza; si la función funciona, devuelve su valor y no registra nada.
- Test con un logger falso que verifica el contenido del aviso.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Implementación del logger y redacción (v0-10, v0-11).
