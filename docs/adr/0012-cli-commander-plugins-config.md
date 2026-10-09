# ADR-0012: Commander para el CLI; plugins declarados en la configuración

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 14-architecture.md (22.4), 18-cli-config.md

## Contexto

Los plugins aportan analizadores, reglas de triage, reporters y backends, no comandos nuevos.

## Decisión

- CLI con Commander.
- Plugins declarados en `atium.config.ts`, como en ESLint o Vite.
- Configuración validada con Zod; precedencia: flags > variables `ATIUM_*` > archivo > defaults.

## Consecuencias

- CLI simple; extensibilidad en la configuración.

## Alternativas descartadas

- oclif: su sistema de plugins de comandos no se necesita.
