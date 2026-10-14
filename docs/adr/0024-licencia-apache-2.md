# ADR-0024: Licencia Apache-2.0 y repositorio público

- Estado: Aceptada
- Fecha: 2026-10-14
- Diseño relacionado: 23-risks-open-decisions.md

## Contexto

La licencia era una decisión abierta (MIT o Apache-2.0). El repositorio era privado, y los minutos de GitHub Actions de un repositorio privado son limitados, lo que estaba bloqueando los pipelines de CI. Atium se diseñó desde el principio como open source, así que no hay razón para mantenerlo privado.

El usuario decidió publicar el repositorio con licencia Apache-2.0.

## Decisión

- El proyecto se licencia bajo Apache License 2.0. El texto completo está en `LICENSE`, en la raíz.
- Cada `package.json` declara `"license": "Apache-2.0"`.
- El repositorio de GitHub pasa a ser público.

## Consecuencias

- Los workflows de GitHub Actions corren sin el límite de minutos de los repositorios privados.
- Apache-2.0 incluye una concesión explícita de patentes y obliga a señalar los cambios en los archivos modificados al redistribuir. Es compatible con las dependencias MIT, BSD, ISC y Apache-2.0 del stack.
- Todo el historial de git queda público. Antes del cambio se revisó el historial: solo hay secretos falsos usados en tests y fixtures.
- Los PR desde forks no reciben los secretos del repositorio; los workflows que los necesiten deben tenerlo en cuenta.
- No se agrega un archivo `NOTICE` por ahora; Apache-2.0 no lo exige si el proyecto no tiene avisos de atribución propios.

## Alternativas descartadas

- MIT: más corta y también permisiva, pero sin concesión explícita de patentes.
- Mantener el repositorio privado y pagar minutos de Actions: contradice el objetivo open source y no aporta nada.
