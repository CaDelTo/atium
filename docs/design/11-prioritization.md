# Priorización e impacto

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 19. Priorización e impacto

### 19.1 Fuentes de relación archivo → test

| Fuente | Confianza $c$ | Disponible desde |
|---|---|---|
| Coverage por test | 1.0 | Fase 2 |
| Mapa declarado en configuración | 0.9 | Fase 1 |
| Endpoint que el test llama ↔ archivos del backend que lo implementan (`impact.endpoints` o extensión `x-source` en OpenAPI) | 0.7 | Fase 1 |
| Convención de carpetas y tags | 0.5 | Fase 1 |

### 19.2 Puntaje de riesgo

Para cada test $t$ y un cambio $\Delta$:

$$
\text{risk}(t) = 0.5\,M(t,\Delta) + 0.3\,R(t) + 0.2\,N(t)
$$

| Término | Significado |
|---|---|
| $M(t, \Delta)$ | Máxima confianza $c$ entre las relaciones del test con los archivos cambiados (0 si no hay relación) |
| $R(t)$ | Tasa de fallo del test en los últimos 30 días, suavizada: $(f + 1)/(n + 10)$ |
| $N(t)$ | 1 si el archivo del test cambió o el test es nuevo; 0 si no |

Los tests se ordenan por $\text{risk}(t) / \text{duración media}(t)$: primero los de mayor riesgo por segundo de ejecución.

### 19.3 Selección

```
atium affected --since origin/main --budget 10m --format playwright-args
```

- `--budget`: selecciona tests en orden hasta llenar el presupuesto de tiempo.
- Tests con tags en `impact.alwaysRun` (por ejemplo `@smoke`) se incluyen siempre.
- **Fallback seguro:** si un archivo cambiado no tiene ninguna relación conocida, o cambian archivos globales (`package.json`, lockfile, configuración del framework), se selecciona la suite completa.
- Formatos de salida: lista de archivos, argumentos para Playwright o Cypress, JSON.

### 19.4 Impacto por coverage (fase 2)

Un test E2E no importa el código fuente, así que el grafo estático no existe. Se construye a partir de coverage por test (V8 en Chromium), mapeado a archivos fuente con source maps, generando `archivo → tests que lo ejecutaron`. Se refresca con una ejecución completa nocturna.

### 19.5 Sharding por duración

Con la duración media histórica, Atium propone shards balanceados (asignación greedy al shard con menor carga acumulada) para CI paralelo.
