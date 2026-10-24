# Cotizá tu Seguro — Agustín Montes

Landing de captación de solicitudes para seguros de autos, motos, hogar y comercios.

## Stack
- Next.js App Router + TypeScript
- HubSpot CRM API
- WhatsApp click-to-chat
- GA4 / Google Tag Manager / Meta Ads / Google Ads (requieren configuración de cuentas)
- Vercel

## Desarrollo local
Requiere Node.js 22 o superior.
```bash
npm install
cp .env.example .env.local
npm run dev
```
Configurar variables reales en `.env.local` para desarrollo y en Vercel para cada ambiente. No subir secretos al repositorio.

## Variables obligatorias
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`: Redis compartido para rate limit y respaldo durable de solicitudes.
- `LEAD_RETRY_SECRET`: secreto privado para autorizar el procesamiento de la cola con `POST /api/leads/retry`; no se expone al navegador.
- `HUBSPOT_ACCESS_TOKEN`: token privado de HubSpot con permisos mínimos para crear contactos.
- `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER`: número internacional de WhatsApp Business, solo dígitos.
- `NEXT_PUBLIC_GTM_ID`: contenedor GTM, cargado tras aceptar medición.
- `NEXT_PUBLIC_SITE_URL`: URL canónica.

La API guarda primero cada solicitud en Upstash (retención de 30 días) y después intenta registrarla en HubSpot. Los errores transitorios (HTTP 429/5xx, timeout o red) quedan en `pending` y se reintentan con backoff exponencial. Los rechazos permanentes (por ejemplo, HTTP 4xx distinto de 429 o credencial ausente) pasan a `failed`, se retiran de la cola automática y la API responde `202` con `status: "needs_review"`; deben reconciliarse manualmente. Un proceso programado debe llamar `POST /api/leads/retry` con `Authorization: Bearer <LEAD_RETRY_SECRET>` para procesar la cola pendiente; el endpoint procesa hasta 25 solicitudes vencidas por llamada. Configurar ese llamado programado es un paso operativo separado y debe verificarse antes de producción. Si Upstash no está configurado o falla la persistencia, el lead no se envía a HubSpot y la API responde `503`.

La API utiliza las propiedades personalizadas de HubSpot `insurance_product`, `insurance_request_id`, `insurance_request_details`, `lead_source`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid` y `fbclid`. Crear/verificar las propiedades antes de probar el endpoint; HubSpot rechazará propiedades inexistentes.

## Endpoint
`POST /api/leads` valida datos y crea el contacto en HubSpot. Si falta la credencial devuelve `503`. Un error no debe interpretarse como lead registrado. El rate limit usa Upstash Redis compartido. La cola durable no garantiza entrega exactamente una vez: si HubSpot acepta una solicitud pero falla la actualización del estado en Redis, un reintento puede recibir un rechazo por contacto existente. Los rechazos permanentes se conservan como `failed` para reconciliación manual. No declarar el flujo listo para producción hasta verificar la propiedad de email/duplicados y la operación de la cola.

## Estado de integraciones
Las cuentas y credenciales de HubSpot, WhatsApp Business, GA4, GTM, Meta y Google Ads deben configurarse por separado. Los identificadores publicitarios no se inventan ni se habilitan sin pruebas. El consentimiento actual es una base inicial y requiere QA de etiquetas y revisión legal antes del lanzamiento.

## Validación
```bash
npm run typecheck
npm run lint
npm run build
```

## Puertas de lanzamiento
No activar campañas pagas hasta verificar en Preview:
1. Registro correcto en HubSpot con producto y atribución.
2. Reintentos, idempotencia y tratamiento de duplicados.
3. Apertura de WhatsApp con el producto correcto.
4. Eventos GA4, Meta y Google Ads sin duplicación ni datos personales.
5. Consentimiento, privacidad y QA visual en móvil/escritorio.
