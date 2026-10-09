# Score, baseline y reportes

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 21. Score, baseline y reportes

### 21.1 Score por categoría

Cada Finding tiene un peso según su severidad: $w(\text{info}) = 0.25$, $w(\text{warning}) = 1$, $w(\text{error}) = 3$. Para una categoría $c$ con hallazgos $F_c$ y $N$ tests:

$$
D_c = \frac{\sum_{f \in F_c} w(f)}{N}
\qquad
S_c = 100 \cdot e^{-\lambda_c D_c}
$$

Con $\lambda_c = 3.5$ por defecto, una densidad de 0.1 (un hallazgo de tipo warning por cada 10 tests) da $S_c \approx 70$.

**Confiabilidad** usa una densidad propia, porque cada test flaky o roto pesa mucho más que un hallazgo de estilo:

$$
D_{\text{rel}} = \frac{\#\text{flaky} + 2 \cdot \#\text{broken}}{N}, \qquad \lambda_{\text{rel}} = 10
$$

### 21.2 Score global

$$
S = \frac{\sum_c \alpha_c S_c}{\sum_c \alpha_c}
$$

- $\alpha_c$ son pesos configurables por categoría.
- Las categorías sin datos (por ejemplo, red con ingesta JUnit) se muestran como `N/A` y se excluyen de la suma; los pesos se renormalizan.
- Hallazgos con `source: "llm"` nunca entran al cálculo.

```
Test Health Score
────────────────────
Reliability          82
Maintainability      74
Selector Quality     68
Assertions           91
Network Stability    77
Coverage Gaps        70
Test Architecture    84

Overall              79/100   (▼ 3 vs main)
```

Lo importante es la **tendencia y el delta por PR**, no el número absoluto.

### 21.3 Baseline ("clean as you code")

- `atium baseline` guarda los fingerprints de los Findings actuales en `.atium/baseline.json` (versionado en el repo).
- El gate evalúa solo Findings **nuevos**.
- Los Findings del baseline que desaparecen se eliminan del archivo en la siguiente actualización, para que no vuelvan a entrar sin aviso.

### 21.4 Ownership

Con `CODEOWNERS`, cada Finding se asigna al equipo dueño del archivo del test.

### 21.5 Reportes

| Reporter | Uso |
|---|---|
| Consola | Desarrollo local |
| JSON | Integraciones; esquema publicado y versionado |
| HTML | Un solo archivo estático; datos embebidos comprimidos y tablas virtualizadas para suites grandes |
| SARIF 2.1.0 | Anotaciones en PRs de GitHub |
| JUnit | Compatibilidad con CI existente |
| PR comment | Un solo comentario por PR, identificado con un marcador HTML y actualizado en cada push |
