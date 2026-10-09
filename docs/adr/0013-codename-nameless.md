# ADR-0013: Codename provisional "nameless"

- Estado: Reemplazada por ADR-0016
- Fecha: 2026-10-08
- Diseño relacionado: README del diseño

## Contexto

El nombre definitivo no está decidido, pero el código necesita nombres de paquetes, binario y variables de entorno.

## Decisión

- Codename `nameless`: paquetes `@nameless/*`, binario `nameless`, variables `NAMELESS_*`, carpeta `.nameless/`, config `nameless.config.ts`.
- Cuando se defina el nombre, se reemplaza con buscar y reemplazar y se publica por primera vez en npm con el nombre definitivo.

## Consecuencias

- No se publica nada en npm con el codename.

## Alternativas descartadas

- Placeholder genérico (`nombre`): confuso en código y choca con palabras en español.
