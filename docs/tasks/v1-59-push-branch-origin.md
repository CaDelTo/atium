# push-branch sin remoto origin

- ID: v1-59-push-branch-origin
- Fase: V1
- Paquete: .claude/scripts
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 14

## Contexto

Diseño: docs/engineering/12-ai-workflow.md
ADRs: ninguno
Estándares: docs/engineering/10-tooling.md

- `push-branch.mjs` (`:91-93`) ejecuta `git remote get-url --push origin` fuera de un `try`.
- Sin remoto `origin`, Node imprime un stack trace y sale con 1. Todos los demás fallos del script salen con 2 y un mensaje claro.

## Hacer

- Envolver la lectura del remoto en un `try` y, si falla, imprimir que `origin` no está configurado y salir con 2.
- Test en `push-branch.test.mjs` para ese caso.

## Criterios de aceptación

- Sin remoto `origin`, el script imprime un mensaje claro y sale con 2.
- `pnpm test:claude` pasa con el test nuevo.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Remotos distintos de `origin`.
