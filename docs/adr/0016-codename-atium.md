# ADR-0016: Codename provisional "atium"

- Estado: Aceptada
- Fecha: 2026-10-08
- Reemplaza a: ADR-0013
- Diseño relacionado: docs/design/README.md

## Contexto

El ADR-0013 fijó `nameless` como codename. Se cambia antes de escribir código, cuando el cambio solo afecta a la documentación.

## Decisión

- Codename `atium`: paquetes `@atium/*`, binario `atium`, variables `ATIUM_*`, carpeta `.atium/`, configuración `atium.config.ts`, error base `AtiumError`.
- Sigue siendo provisional: el nombre definitivo es una decisión abierta y se aplicará con buscar y reemplazar.
- No se publica nada en npm con el codename.

## Consecuencias

- Todas las referencias de la documentación, la configuración de Claude Code y las tareas usan `atium`.
- El ADR-0013 y las entradas anteriores de docs/progress.md conservan el nombre anterior como registro histórico.

## Alternativas descartadas

- Mantener `nameless`.
