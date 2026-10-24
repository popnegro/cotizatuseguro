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
- `HUBSPOT_ACCESS_TOKEN`: token privado de HubSpot con permisos mínimos para crear contactos.
- `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER`: número internacional de WhatsApp Business, solo dígitos.
- `NEXT_PUBLIC_GTM_ID`: contenedor GTM, cargado tras aceptar medición.
- `NEXT_PUBLIC_SITE_URL`: URL canónica.

La API utiliza las propiedades personalizadas de HubSpot `insurance_product`, `insurance_request_id`, `insurance_request_details`, `lead_source`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid` y `fbclid`. Crear/verificar las propiedades antes de probar el endpoint; HubSpot rechazará propiedades inexistentes.

## Endpoint
`POST /api/leads` valida datos y crea el contacto en HubSpot. Si falta la credencial devuelve `503`. Un error no debe interpretarse como lead registrado. Por defecto, el endpoint usa Upstash Redis para aplicar un límite distribuido. `LEADS_RATE_LIMIT_MODE=infrastructure` omite ese límite de aplicación y solo debe activarse después de configurar y probar reglas de rate limiting en Vercel Firewall para `POST /api/leads`; cambiar la variable por sí solo no activa protección. La recepción en HubSpot no es una cola durable y la idempotencia/reintentos deben verificarse antes de escalar campañas.

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
