# Flaky Detection y quarantine

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 15. Flaky Detection

### 15.1 Definición

Un test es flaky si produce resultados distintos **con el mismo código y entorno**. Como en CI rara vez se ejecuta varias veces el mismo commit, la evidencia se toma de varias fuentes:

| Evidencia | Fuente | Fuerza |
|---|---|---|
| E1 | En un mismo run, un intento falla y otro pasa (`outcome = flaky`) | Fuerte |
| E2 | Mismo `commitSha` y entorno, runs con resultados distintos (re-runs, ejecuciones programadas, `stress`) | Fuerte |
| E3 | En la rama principal, falla en un commit y pasa en el siguiente sin cambios en archivos relacionados | Débil |

E3 requiere el mapa de impacto ([sección 19](11-prioritization.md)); sin él no se usa.

### 15.2 Estados

| Estado | Criterio (ventana por defecto: 30 días) |
|---|---|
| `broken` | Falla en todos los intentos de los últimos 3 runs consecutivos de la rama |
| `flaky` | ≥ 2 eventos de evidencia fuerte en la ventana |
| `suspected` | 1 evento fuerte, o solo evidencia débil |
| `stable` | Ninguna de las anteriores |

`broken` tiene prioridad: un test que falla siempre detectó una regresión o está roto, y no debe ir a cuarentena como flaky.

### 15.3 Métricas

**Tasa de fallo intermitente** con intervalo de confianza de Wilson, para no sacar conclusiones con pocas ejecuciones. Con $f$ fallos en $n$ intentos, $\hat p = f/n$ y $z = 1.96$:

$$
\text{LB} = \frac{\hat p + \frac{z^2}{2n} - z\sqrt{\frac{\hat p(1-\hat p)}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}
$$

Se reporta el intervalo completo; el límite inferior (LB) se usa para ordenar.

**Flip rate** sobre resultados del mismo commit y entorno, ordenados por tiempo, con $k$ resultados:

$$
\text{flip rate} = \frac{\#\{\, i : r_i \neq r_{i-1} \,\}}{k - 1}
$$

**Costo**, para priorizar qué arreglar primero:

$$
\text{minutos perdidos} = \sum \text{duración de intentos fallidos que luego pasaron}
$$

más el número de pipelines bloqueados por ese test.

### 15.4 Correlaciones

| Señal | Cómo se calcula | Se reporta si |
|---|---|---|
| Entorno | Tasa de fallo por OS, browser y runner | Un valor tiene ≥ 3× la tasa global, con ≥ 20 muestras |
| Red | Familias de error con fallos de red en la ventana previa ([sección 16.3](08-triage.md)) | ≥ 50% de los fallos |
| Selector | Familias de error de tipo "locator no encontrado / no visible" | ≥ 50% de los fallos |
| Orden de ejecución | $P(\text{falla} \mid \text{test anterior en el worker} = X)$ vs. $P(\text{falla})$ | ≥ 3× con ≥ 10 muestras |
| Hora / día | Tasa de fallo por franja horaria y día de semana (UTC) | Franja con ≥ 3× la tasa global, con ≥ 20 muestras |

La correlación de orden detecta tests que dependen del estado que deja otro test. Se confirma con `atium stress --isolate` (ejecuta el test solo y luego después del sospechoso).

### 15.5 Reporte

```
checkout.spec.ts › pays with card                   FLAKY

Attempts (30 days): 500   Failed: 29   Retry passed: 24
Failure rate: 5.8% (95% CI: 4.1%–8.2%)    Flip rate: 9.1%
Cost: 41 min of CI, 5 blocked pipelines

Error groups:
  19 × TimeoutError waiting for response POST /api/payment
   9 × locator('[data-testid=checkout]') not visible
   1 × unclassified

Correlations:
  Network: 19/29 failures with POST /api/payment timeout
  Browser: webkit 14.2% vs global 5.8%
```

### 15.6 Arranque en frío

`atium stress --repeat 20 <archivo>` ejecuta tests repetidamente sobre el mismo commit para generar evidencia E2 sin esperar semanas. Usa `--repeat-each` en Playwright y ejecuciones repetidas en Cypress.

### 15.7 Quarantine

La lista de tests en cuarentena vive **en el repositorio** (`.atium/quarantine.json`), para que cada entrada y salida pase por revisión en un PR.

```
          detectado flaky
 active ─────────────────────► quarantined
   ▲   (automático o manual)        │
   │                                │ fix mergeado o
   │                                │ 20 runs sin fallos
   │        30 runs sin fallos      ▼
   └──────────────────────────── recovering
                 ▲                  │
                 └──── falla ───────┘ (vuelve a quarantined)
```

Modos:

| Modo | Comportamiento | Por defecto |
|---|---|---|
| `run-and-ignore` | El test se ejecuta y se registra, pero su fallo no hace fallar el gate | Sí |
| `skip` | El test no se ejecuta (anotación generada por el adapter) | No |

El modo `run-and-ignore` funciona porque el gate lo decide Atium (`atium gate`, [sección 27](19-ci-cd.md)): la suite corre completa y Atium calcula el resultado excluyendo los tests en cuarentena. Así se sigue acumulando evidencia de si el test se estabilizó.

`atium quarantine` propone entradas y salidas y, opcionalmente, abre un PR con el cambio y un issue con la evidencia.
