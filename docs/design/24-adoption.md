# Adopción y resultado final

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 32. Adopción y comunidad

- **`atium init` + `atium doctor`**: de cero a primer reporte en menos de 5 minutos.
- **Documentación por regla** con ejemplos antes/después y por qué importa.
- **Presets** que funcionan sin configuración.
- **Repos demo** con problemas deliberados (selectores frágiles, hard waits, un endpoint que falla de forma controlada, tests dependientes de orden).
- **Dogfooding** en suites reales; las primeras reglas salen de problemas observados en equipos de QA.
- **Plantilla de issue para falsos positivos**, conectada a la política de calidad de reglas ([sección 11.7](03-linter.md)).
- **Guía para contribuir** reglas, adapters, analizadores y reglas de triage usando la API de plugins.
- **Esquemas publicados** (JSON Schema del modelo, del reporte JSON y de la configuración) para integraciones de terceros.

---

## 33. Resultado final

```
$ atium analyze

╔══════════════════════════════════════════════╗
║              ATIUM REPORT                    ║
╠══════════════════════════════════════════════╣
║ Test Health Score              84/100 (▲ 2)  ║
║                                              ║
║ Tests                                  2,431 ║
║ Flaky / Broken                       17 / 3  ║
║ Quarantined                               5  ║
║ Fragile selectors                         43 ║
║ Hard waits                                12 ║
║ Untested endpoints                        19 ║
║ CI time lost to retries          14 min/day  ║
╠══════════════════════════════════════════════╣
║ LAST RUN — 40 failures → 3 groups            ║
║   [INFRA]        35  POST /api/payment → 503 ║
║   [TEST-MAINT]    4  #checkout-btn not found ║
║   [REGRESSION]    1  cart total mismatch     ║
╠══════════════════════════════════════════════╣
║ TOP ISSUES                                   ║
║ ⚠ checkout.spec.ts  5.8% flaky (41 min lost) ║
║ ⚠ login.spec.ts     selector suggestion      ║
║ ⚠ POST /api/refunds never tested             ║
╚══════════════════════════════════════════════╝
```

```
   PLAYWRIGHT   CYPRESS   JUNIT / CTRF
        │          │          │
        └──────────┼──────────┘
                   │   + CUCUMBER (BDD)
                   ▼
        ┌───────────────────┐
        │       ATIUM       │
        │                   │
        │ Write better      │
        │ Understand fails  │
        │ Detect flakiness  │
        │ Find gaps         │
        │ Prioritize        │
        │ Suggest fixes     │
        └───────────────────┘
```
