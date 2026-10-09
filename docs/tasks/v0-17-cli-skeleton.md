# CLI base e `init`

- ID: v0-17-cli-skeleton
- Fase: V0
- Paquete: packages/cli
- Depende de: v0-12

## Contexto

- Diseño: docs/design/18-cli-config.md §26.1, §26.2
- ADRs: 0012
- Estándares: 03-errors-logging.md (Salida del CLI), 05-performance.md (Arranque del CLI)

## Hacer

- Paquete `@atium/cli` con binario `atium` y Commander.
- Opciones globales: `--config`, `--format`, `--output`, `--ci`, `--strict`, `--quiet`, `--verbose`.
- Códigos de salida de §26.2 centralizados; fail-open para errores internos sin `--strict`.
- stdout solo para resultados; logs a stderr.
- Imports diferidos de dependencias pesadas dentro de cada comando.
- `atium init`: genera `atium.config.ts` mínimo y detecta Playwright o Cypress en las dependencias del proyecto.

## Decisiones abiertas en esta tarea

Decisión pendiente: idioma de los mensajes del CLI. Hasta que se decida, usa inglés y centraliza los textos en `src/messages.ts` para poder cambiarlos sin tocar la lógica.

## Criterios de aceptación

- `atium --help` en menos de 300 ms (benchmark).
- Tests de códigos de salida: error de configuración → 2; error interno sin `--strict` → 0 con aviso; con `--strict` → 3.
- `init` no sobrescribe un archivo existente sin `--force`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Resto de comandos (cada fase).
