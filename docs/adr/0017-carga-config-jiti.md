# ADR-0017: Carga del archivo de configuración con jiti

- Estado: Aceptada
- Fecha: 2026-10-09
- Diseño relacionado: 18-cli-config.md (26.3), 17-tech-stack.md

## Contexto

La configuración vive en `atium.config.{ts,mts,js,mjs,json}` (diseño, sección 26.3). Cargar un archivo `.ts` sin que el usuario lo compile requiere un cargador. El stack dejaba abiertas dos opciones: c12 o jiti.

La búsqueda del archivo, la precedencia (flags > `ATIUM_*` > archivo > defaults, ADR-0012) y la validación con Zod las implementa Atium (tarea v0-12). Lo único que falta es convertir el archivo encontrado en un objeto.

## Decisión

- jiti carga el archivo de configuración encontrado.
- La búsqueda del archivo, la precedencia, el mapeo de variables `ATIUM_*` y la validación siguen siendo código propio de `packages/core/src/config`.
- jiti se importa de forma diferida, solo al cargar la configuración, para no penalizar el arranque del CLI (05-performance.md).

## Consecuencias

- Una sola dependencia, pequeña y sin opiniones sobre el formato de la configuración.
- Precedencia y validación en un único lugar, con los errores `CONFIG_INVALID` propios.
- Si en el futuro se quisieran archivos `.atiumrc`, configuración por entorno o `extends`, habría que implementarlos.

## Alternativas descartadas

- c12: aporta archivos rc, capas `extends`, dotenv y configuración por entorno, que no se necesitan y competirían con la precedencia propia. Internamente usa jiti, así que no ahorra nada.
- Type stripping nativo de Node: no está disponible sin flags en todo el rango de Node 22 que se soporta (ADR-0002) y no transforma la sintaxis de TypeScript que requiere transformación.
