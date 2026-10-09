# Failure Triage

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 16. Failure Triage

Agrupa los fallos de un run por causa y los clasifica, para que el QA revise causas y no tests.

### 16.1 Taxonomía

| Categoría | Significado |
|---|---|
| `regression` | Fallo nuevo y consistente: fingerprint no visto en los últimos N runs de la rama base y falla en todos los intentos. Puede ser un bug o un cambio intencional que requiere actualizar el test |
| `flaky` | El test pasó en retry o está clasificado como flaky |
| `infra` | Dependencia o infraestructura: 5xx, `net::ERR_*`, timeouts de red, navegador caído, `ECONNREFUSED` contra `baseURL` |
| `test-maintenance` | Locator no encontrado o strict mode violation con el objetivo ausente en el DOM capturado |
| `environment` | Fallos en setup global, fixtures de autenticación o datos de prueba, que afectan a muchos tests con la misma familia |
| `unknown` | Ninguna regla aplica con confianza suficiente |

Atium no afirma "es un bug del producto": la categoría honesta es `regression`, con la evidencia para que el QA decida.

### 16.2 Motor de reglas

Reglas ordenadas por prioridad; la primera que aplica clasifica el grupo. Cada regla declara:

```ts
interface TriageRule {
  id: string;
  priority: number;
  category: TriageCategory;
  confidence: "high" | "medium" | "low";
  when: (group: FailureGroup, ctx: TriageContext) => boolean;
  explain: (group: FailureGroup) => string;   // evidencia mostrada al usuario
}
```

Las reglas por defecto son reemplazables y extensibles desde la configuración.

### 16.3 Correlación con red

Una llamada se considera relacionada con un fallo si terminó (o falló) en la ventana $[t_{\text{fallo}} - 30\,\text{s},\ t_{\text{fallo}}]$ del mismo intento. La ventana es configurable.

### 16.4 Fallos masivos

Si más del 30% de los tests del run falla con la misma familia de error, el grupo se marca como **incidente** (`environment` o `infra`) y se muestra primero, colapsado, para no ocultar los demás grupos.

### 16.5 Resultado

```
Run #4821 — 40 failures → 3 groups

[INFRA]       high    35 tests   POST /api/payment → 503 (in 35/35 failure windows)
[TEST-MAINT]  medium   4 tests   locator("#checkout-btn") not found; no matching element in snapshot
[REGRESSION]  high     1 test    cart.spec.ts:57 toHaveText expected "$120.00", received "$100.00"
                                 first seen in this commit; passing on main
```

Un LLM puede usarse opcionalmente solo para grupos `unknown`, y su resultado se muestra marcado como sugerencia.
