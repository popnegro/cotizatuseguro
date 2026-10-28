# Meta Conversions API (CAPI)

Updated: 2026-10-27

## Qué hace

Cuando un lead pasa a estado `sent` en HubSpot, el servidor envía un evento **Lead** a Meta Conversions API. Es best-effort: un fallo de Meta **no** afecta el lead ni la respuesta al usuario.

## Deduplicación con el Pixel

- `event_id` = `requestId` (ej. `SOL-AB12CD34`)
- El Pixel del navegador debe enviar el mismo `eventID` en el evento `Lead` (vía GTM)
- Meta deduplica Pixel + CAPI cuando coinciden `event_name` + `event_id` en una ventana corta

## Privacidad

No se envían email, teléfono ni nombre a Meta. Solo:

- `client_ip_address` y `client_user_agent` (matching técnico)
- `fbp` / `fbc` cuando el navegador los reenvía
- `content_category` = producto de seguro

## Variables de entorno (Vercel)

```bash
META_PIXEL_ID=1635609034873051          # o el Pixel real del cliente
META_CAPI_ACCESS_TOKEN=...              # token generado en Events Manager
```

`NEXT_PUBLIC_META_PIXEL_ID` se acepta como fallback del Pixel ID, pero el token **nunca** debe ser `NEXT_PUBLIC_`.

## Cómo obtener el token (HUMAN GATE)

1. Meta Events Manager → Dataset / Pixel del negocio
2. Settings → Conversions API → Generate access token
3. Pegar el valor en Vercel (Preview + Production) como `META_CAPI_ACCESS_TOKEN`
4. Configurar `META_PIXEL_ID` con el mismo ID numérico del Pixel
5. Redesplegar

## Verificación

1. `GET /api/health` debe mostrar `metaCapiConfigured: true`
2. Enviar un lead de QA (datos ficticios) en Preview
3. En Events Manager → Test Events / Overview debe aparecer un `Lead` con el `event_id` = requestId
4. Si el Pixel del navegador también disparó `Lead` con el mismo `event_id`, Meta muestra el evento deduplicado (no dos conversiones)

## GTM (recordatorio)

La etiqueta `META - Lead` debe incluir:

```js
fbq('track', 'Lead', {}, { eventID: '{{Event ID}}' });
```

donde `Event ID` se lee del dataLayer (`event_id` que emite la app en `generate_lead`).
