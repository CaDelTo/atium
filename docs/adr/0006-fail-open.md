# ADR-0006: Fail-open en todas las capas

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 00-overview.md (principio 5), 04-collector.md (12.5), 18-cli-config.md (26.2)

## Contexto

Si una herramienta de análisis rompe la suite de pruebas de un equipo, el equipo la desinstala.

## Decisión

- Reporter, fixture, storage y analizadores envuelven su lógica y registran errores internos como avisos.
- El fixture nunca lanza excepciones hacia el test ni cambia su resultado.
- Uploads y descargas con timeout de 10 s; si fallan, se omiten.
- Sin `--strict`, un error interno sale con código 0. En `gate`, un error interno nunca convierte un pipeline fallido en exitoso.
- Pruebas automatizadas con inyección de fallos verifican este comportamiento.

## Consecuencias

- Los errores internos pueden pasar desapercibidos; por eso se registran siempre y `doctor` los resume.

## Alternativas descartadas

- Fallar ante cualquier error interno: más fácil de depurar, inaceptable para los usuarios.
