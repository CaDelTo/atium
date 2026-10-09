# ADR-0010: El gate lo decide Atium; cuarentena versionada en el repo

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 07-flaky.md (15.7), 19-ci-cd.md

## Contexto

La cuarentena de tests flaky necesita que el test se siga ejecutando para saber cuándo se estabiliza, sin bloquear el pipeline.

## Decisión

- La suite corre sin cortar el pipeline y `atium gate` decide el resultado final.
- La lista de cuarentena vive en `.atium/quarantine.json`, versionada; cada entrada y salida pasa por un PR.
- Modo por defecto `run-and-ignore`; `skip` como alternativa.

## Consecuencias

- El pipeline depende de `atium gate` para su resultado.
- Por fail-open, si el gate no puede evaluar, se respeta el resultado original de la suite.

## Alternativas descartadas

- Skip automático: deja de acumular evidencia.
- Lista de cuarentena en el storage remoto: cambios sin revisión.
