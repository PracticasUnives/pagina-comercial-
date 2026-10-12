# Revisión estática de seguridad y preparación de pagos

Fecha: 12 de octubre de 2026

## Alcance y estado

Revisión estática del HTML, JavaScript, configuración y documentación del sitio. No hay servidor, endpoint de pagos, procesador, dominio ni credenciales de comercio en el proyecto; por eso no fue posible evaluar esos componentes, ejecutar pagos sandbox ni certificar cumplimiento PCI/OWASP. Esta revisión no es una aprobación de Google ni de Apple.

### Cambios aplicados

- El carrito recuperado de `localStorage` se trata como entrada no confiable: solo acepta IDs conocidos y cantidades enteras de 1 a 99; datos dañados se descartan.
- Las vistas de productos y carrito se construyen con nodos DOM y `textContent`, sin interpolar valores en `innerHTML`.
- El token de Google Pay ya no se imprime en consola. Tokens y sesiones no se guardan en `localStorage`.
- Las solicitudes de pago solo admiten endpoint HTTPS del mismo origen (o `localhost` en desarrollo), envían credenciales del mismo origen y rechazan redirecciones.
- El cliente envía IDs/cantidades y el token; dejó de enviar su subtotal como si fuera una fuente confiable. El backend debe volver a cotizar y validar el pedido.
- Se añadió `Idempotency-Key` para correlacionar solicitudes; el backend y la pasarela aún deben imponer idempotencia y evitar cargos duplicados.
- Apple Pay solo aparece cuando están configurados merchant ID y endpoints y el navegador confirma compatibilidad mediante `applePayCapabilities` (con fallback a `canMakePayments`). La sesión de Apple se solicita en la acción del usuario; la validación se delega al servidor.
- El SDK de Apple se incluye con versión fija y Subresource Integrity. La SDK de Google se carga desde su dominio oficial.
- Se añadió una política de referrer más restrictiva.

## Riesgos abiertos antes de aceptar dinero

1. **Bloqueante — falta backend de pagos.** Implementar `paymentEndpoint` y `applePayValidationEndpoint`; usar una pasarela compatible con ambos wallets. Mantener certificados, llaves y secretos solo en el servidor o en el proveedor.
2. **Bloqueante — precios controlados por navegador.** Recalcular producto, precio, moneda, inventario, impuestos, entrega y total en el servidor. Rechazar el pago si el total de la hoja de pago no coincide con la cotización del servidor.
3. **Bloqueante — autorización del pedido.** Marcar el pedido pagado solo con confirmación verificable del procesador, usando webhooks firmados cuando el proveedor los ofrezca. No basarse en un `status` recibido del navegador.
4. **Bloqueante — protecciones de API.** Validar `Origin`, sesión y CSRF, autenticar/limitar las rutas, aceptar solo los campos esperados, validar límites de cantidades, aplicar idempotencia del lado del servidor y registrar eventos sin guardar tokens ni datos de tarjeta.
5. **Bloqueante — validación Apple SSRF.** El endpoint de sesión Apple debe validar que `validationURL` pertenezca a los hosts oficiales permitidos, bloquear IPs privadas y redirecciones arbitrarias, usar el certificado de identidad por mTLS y devolver solo la sesión mercantil de Apple. Nunca debe actuar como proxy web abierto.
6. **Pendiente — seguridad de despliegue.** Servir exclusivamente por HTTPS; configurar desde el servidor una CSP probada con los SDK, imágenes y fuentes realmente usados, `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y HSTS. No se añadieron cabeceras HTTP porque este proyecto no contiene servidor ni configuración de hosting.
7. **Privacidad/cadena de suministro.** Las fotos y fuentes de demostración se cargan desde servicios externos y reciben solicitudes del navegador del visitante. Sustitúyelas por recursos autorizados y alojados por el comercio, o documenta esos proveedores en privacidad. Los SDK oficiales de pago seguirán siendo externos.
8. **Operación del comercio.** Sustituir Casa Maíz, menú, importes e imágenes de ejemplo; publicar política de privacidad, términos, impuestos, entrega, reembolsos y datos de soporte reales.

## Contrato mínimo recomendado para el backend

### `POST /api/payments/confirm`

Entrada del navegador: `{ wallet, token, items: [{ id, quantity }], currency, fulfillment }` y encabezado `Idempotency-Key`. `wallet` solo puede ser `google_pay` o `apple_pay`. El backend debe buscar los precios en su catálogo y crear/cotizar el pedido; no confiar en un total enviado por el navegador. Pasar el token a la integración del proveedor sin registrarlo en logs. Responder con identificador y estado del pedido; el cliente solo muestra confirmación después de una respuesta aprobada del servidor.

### `POST /api/payments/apple/session`

Entrada: `{ validationURL }`. Exigir sesión/CSRF/origen propios, validar con allowlist exacta de Apple, obtener la sesión mediante mTLS en el servidor y devolver `{ merchantSession }`. No aceptar una URL arbitraria ni devolver certificados/llaves.

El servidor debe controlar idempotencia frente a reintentos y webhooks; la clave de encabezado del navegador, por sí sola, no evita doble cobro. Aplicar expiración y limpieza de pedidos no pagados.

## Alta y aprobación de Google Pay

1. Elegir un procesador participante y obtener de este los valores gateway y `gatewayMerchantId`; completar el endpoint seguro del backend.
2. Ejecutar y documentar la lista funcional y de marca de Google con `TEST`; ese modo no emite datos de pago cobrables.
3. Crear el perfil de comercio en Google Pay & Wallet Console; agregar el dominio público, seleccionar integración Gateway (o Direct si corresponde y se cumple PCI), adjuntar capturas y enviar a revisión.
4. Tras la aprobación, incorporar `merchantId`, cambiar a `PRODUCTION`, desplegar HTTPS y repetir las pruebas en navegadores/dispositivos compatibles.

Google Pay y Apple Pay tienen procesos de alta separados; una aprobación no sustituye la otra.

## Alta y aprobación de Apple Pay en la web

1. Confirmar si el proveedor administra el alta de Apple Pay o si el comercio lo hará directamente.
2. Si es directo, usar una cuenta Apple Developer con rol Account Holder/Admin para crear el Merchant ID, certificados requeridos y registrar/verificar cada dominio y subdominio de producción.
3. Servir el archivo de asociación de dominio que entrega Apple desde la ruta `.well-known` exacta exigida por su portal y verificar el dominio en la cuenta.
4. Configurar validación mercantil por servidor con certificado, y enviar el token de pago al procesador. No realizar la validación del comerciante desde el navegador.
5. Probar Safari en dispositivos compatibles con credenciales de sandbox del proveedor; revisar expiraciones de certificados y renovar dominio HTTPS.

La aprobación no puede completarse desde estos archivos: requiere dominio público, cuenta del comercio, portal de cada proveedor y credenciales/certificados gestionados por sus titulares.

## Referencias oficiales

- [Publicar integración de Google Pay](https://developers.google.com/pay/api/web/guides/test-and-deploy/publish-your-integration)
- [Lista de integración de Google Pay](https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist)
- [Tutorial de tokenización Google Pay](https://developers.google.com/pay/api/web/guides/tutorial)
- [Configurar Apple Pay en la web](https://developer.apple.com/documentation/applepayontheweb/configuring-your-environment)
- [Validación mercantil de Apple Pay](https://developer.apple.com/documentation/applepayontheweb/providing-merchant-validation)
- [Disponibilidad de Apple Pay](https://developer.apple.com/documentation/applepayontheweb/checking-for-apple-pay-availability)
