# Migración de rate limiting de leads: Upstash → Vercel Firewall

## Estado
Propuesta en PR; no cambia variables ni despliegues de producción. El modo predeterminado sigue siendo `upstash`.

## Por qué
Actualmente, un error o una configuración ausente de Upstash provoca `503` en `POST /api/leads`. Redis no almacena leads ni garantiza reintentos durables: solo aporta el rate limiting distribuido.

## Condición obligatoria antes de retirar Upstash
1. En Vercel, confirmar que el plan/proyecto tiene disponible Firewall rate limiting.
2. Crear una regla específica para `POST /api/leads` con umbral inicial conservador y acción de limitación/bloqueo; no confiar solo en límites del frontend.
3. Confirmar que la regla utiliza una señal fiable de cliente y no permite que el usuario falsifique cabeceras de IP. Validar el comportamiento real en Preview.
4. Probar tráfico normal, ráfagas, respuestas limitadas y logs/eventos de Firewall. Verificar que la regla no bloquea tráfico legítimo de formularios.
5. Mantener un procedimiento de rollback a Upstash.

## Activación
Solo después de superar las pruebas, establecer `LEADS_RATE_LIMIT_MODE=infrastructure` en Preview. La variable hace que la ruta omita el límite de Upstash; **no configura Firewall**. Mantener `upstash` en producción hasta verificar Preview y aprobar el cambio. Luego desplegar con el modo infraestructura y vigilar errores, volumen de solicitudes y creación de contactos.

## Pruebas de aceptación
- Solicitud válida crea un contacto en HubSpot y devuelve `201`.
- Payload inválido devuelve `400`; honeypot no llega al CRM.
- Sin IP reconocible devuelve `400`.
- En modo `upstash`, ausencia/error de credenciales de Redis mantiene el comportamiento seguro `503`.
- En modo `infrastructure`, las reglas de Firewall limitan solicitudes excesivas y el tráfico legítimo sigue funcionando.
- Verificar duplicados/reintentos y no interpretar una respuesta de error como lead guardado.
- Ejecutar `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.

## Fuera de alcance
Esta migración no crea una cola durable ni reintenta automáticamente fallos de HubSpot. Para recuperación fiable se necesita persistir el lead antes de responder y procesarlo desde una cola/almacenamiento durable, con idempotencia. No se debe prometer entrega durable mientras eso no esté implementado.
