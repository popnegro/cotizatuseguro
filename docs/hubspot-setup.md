# Configuración de HubSpot

## Variables de entorno

Configurar `HUBSPOT_ACCESS_TOKEN` como variable **privada** en Vercel para Preview y Production según corresponda. Nunca usar el prefijo `NEXT_PUBLIC_`, commitear el token ni pegarlo en logs.

Crear una Private App de HubSpot con el permiso mínimo necesario para crear contactos: `crm.objects.contacts.write`. El endpoint usa `POST /crm/v3/objects/contacts`.

## Propiedades del contacto

El endpoint envía estas propiedades estándar de contacto:

- `email`: email ingresado; HubSpot lo usa como identificador habitual del contacto.
- `firstname` y `lastname`: nombre y apellido separados.
- `phone`: WhatsApp con espacios, paréntesis, puntos y guiones eliminados.
- `state`: provincia.
- `city`: ubicación informada para Hogar/Consorcio; en otras tipologías usa la provincia.
- `lifecyclestage`: `lead`.

Antes de probar, confirmar en el portal de HubSpot que existan las propiedades personalizadas con estos **nombres internos** (no solo las etiquetas visibles):

- `insurance_product`: texto o lista desplegable con los valores internos que usa la aplicación (`auto`, `moto`, `hogar`, `comercio`, `bicicletas`, `vida`, `accidentes_personales`, `art`, `consorcio`, `viajes`, `caucion_alquiler`).
- `insurance_request_id`: texto.
- `insurance_request_details`: texto de varias líneas; la aplicación serializa los detalles específicos del producto en JSON y limita el valor a 900 caracteres.
- `lead_source`: texto o lista con opción `direct` y las fuentes que la organización use.
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`: propiedades de texto si se desea conservar esta atribución. Los valores vacíos se omiten.

La disponibilidad y los tipos de las propiedades deben confirmarse en el portal; este repositorio no puede verificar la configuración de una cuenta HubSpot.

## Tipologías y validación

La API valida los campos comunes (nombre y apellido, email, WhatsApp y provincia) y los detalles específicos de Autos, Motos, Hogar, Consorcio, Bicicleta y Caución alquiler. Los detalles se guardan en `insurance_request_details`; no se crean automáticamente propiedades individuales por cada detalle.

## Verificación segura

1. Usar un contacto ficticio claramente identificado como QA y un entorno de Preview autorizado.
2. Confirmar que la API responde `201` e incluye `requestId` y `contactId`.
3. Buscar el contacto en HubSpot y verificar email, nombre, apellido, teléfono, provincia, tipología, detalles y atribución.
4. No usar datos de clientes reales para pruebas ni desactivar la protección del deployment para sortear restricciones de acceso.
5. Las pruebas automatizadas simulan `fetch`: no crean contactos en HubSpot y no validan que las propiedades existan en el portal.
