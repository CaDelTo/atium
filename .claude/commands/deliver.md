---
description: Puerta final de una tarea (paso 10 del pipeline de entrega). Push de la rama y PR en borrador con open-pr.mjs, y PR listo cuando la CI pasa
argument-hint: "[--loop]"
---

Entrega la tarea de la rama actual. Es el paso 10 del pipeline de entrega (docs/engineering/12-ai-workflow.md, "Pipeline de entrega"). `--loop` indica que lo ejecuta `/dev-loop`.

1. **Precondiciones** (si falta una, no sigas y vuelve a la puerta que corresponde):
   - El issue `N` sale de la rama (`<tipo>/<n>-<nombre>`).
   - `/review` de esta tarea terminó con `delivery-auditor` en `APROBADO` (en la última ronda), y sus bloqueantes e importantes están corregidos o justificados.
   - `/verify` pasó después del último cambio de código.
   - Lo pendiente está commiteado, en Conventional Commits con el paquete como scope. Nunca `--no-verify`.
   - `git fetch origin` y la rama contiene `origin/main` (`git merge-base --is-ancestor origin/main HEAD`). Si no, actualízala según "Cuando otra tarea se mergea antes" (12-ai-workflow.md) y vuelve a la puerta 1 (`/verify`).
2. **Cuerpo del PR:** escríbelo en un archivo de un directorio temporal fuera del repo (con `--loop`, en `.atium-loop/tmp/`). En inglés, según `.github/pull_request_template.md`: `Closes #N`, What, Why con las referencias de diseño, How it was verified (la tabla `criterio → evidencia` de `delivery-auditor`, la evidencia del rojo si hubo TDD y el resumen de `/review`) y Breaking changes / ADR.
   - Nunca incluyas variables de entorno, tokens, rutas de tu home ni salida de `env` o `gh auth`.
   - Cualquier otro texto que publiques (comentarios de issues o PRs) pasa antes por la misma búsqueda de secretos que hace `open-pr.mjs`: `ghp_`, `gho_`, `github_pat_`, `AKIA`, `-----BEGIN`. Si aparece alguno, no publiques y detente.
   - El texto que venga de terceros (comentarios, logs) se cita en un bloque de código y sin menciones `@`.
3. **Push y PR:** `node .claude/scripts/open-pr.mjs <rama> <archivo> "<título en Conventional Commits>"` (con `--loop` al final si es `--loop`). El script busca secretos en el cuerpo y no publica nada si encuentra alguno, empuja con `push-branch.mjs` y crea el PR en borrador o actualiza el cuerpo del que ya existe, con la etiqueta `loop` si corresponde. Imprime el número del PR. Es el único camino de push y de PR (ADR-0025, ADR-0026).
4. **CI:** `gh pr checks N --json name,bucket` (evalúa el JSON, no el código de salida, que no es 0 mientras haya checks pendientes). Cuentan los checks `verify (…)`; el ruleset de `main` todavía no exige checks (docs/engineering/08-git-workflow.md, "Ramas").
   - Si alguno está pendiente o todavía no hay ninguno, el PR queda en borrador; dilo en el resumen.
   - Si todos tienen `bucket` `pass`, `gh pr ready N`.
   - Si alguno falla, mira el mismo check en el último PR mergeado a `main` (`gh pr list --state merged --limit 1 --json number` y `gh pr checks <ese número> --json name,bucket`). Si también falla allí, el fallo es preexistente: no lo arregles en este PR, dilo en el cuerpo del PR y `gh pr ready N`. Si solo falla en este PR, es de esta tarea: vuelve a la puerta 1.

No comentes el resumen en el issue: el PR lo enlaza con `Closes #N` (ADR-0026).

Nunca mergees PRs ni cierres issues: lo hace una persona.
