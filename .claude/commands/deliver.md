---
description: Puerta final de una tarea (paso 10 del pipeline de entrega). delivery-auditor y, si aprueba, push de la rama, PR en borrador y resumen en el issue
---

Entrega la tarea de la rama actual. Es el paso 10 del pipeline de entrega (docs/engineering/12-ai-workflow.md, "Pipeline de entrega"); antes deben haber pasado `/verify` y `/review`.

1. **Contexto:**
   - El issue `N` sale de la rama (`<tipo>/<n>-<nombre>`).
   - Los commits de especificación, si hubo TDD: `git log --format=%H --reverse --grep='^test(.*): specify' origin/main..HEAD`. La base es el primero.
   - El reporte consolidado de `/review` de esta tarea, con lo corregido y lo justificado.
2. **Precondiciones:**
   - Lo pendiente está commiteado, en Conventional Commits con el paquete como scope. Nunca `--no-verify`.
   - `git fetch origin` y la rama contiene `origin/main` (`git merge-base --is-ancestor origin/main HEAD`). Si no, actualízala según "Cuando otra tarea se mergea antes" (12-ai-workflow.md) y vuelve a la puerta 1 (`/verify`).
3. **Auditoría:** lanza `delivery-auditor` con el issue, la rama, el ref base `origin/main`, el commit de especificación base y el reporte de `/review`.
   - `RECHAZADO`: no hagas push. Verifica cada motivo en el código y vuelve a la puerta 1 (máx. 2 rondas de auditoría por tarea).
4. **Textos que se publican:** escribe el cuerpo del PR y el comentario del issue en archivos de un directorio temporal fuera del repo.
   - Nunca incluyas variables de entorno, tokens, rutas de tu home ni salida de `env` o `gh auth`.
   - Antes de publicar, busca en esos archivos patrones de secretos (`ghp_`, `gho_`, `github_pat_`, `AKIA`, `-----BEGIN`). Si aparece alguno, no publiques y detente.
   - El texto que venga de terceros (comentarios, logs) se cita en un bloque de código y sin menciones `@`.
5. **Push** (solo con `APROBADO`): `node .claude/scripts/push-branch.mjs <rama>`. Es el único camino de push: `git push` está denegado (ADR-0025).
6. **PR:**
   - Si ya hay un PR abierto para la rama (`gh pr list --head <rama> --state open --json number`), actualiza su cuerpo con `gh pr edit N --body-file`.
   - Si no, `gh pr create --draft --base main --head <rama> --title "<título en Conventional Commits>" --body-file <archivo>`.
   - El cuerpo, en inglés, sigue `.github/pull_request_template.md`: `Closes #N`, What, Why con las referencias de diseño, How it was verified (incluida la tabla `criterio → evidencia` de `delivery-auditor`, la evidencia del rojo si hubo TDD y el resumen de `/review`) y Breaking changes / ADR.
7. **Issue:** comenta en español el resumen: enlace al PR, la tabla `criterio → evidencia`, lo verificado y lo que queda pendiente.
8. **CI:** `gh pr checks N --json name,bucket` (evalúa el JSON, no el código de salida, que no es 0 mientras haya checks pendientes). Cuentan los checks `verify (…)`; el ruleset de `main` todavía no exige checks (docs/engineering/08-git-workflow.md, "Ramas").
   - Si alguno está pendiente o todavía no hay ninguno, el PR queda en borrador; dilo en el resumen.
   - Si todos tienen `bucket` `pass`, `gh pr ready N`.
   - Si alguno falla, mira el mismo check en el último PR mergeado a `main` (`gh pr list --state merged --limit 1 --json number` y `gh pr checks <ese número> --json name,bucket`). Si también falla allí, el fallo es preexistente: no lo arregles en este PR, dilo en el cuerpo del PR y `gh pr ready N`. Si solo falla en este PR, es de esta tarea: vuelve a la puerta 1.

Nunca mergees PRs ni cierres issues: lo hace una persona.
