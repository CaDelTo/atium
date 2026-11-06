# test-guard: comandos que borran tests y falsos positivos

- ID: v1-49-test-guard-commands
- Fase: V1
- Paquete: .claude/hooks
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 4

## Contexto

Diseño: docs/engineering/12-ai-workflow.md (sección Hooks)
ADRs: ninguno
Estándares: docs/engineering/04-testing.md

- Los permisos prohíben al agente editar `.claude/hooks/`: esta tarea la implementa una persona, o una sesión con permiso explícito para esos archivos.
- `DELETE_COMMAND` (`test-guard.mjs:30-31`) exige una `/` final en `/test/` y solo reconoce `rm`, `unlink`, `mv`, `git rm` y `git mv`. Se permiten sin aviso:
  - `rm -rf packages/core/test`
  - `git checkout -- packages/core/src/a.test.ts`
  - `find packages -name "*.test.ts" -delete`
  - `: > packages/core/src/a.test.ts`
- El patrón busca en todo el texto del comando, así que bloquea `git commit -m 'explain mv old.test.ts'` y `grep -rn 'rm foo.test.ts' docs`.
- `assertions` no cuenta `expect.poll(`, así que pasar de `expect(a).toBe(1)` a `await expect.poll(() => a).toBe(1)` se bloquea.
- Ningún test cubre el hook.

## Hacer

- Buscar el comando solo donde empieza un comando (`(^|[;&|]\s*)`), después de quitar el texto entre comillas.
- Reconocer `test` y `test-contracts` sin `/` final, `git checkout|restore` sobre tests, `find … -delete` y redirecciones que vacían un test.
- Contar `expect.<modificador>(` como assertion.
- Agregar `.claude/hooks/test-guard.test.mjs` con los casos de este archivo y ejecutarlo desde `pnpm test:claude`.

## Criterios de aceptación

- Los cuatro comandos de borrado de la sección Contexto quedan bloqueados.
- Los dos comandos que solo mencionan tests en texto se permiten.
- El cambio a `expect.poll` se permite.
- `pnpm test:claude` ejecuta los tests del hook.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Detectar assertions relajadas (`toBe` → `toBeDefined`), que sigue revisando `code-reviewer`.
- Comparar el árbol de trabajo con `HEAD` después de cada comando.
