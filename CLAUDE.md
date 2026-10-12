# Atium

Plataforma open source de análisis de calidad para suites de pruebas automatizadas
(Playwright, Cypress, Cucumber). Ayuda a los QA a escribir mejores tests y a
mantener sanas sus suites: linter, selectores, triage de fallos, flaky tests,
red, gaps de cobertura y priorización.

"Atium" es un codename provisional (ver docs/adr/0016-codename-atium.md).

# Estado actual

- El repositorio todavía no tiene código. La primera fase es V0
  (docs/design/22-roadmap.md).
- Los comandos de la sección "Comandos" y la configuración de herramientas de
  docs/engineering/10-tooling.md son el objetivo de V0; hasta que existan,
  crearlos es parte de la tarea.
- La especificación de cada tarea está en docs/tasks/ y su estado en GitHub
  Issues (un issue por tarea, un milestone por fase). La siguiente tarea es el
  issue abierto más antiguo del milestone actual cuyas dependencias estén
  cerradas o Hechas.
- Al empezar cada sesión, lee la entrada más reciente de docs/progress.md.

# Documentación

Precedencia ante contradicciones: ADRs > diseño > estándares de ingeniería.

- Decisiones tomadas: docs/adr/README.md
- Diseño: docs/design/README.md (índice, qué archivo leer para cada tarea)
- Estándares de código: docs/engineering/README.md (incluye Definition of Done)
- Revisión de código: docs/engineering/11-code-review.md
- Agentes, comandos y modelos: docs/engineering/12-ai-workflow.md
- Tareas: docs/tasks/ (especificación) y GitHub Issues (estado)
- Bitácora entre sesiones: docs/progress.md

Al empezar una tarea, lee docs/design/00-overview.md, el archivo de diseño del
módulo, los ADR relacionados y el estándar de ingeniería que aplique.

# Comandos (objetivo de V0)

- Instalar: pnpm install
- Tests: pnpm test
- Tests de un paquete: pnpm --filter @atium/core test
- Tipos: pnpm typecheck
- Lint: pnpm lint
- Todo antes de terminar una tarea: pnpm verify

# Reglas del proyecto

- Una tarea termina solo si cumple la Definition of Done
  (docs/engineering/README.md) y `pnpm verify` pasa.
- Nunca modifiques un test existente para que pase. Si crees que el test está
  mal, detente y explícalo.
- No cambies APIs públicas (docs/engineering/07-public-api.md) ni esquemas
  del modelo sin un ADR nuevo. Si hace falta, propónlo y detente.
- No contradigas un ADR aceptado. Si una tarea lo requiere, propón un ADR que lo
  reemplace y detente.
- Fail-open (ADR-0006): reporters, fixtures, storage y el orquestador nunca
  propagan errores a la suite del usuario. Usa el helper `failOpen` solo en esos
  bordes.
- Fórmulas, umbrales y defaults salen de docs/design/ y viven en el `defaults.ts`
  de cada paquete. No inventes valores; si falta uno, pregunta.
- No agregues dependencias fuera de docs/design/17-tech-stack.md sin justificarlo.
- Los archivos en fixtures/ son salidas reales de frameworks: no los edites a mano.

# Estándares de código (resumen; detalle en docs/engineering/)

- TypeScript estricto: sin `any`, sin `!`, `as` solo justificado; usa `unknown`,
  uniones discriminadas y `switch` exhaustivo con `assertNever`.
- Tipos del modelo derivados de Zod; IDs con branded types.
- Sin `enum`, sin `export default` (salvo configs de frameworks), `import type`
  para tipos, imports entre paquetes solo por nombre de paquete.
- Analizadores = funciones puras. I/O solo en storage, adapters, suite-index y CLI.
  Reloj y aleatoriedad inyectados. Sin estado global.
- Respeta las capas de docs/engineering/02-code-design.md (dependency-cruiser
  las verifica).
- Errores: `AtiumError` con código y `cause`; mensajes con qué pasó, por qué y
  cómo arreglarlo; nunca `catch` vacío; sin `console.*` fuera de la salida del CLI.
