# Paquete GTM — copiar/pegar (HUMAN GATE mínimo)

Contenedor: `GTM-K2BSJ2W6` · Pixel: `1635609034873051`

## Checklist (orden)

1. [ ] Variable `DLV - event_id` (capa de datos → `event_id`)
2. [ ] Etiqueta `META - Pixel Base` (HTML, All Pages)
3. [ ] Etiqueta `META - Lead` (HTML, evento `generate_lead`)
4. [ ] Etiqueta `META - Contact` (HTML, evento `whatsapp_click`)
5. [ ] Preview → QA → Publicar

---

### 1. Variable

- Tipo: **Variable de capa de datos**
- Nombre: `DLV - event_id`
- Nombre de variable DL: `event_id`
- Versión: 2

### 2. META - Pixel Base

Activador: **All Pages**

```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1635609034873051');
fbq('track','PageView');
</script>
```

### 3. META - Lead

Activador: **Evento personalizado** = `generate_lead`

```html
<script>
if (typeof fbq === 'function') {
  var eid = {{DLV - event_id}};
  if (eid) fbq('track', 'Lead', {}, { eventID: String(eid) });
  else fbq('track', 'Lead');
}
</script>
```

### 4. META - Contact

Activador: **Evento personalizado** = `whatsapp_click`

```html
<script>
if (typeof fbq === 'function') { fbq('track','Contact'); }
</script>
```

### 5. QA rápido

| Paso | Esperado |
|------|----------|
| Rechazar consentimiento | Sin Pixel |
| Aceptar + cargar home | 1× PageView |
| Lead QA OK | 1× Lead + event_id = SOL-… |
| Clic WhatsApp | 1× Contact |

Ver también: `docs/meta-conversions-api.md` (CAPI servidor) y `docs/meta-pixel-gtm-setup.md` (detalle).
