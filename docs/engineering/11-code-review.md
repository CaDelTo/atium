# Revisión de código

Checklist que usan tanto las personas como los subagentes de revisión (`code-reviewer`, `security-reviewer`, `duplication-auditor`). Lo que ya verifica `pnpm verify` no se revisa a mano: aquí está lo que las herramientas no ven o ven a medias.

## Severidades

| Severidad | Significado | Efecto |
|---|---|---|
| **Bloqueante** | Rompe corrección, seguridad, fail-open, una API pública o un ADR; o debilita un test | No se mergea |
| **Importante** | Mala práctica con costo real de mantenimiento o rendimiento | Se corrige en el mismo PR salvo justificación |
| **Sugerencia** | Mejora opcional | Queda a criterio del autor |

## Checklist

### Corrección y diseño
- [ ] El comportamiento coincide con la sección de `docs/design/` citada en la tarea.
- [ ] Fórmulas, umbrales y estados coinciden con el diseño y viven en `defaults.ts`.
- [ ] Casos borde cubiertos: listas vacías, división por cero, datos insuficientes, entradas enormes.
- [ ] No hay decisiones nuevas sin ADR ni valores que el diseño no define.

### Arquitectura
- [ ] Los imports respetan las capas de [02-code-design.md](02-code-design.md).
- [ ] Los analizadores siguen siendo funciones puras; el I/O está en los bordes.
- [ ] Sin estado global ni singletons.
- [ ] Lo que comparten dos paquetes vive en `core`, no copiado en ambos.

### Duplicación
- [ ] No se reimplementa algo que ya existe en el repo (buscar antes de aceptar un helper nuevo).
- [ ] No hay la misma regla de negocio en dos lugares.
- [ ] La duplicación accidental aceptada tiene razones de cambio distintas y se puede explicar.

### Malas prácticas (code smells)

| Smell | Señal | Qué hacer |
|---|---|---|
| Función larga o compleja | > 60 líneas, complejidad > 10 | Extraer pasos con nombre |
| Anidación profunda | > 3 niveles | Retornos tempranos |
| Parámetro booleano | `render(data, true)` | Dos funciones o un objeto de opciones con nombre |
| Obsesión por primitivos | `string` para ids, `number` sin unidad | Branded types, sufijos de unidad |
| Número mágico | Literal numérico en lógica | Constante en `defaults.ts` con referencia al diseño |
| Envidia de datos | Función que solo usa datos de otro módulo | Moverla a ese módulo |
| Objeto dios | Módulo que hace cálculo, formato e I/O | Separar responsabilidades |
| Cirugía de escopeta | Un cambio simple obliga a tocar muchos archivos | Revisar dónde vive el conocimiento |
| Código muerto | Exports, ramas o parámetros sin uso | Eliminar |
| Código comentado | Bloques comentados | Eliminar; Git guarda la historia |
| Comentario que explica el qué | `// increment i` | Mejorar nombres; comentar solo el porqué |
| Abstracción prematura | Interfaz o genérico con un solo uso | Esperar al tercer caso |
| Cadena de condicionales sobre un tipo | `if (kind === ...) else if ...` | Unión discriminada con `switch` exhaustivo |
| Mutación de parámetros | Modificar un argumento recibido | Devolver un valor nuevo |

### Errores
- [ ] Bordes fail-open envueltos con `failOpen`; ningún otro lugar captura errores sin motivo.
- [ ] Sin `catch` vacíos; errores envueltos con `cause`.
- [ ] Mensajes con qué pasó, por qué y cómo arreglarlo.
- [ ] Entradas externas validadas con Zod y con límite de tamaño.

### Tests
- [ ] Ningún test existente se debilitó, se borró o se marcó como `skip` para que pase.
- [ ] Los tests verifican comportamiento observable, no detalles internos.
- [ ] Los valores esperados salen del diseño, no del resultado actual del código.
- [ ] Deterministas: sin hora real, aleatoriedad sin semilla ni red.
- [ ] Un bug corregido tiene un test que lo reproducía.

### Rendimiento
- [ ] Sin algoritmos O(n²) sobre tests × runs sin justificación.
- [ ] Sin trabajo pesado ni I/O síncrono en el reporter y el fixture.
- [ ] Concurrencia limitada.

### API pública
- [ ] Cambios en elementos de [07-public-api.md](07-public-api.md) tienen changeset, y si son incompatibles, ADR o deprecación.

### Documentación
- [ ] TSDoc en exports nuevos o modificados.
- [ ] Diseño actualizado si cambió un comportamiento descrito.

## Formato del reporte

```
## Resultado: CAMBIOS REQUERIDOS | APROBADO CON SUGERENCIAS | APROBADO

### Bloqueantes
- packages/analyzers/flaky/src/state.ts:42 — [Corrección] `broken` se evalúa después de `flaky`;
  el diseño (§15.2) da prioridad a `broken`. Un test que falla siempre queda como flaky.

### Importantes
- packages/analyzers/triage/src/rules.ts:88 — [Duplicación] normaliza URLs con su propia regex;
  ya existe `toUrlTemplate` en core/src/network. Usar esa.

### Sugerencias
- ...

### Verificado sin hallazgos
Capas, fail-open, tests, documentación.
```

Cada hallazgo incluye ubicación, categoría, qué está mal, por qué importa y, cuando aplica, la referencia al diseño o al estándar.
