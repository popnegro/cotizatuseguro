# CotizaTuSeguro — cierre de ronda de aceptación

Fecha: 2026-10-31  
Rama candidata: `qa/pmv-candidate-2026-10`  
Commit candidato tras PR #45: `bd485a66acca3a27b7b9cd455d1794f2dd2cd4c4`  
Estado de aceptación del propietario: **VALIDADA por el usuario**.

## Evidencia técnica

- PR #45 (`fix(retry): preserve timeout headroom for worker batches`) integrado por squash únicamente en la rama candidata. Merge commit: `bd485a66acca3a27b7b9cd455d1794f2dd2cd4c4`.
- CI PR #45, run `41239754747`: **SUCCESS**. Job `validate` completó npm ci, typecheck, tests, lint, build con Pixel ID de test aislado, instalación de Chromium y browser acceptance tests.
- Vercel Preview de la rama candidata para el merge commit: deployment `dpl_8C4T6R6T5ZraYmC3Zo2VfkmVxXZ6`, estado **READY**.
- Preview landing: HTTP 200. El HTML de Preview conserva `noindex,nofollow` y `X-Robots-Tag: noindex`, canonical al dominio público y utiliza exclusivamente `https://cotizatuseguro.com.ar/opengraph-image.jpeg` para Open Graph y Twitter.
- Preview `GET /api/health`: HTTP 200; informa configuración presente de HubSpot, WhatsApp, GTM, Meta Pixel y Meta CAPI. Este endpoint comprueba presencia de configuración, no conectividad transaccional.
- PR #45 reduce el lote secuencial de retry de cuatro a tres leads para reservar margen dentro del timeout de 60 segundos. La prueba asegura que el cuarto lead permanece pendiente sin incrementar intentos.
- Comparación `main...qa/pmv-candidate-2026-10`: candidata 9 commits adelante, 0 detrás. `main` permanece en `2eab45af404bf75a68cc6c54129cc4ca956d2212`.

## Decisión y límites

La ronda de aceptación funcional fue validada por el propietario. Esta validación se registra como aprobación de la ronda, no como autorización para mergear a `main`.

Continúan sin evidencia independiente suficiente los siguientes controles operativos externos:
1. Escritura de lead desde Vercel hacia el portal HubSpot previsto y paridad del token de Preview/Production. No crear contactos adicionales sin autorización explícita.
2. Estado/paridad de secretos del scheduler GitHub Actions y prueba del worker en Preview. No ejecutar el scheduler de Production como prueba.
3. GTM publicado, consent rejection/acceptance, GA4 DebugView, Meta Test Events y deduplicación Pixel/CAPI.
4. Configuración de conversión de Google Ads, o confirmación explícita de que queda fuera del PMV.
5. QA visual autenticado en Preview, handoff WhatsApp en desktop/móvil y validación de titularidad del número. No enviar mensajes reales.
6. Revisión legal independiente de privacidad, si se requiere para lanzamiento.

No se enviaron comunicaciones, no se crearon leads nuevos, no se ejecutó el scheduler productivo, no se activaron campañas y no se modificó `main`.

## Próximo gate

Preparar el PR final desde `qa/pmv-candidate-2026-10` hacia `main`, con CI y reglas de protección verificadas. **No ejecutar el merge** hasta recibir autorización explícita del propietario. La aprobación de la ronda de aceptación no sustituye el HUMAN GATE de integración a `main`.