- Validación con Zod en los bordes; dentro, confía en los tipos.
- Tests: nombre que describe el comportamiento, deterministas, builders en lugar
  de JSON copiados, fakes en lugar de mocks, property-based para fórmulas y
  normalizadores. Un bug corregido empieza con un test que lo reproduce.
- Código, identificadores, comentarios y commits en inglés. Conventional Commits
  con el paquete como scope.
- TSDoc en todo lo exportado.

# Flujo de trabajo

- Empieza las tareas con `/task <n|archivo>` (número de issue o
  `docs/tasks/<archivo>`).
- Cada tarea va en una rama `<tipo>/<n>-<nombre>` y su PR incluye `Closes #<n>`
  (formato en docs/engineering/08-git-workflow.md, sección "Issues").
- Nunca cierres issues ni mergees PRs: lo hace una persona.
- Antes de escribir código en una tarea no trivial, presenta un plan breve
  (archivos a tocar, enfoque, tests) y espera aprobación.
- Una tarea a la vez. No avances a la siguiente ni hagas cambios fuera del
  alcance pedido; si ves algo que mejorar, menciónalo al final.
- Escribe o actualiza los tests junto con el código, no después.
- Si cambias un comportamiento descrito en docs/design/, actualiza el diseño en
  el mismo cambio.
- Antes de dar la tarea por terminada: `/verify` y luego `/review`. Corrige los
  hallazgos bloqueantes y los importantes, o justifica por qué no.
- Al terminar, resume qué cambiaste, qué verificaste y qué quedó pendiente.
- Cierra cada sesión con `/handoff`. Si una decisión no quedó escrita en un ADR,
  el diseño o una tarea, dilo en la entrada.
- Si el hook `test-guard` bloquea un cambio, no intentes rodearlo: detente,
  explica por qué querías hacerlo y pide aprobación.
- Al cerrar una fase: `/audit` y luego `/plan-phase <siguiente fase>`.

# Subagentes y modelos (detalle en docs/engineering/12-ai-workflow.md)

- Delega a subagentes ligeros (`haiku`) lo mecánico: buscar (`explorer`),
  ejecutar verificaciones (`verifier`), detectar duplicación y código muerto
  (`duplication-auditor`), revisar documentación (`docs-checker`), medir
  rendimiento (`perf-benchmarker`), crear los issues de una fase
  (`issue-writer`).
- Revisión con criterio (`sonnet`): `code-reviewer`, `security-reviewer`,
  `test-writer`.
- Lo crítico lo hace el modelo de la sesión: fórmulas, estados, esquemas,
  decisiones de arquitectura y `design-auditor`.
- Nunca delegues decisiones; los subagentes reportan y tú decides.
- Los subagentes no ven esta conversación: dales siempre alcance (archivos o ref)
  y una pregunta concreta.
- Antes de actuar sobre un hallazgo bloqueante de un subagente, verifícalo en el
  código.
- Antes de escribir un helper nuevo, busca con `explorer` si ya existe algo
  equivalente.

# Decisiones abiertas (no las tomes por tu cuenta)

- Nombre definitivo del proyecto
- Backend de storage remoto recomendado por defecto (S3 o rama git)
- Licencia (MIT o Apache-2.0)
- Idioma de los archivos para contribuidores (CONTRIBUTING, plantillas de issues,
  código de conducta). La documentación pública va en inglés (ADR-0020).
- Versiones mínimas definitivas de Playwright, Cypress y herramientas BDD

# Estructura (objetivo)

- packages/core: modelo, config, CI, pipeline, findings, fingerprint, storage
- packages/cli: comandos
- packages/eslint-plugin: reglas por archivo
- packages/suite-index: índice cross-file
- packages/adapters/*: integración con frameworks
- packages/analyzers/*: un analizador por paquete
- packages/storage/*, packages/reporters/*
- fixtures/: reportes reales e historiales sintéticos
- examples/: repos demo con problemas sembrados
- docs/: ADRs, diseño y estándares de ingeniería
