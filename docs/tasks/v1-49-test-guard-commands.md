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
- Los patrones de `PATTERNS` se aplican al texto crudo, así que cuentan lo que hay dentro de strings, template literals, regex y comentarios:
  - un caso de `RuleTester` como `'test.only("t", () => {})'` cuenta como un `.only(` añadido, y bloquea escribir los tests de cada regla de `packages/eslint-plugin/src/rules/` (pasó dos veces en #51);
  - `/^E2E\d{3}$/u.test(code)` cuenta como un caso de test (`.test(`), así que quitarlo parece borrar un test.
- Edit compara solo `old_string` y `new_string`: un fragmento que empieza dentro de un template literal de varias líneas no se puede interpretar bien.
- Ningún test cubre el hook.

## Hacer

- Buscar el comando solo donde empieza un comando (`(^|[;&|]\s*)`), después de quitar el texto entre comillas.
- Reconocer `test` y `test-contracts` sin `/` final, `git checkout|restore` sobre tests, `find … -delete` y redirecciones que vacían un test.
- Contar `expect.<modificador>(` (`expect.soft(`, `expect.poll(`) como assertion; los matchers asimétricos como `expect.any(` no cuentan.
- Contar solo código: antes de aplicar `PATTERNS`, un escáner lineal sin dependencias reemplaza por espacios los comentarios y el contenido de strings, template literals (los `${…}` siguen siendo código) y regex. Strings y regex terminan en el fin de línea.
- No contar como caso de test una llamada a método (`x.test(`, `x.it(`).
- En Edit y MultiEdit, comparar el archivo completo antes y después de aplicar los reemplazos; si el archivo no existe o no contiene `old_string`, comparar los fragmentos.
- Agregar `.claude/hooks/test-guard.test.mjs` con los casos de este archivo y ejecutarlo desde `pnpm test:claude`.

## Criterios de aceptación

- Los cuatro comandos de borrado de la sección Contexto quedan bloqueados.
- Los dos comandos que solo mencionan tests en texto se permiten.
- El cambio a `expect.poll` se permite.
- Escribir un test de `RuleTester` con `.only(` y `.skip(` dentro de strings o template literals se permite, también con un Edit dentro de un template literal de varias líneas.
- Quitar `/^E2E\d{3}$/u.test(code)` de un test se permite.
- Añadir `.only(` o `.skip(` en código, o quitar un `it(` o un `expect(`, sigue bloqueado; comentar un test cuenta como quitarlo.
- `pnpm test:claude` ejecuta los tests del hook.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Detectar assertions relajadas (`toBe` → `toBeDefined`), que sigue revisando `code-reviewer`.
- Comparar el árbol de trabajo con `HEAD` después de cada comando.
