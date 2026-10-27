# Configuración de Meta Pixel mediante Google Tag Manager

Updated: 2026-10-27

## Alcance y seguridad

- Contenedor GTM esperado: `GTM-K2BSJ2W6`.
- Meta Pixel esperado: `1635609034873051`.
- La aplicación inserta GTM solo después de que el visitante acepta medición. No instales el Pixel también en el código fuente ni en otro plugin: duplicaría eventos.
- Este documento describe la configuración manual; no modifica ni publica el contenedor GTM.
- No envíes nombres, emails, teléfonos, detalles del seguro ni otros datos personales a Meta en parámetros de eventos.

## 1. Antes de configurar

1. Entra a [Meta Events Manager](https://business.facebook.com/events_manager2/) y confirma que el conjunto de datos/Pixel tiene ID `1635609034873051`.
2. Entra a [Google Tag Manager](https://tagmanager.google.com/) y confirma que estás en el contenedor `GTM-K2BSJ2W6`.
3. En GTM, abre **Preview** y conecta `https://cotizatuseguro.com.ar`. Acepta el consentimiento de medición en la web. Confirma que GTM carga una sola vez.
4. Revisa las etiquetas existentes antes de crear nuevas; si ya existe un Meta Pixel base, reutilízalo y evita duplicados.

## 2. Variable de capa de datos: Event ID

Crear variable **Variable de capa de datos** (Data Layer Variable):

| Campo | Valor |
|-------|-------|
| Nombre | `DLV - event_id` |
| Nombre de la variable de capa de datos | `event_id` |
| Versión de la capa de datos | Versión 2 |

La app emite `event_id` en el dataLayer junto con `generate_lead` (es el `requestId` del lead, ej. `SOL-AB12CD34`).

## 3. Etiqueta base del Pixel

Crear una etiqueta **HTML personalizado** llamada `META - Pixel Base`, con activador **All Pages / Todas las páginas**:

```html
<script>
!function(f,b,e,v,n,t,s){
  if(f.fbq)return;
  n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;
  n.push=n;
  n.loaded=true;
  n.version='2.0';
  n.queue=[];
  t=b.createElement(e);
  t.async=true;
  t.src=v;
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s);
}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1635609034873051');
fbq('track','PageView');
</script>
```

El activador debe respetar el consentimiento: dado que GTM se inserta tras aceptar medición, no agregues una instalación alternativa que eluda ese flujo.

## 4. Evento Lead (con eventID para deduplicar CAPI)

Crear etiqueta HTML personalizado `META - Lead`:

```html
<script>
if (typeof fbq === 'function') {
  var eid = {{DLV - event_id}};
  if (eid) {
    fbq('track', 'Lead', {}, { eventID: String(eid) });
  } else {
    fbq('track', 'Lead');
  }
}
</script>
```

Activador: **Evento personalizado**, nombre exacto `generate_lead`.

> El mismo `event_id` lo envía el servidor vía Conversions API. Meta deduplica Pixel + CAPI cuando coinciden `event_name` + `event_id`.

La aplicación emite `generate_lead` después de que `POST /api/leads` devuelve una respuesta OK. No lo actives con el clic del botón de envío.

## 5. Evento Contact para clic a WhatsApp

Crear etiqueta HTML personalizado `META - Contact`:

```html
<script>
if (typeof fbq === 'function') {
  fbq('track','Contact');
}
</script>
```

Activador: **Evento personalizado**, nombre exacto `whatsapp_click`.

Esto mide el clic que inicia la apertura de WhatsApp; no demuestra que se haya enviado un mensaje.

## 6. Orden y duplicación

- Mantén una única etiqueta base de Pixel.
- No agregues `PageView` a las etiquetas de `Lead` o `Contact`.
- Si GTM permite secuenciación, configura la base como etiqueta previa de las de evento.
- No habilites Advanced Matching ni envíes parámetros de usuario sin revisión de privacidad.

## 7. Prueba antes de publicar (checklist mínimo)

1. GTM Preview → rechazar consentimiento → Pixel no dispara.
2. Aceptar consentimiento → `META - Pixel Base` una sola vez.
3. Meta Test Events → `PageView`.
4. Lead de prueba exitoso → un solo `Lead` con `event_id` = requestId.
5. Si CAPI está activa: el mismo `Lead` aparece deduplicado (no dos conversiones).
6. Clic WhatsApp → `Contact`.
7. Publicar contenedor solo tras completar las pruebas.

## Limitación de verificación

No se ha inspeccionado el contenedor real de GTM ni el panel de Meta desde esta tarea. La existencia de etiquetas, los activadores, el consentimiento y la recepción de eventos deben comprobarse en Preview y Events Manager.

Paquete corto para copiar/pegar: `docs/gtm-copy-paste.md`.
