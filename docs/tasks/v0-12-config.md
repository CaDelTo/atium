# Configuración: esquema, carga y precedencia

- ID: v0-12-config
- Fase: V0
- Paquete: packages/core/src/config
- Depende de: v0-11

## Contexto

- Diseño: docs/design/18-cli-config.md §26.3
- ADRs: 0012, 0017
- Estándares: 03-errors-logging.md (mensajes de error)

## Hacer

- `defineConfig` con tipos completos.
- Esquema Zod de nivel superior: `adapters`, `plugins`, `storage`, `network`, `analyzers`, `quarantine`, `gate`, `redact`, `llm`. Las secciones de cada analizador se validan como objetos abiertos por ahora; cada analizador aportará su esquema.
- Búsqueda del archivo `atium.config.{ts,mts,js,mjs,json}` en la raíz, o la ruta de `--config` / `ATIUM_CONFIG`.
- Carga del archivo encontrado con jiti, importado de forma diferida (ADR-0017).
- Precedencia: flags > variables `ATIUM_*` > archivo > defaults. En V0 solo se mapean `ATIUM_CONFIG` y `ATIUM_LOG_LEVEL`.
- Error `CONFIG_INVALID` con la ruta de la clave, el valor recibido y un `hint`; claves desconocidas con sugerencia por similitud.

## Criterios de aceptación

- Tests de cada nivel de precedencia.
- Una clave mal escrita (`storgae`) produce un error que sugiere `storage`.
- Sin archivo de configuración se usan los defaults sin error.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Variables de entorno de storage (V4), esquemas de analizadores (cada fase).
