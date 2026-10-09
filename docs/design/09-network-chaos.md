# Red: análisis y chaos

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 17. Red: análisis y chaos

### 17.1 Análisis

Usa el resumen de red por intento ([sección 12.4](04-collector.md)):

```
POST /api/payment
  Attempts with call: 500     Failures in window of test failures: 19 of 29
  Status:  200 × 471   500 × 3   429 × 1   timeout × 15
  p95: 2,143 ms (▲ 38% vs previous 30 days)

⚠ Possible flaky dependency
```

Reporta también endpoints lentos y su tendencia, que suelen causar timeouts intermitentes.

### 17.2 Chaos: mecanismo

`atium chaos` reejecuta tests con fallos inyectados en el navegador (`page.route` en Playwright, `cy.intercept` en Cypress). El fixture lee el escenario desde la variable `ATIUM_CHAOS` y solo intercepta lo indicado.

**Matriz de escenarios:**

- Endpoints: los que el test llama según el historial (excluye third-party), empezando por los que modifican datos (`POST`, `PUT`, `PATCH`, `DELETE`).
- Fallos:

| Fallo | Implementación |
|---|---|
| `500`, `503` | Respuesta con ese status y cuerpo vacío |
| `429` | Status 429 con `Retry-After` |
| `timeout` | La request se aborta después de N segundos (por defecto, el timeout de acción del test) |
| `latency` | Se retrasa la respuesta real N segundos (por defecto 3) |
| `connection` | `route.abort("connectionreset")` |

- Límite de escenarios por test (`chaos.maxScenariosPerTest`, por defecto 6) para controlar el costo.

### 17.3 Oráculo de degradación correcta

Con un 500, el test original va a fallar; ese resultado no informa nada. El fixture evalúa el estado de la página al terminar el test, **sin importar si pasó o falló**:

| Verificación | Cómo se detecta |
|---|---|
| Excepciones no capturadas | Eventos `pageerror` durante el escenario |
| Página en blanco | Texto visible del body por debajo de un umbral o sin landmarks |
| Feedback al usuario | Elementos `[role=alert]`, regiones `aria-live` con contenido, o selectores / textos configurados |
| Carga infinita | Selectores de loader configurados siguen visibles después del timeout |
| Errores de consola | Conteo de `console.error` |

Resultado por escenario:

| Resultado | Criterio |
|---|---|
| `graceful` | Hay feedback al usuario, sin excepciones no capturadas ni pantalla en blanco |
| `degraded` | Sin excepciones, pero sin feedback visible, o con carga infinita |
| `broken` | Excepción no capturada o pantalla en blanco |

```
Scenario: checkout.spec.ts › pays with card

Baseline:            ✓ passed
500 POST /payment:   ✗ broken    Uncaught TypeError: cannot read 'id' of undefined
429 POST /payment:   ✓ graceful  [role=alert] "Too many requests, try again"
timeout /payment:    ⚠ degraded  loader ".spinner" visible after 30s, no feedback
```

### 17.4 Seguridad

- La intercepción ocurre en el navegador: el backend no recibe tráfico alterado. Aun así, los tests pueden crear datos reales, por lo que chaos solo se permite si el host de `baseURL` está en `chaos.allowedHosts` (por defecto `localhost`, `127.0.0.1`, `*.test`, `*.local`).
- No se ejecuta en CI salvo con `--allow-ci`; el uso recomendado es local o nightly.
