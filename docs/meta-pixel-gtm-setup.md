# Configuración de Meta Pixel mediante Google Tag Manager

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

## 2. Etiqueta base del Pixel

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

El activador debe respetar el consentimiento: dado que GTM se inserta tras aceptar medición, no agregues una instalación alternativa que eluda ese flujo. Si la configuración de consentimiento de GTM ya existe, comprueba que la etiqueta también requiere el consentimiento de publicidad/marketing adecuado para la jurisdicción y la política del sitio.

## 3. Evento Lead

Crear etiqueta HTML personalizado `META - Lead`:

```html
<script>
if (typeof fbq === 'function') {
  fbq('track','Lead');
}
</script>
```

Activador: **Evento personalizado**, nombre exacto `generate_lead`.

La aplicación emite `generate_lead` después de que `POST /api/leads` devuelve una respuesta OK. No lo actives con el clic del botón de envío: eso contaría intentos fallidos. Durante QA, verifica que un lead de prueba exitoso produzca un solo evento.

## 4. Evento Contact para clic a WhatsApp

Crear etiqueta HTML personalizado `META - Contact`:

```html
<script>
if (typeof fbq === 'function') {
  fbq('track','Contact');
}
</script>
```

Activador: **Evento personalizado**, nombre exacto `whatsapp_click`.

Esto mide el clic que inicia la apertura de WhatsApp; no demuestra que se haya enviado un mensaje ni que se haya iniciado una conversación.

## 5. Orden y duplicación

- Mantén una única etiqueta base de Pixel.
- No agregues `PageView` a las etiquetas de `Lead` o `Contact`.
- Si GTM permite configurar secuenciación de etiquetas en este contenedor, configura la base como etiqueta de configuración previa para las etiquetas de evento, y valida el resultado en Preview. No publiques si el orden no está confirmado.
- No envíes el `event_id` como sustituto de deduplicación. La deduplicación entre Pixel y Conversions API requiere enviar el mismo identificador de evento por ambos canales y confirmar la configuración del servidor; no se presupone que exista.
- No habilites Advanced Matching ni envíes parámetros de usuario sin una revisión explícita de consentimiento, base legal y privacidad.

## 6. Prueba antes de publicar

1. En GTM Preview, rechaza el consentimiento y confirma que el Pixel no se dispara.
2. En otra sesión limpia, acepta el consentimiento y confirma que `META - Pixel Base` se ejecuta una sola vez.
3. En Meta Events Manager, abre **Test Events** y verifica un `PageView`.
4. Envía un lead de prueba y verifica un único `Lead` después de una respuesta exitosa de la API.
5. Haz clic en WhatsApp y verifica un `Contact`.
6. Revisa consola y Network para detectar errores y cargas duplicadas.
7. Publica el contenedor solo tras completar las pruebas y revisar la política de privacidad.

## Limitación de verificación

No se ha inspeccionado el contenedor real de GTM ni el panel de Meta desde esta tarea. La existencia de etiquetas, los activadores, el consentimiento y la recepción de eventos deben comprobarse en Preview y Events Manager; este documento no afirma que ya estén activos.
