# Integración con CI/CD

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 27. Integración con CI/CD

### 27.1 Flujo

```
tests (cada shard) ──► reporter escribe run local ──► atium upload
                                                          │
último job ──► atium sync ──► atium analyze ──► atium gate ──► reportes / PR comment
```

La suite se ejecuta sin cortar el pipeline (`|| true` o `continue-on-error`) y `atium gate` decide el resultado final. Así funciona la cuarentena en modo `run-and-ignore`.

### 27.2 GitHub Action

```yaml
- name: Run tests
  run: npx playwright test
  continue-on-error: true

- name: Atium
  if: always()
  uses: atium/action@v1
  with:
    min-score: 80
    fail-on: new-flaky,new-hard-wait
    comment-on-pr: true
    sarif: true
  env:
    ATIUM_STORAGE_S3_BUCKET: ${{ vars.ATIUM_BUCKET }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Con shards: cada shard ejecuta `atium upload`; un job final con `needs` ejecuta el resto.

### 27.3 GitLab

```yaml
e2e:
  stage: test
  parallel: 4
  script:
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL || true
    - npx atium upload

atium:
  stage: report
  needs: [e2e]
  script:
    - npx atium sync && npx atium analyze && npx atium gate
  artifacts:
    when: always
    paths: [atium-report.html]
    reports:
      junit: atium-junit.xml
```

### 27.4 PRs desde forks

En GitHub, los PRs desde forks no tienen acceso a secretos: no pueden descargar ni subir historial ni comentar.

- **Modo degradado automático:** sin credenciales, Atium ejecuta lint y el triage del run actual sin historial, y lo indica en el reporte.
- **Comentario en PR:** patrón de dos workflows. El primero (sin secretos) sube el resultado como artefacto; un segundo workflow `workflow_run`, que corre en el contexto del repositorio base, lo descarga y publica el comentario. Atium nunca ejecuta código del fork con secretos (`pull_request_target` no se usa).

### 27.5 Comentario en PR

```
Atium: 79/100 (▼ 3 vs main)

Last run: 6 failures → 2 groups
  [INFRA]       5 tests  POST /api/payment → 503
  [TEST-MAINT]  1 test   locator("#checkout-btn") not found

New issues
  ⚠ 2 new hard waits (login.spec.ts:42, cart.spec.ts:18)
  ⚠ checkout.spec.ts flaky rate 2% → 9%

Fixed
  ✓ 3 fragile selectors removed

Quarantined (not blocking): 2 tests
```

Un solo comentario por PR, identificado con `<!-- atium-report -->` y actualizado en cada push.

### 27.6 Gate

```
ATIUM GATE: FAILED

Test failures (excluding 2 quarantined):
  1 regression  cart.spec.ts › applies discount

New findings in this PR:
  2 new flaky tests
  3 new hard waits
  1 new fragile selector
```
