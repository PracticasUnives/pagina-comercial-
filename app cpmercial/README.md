# Casa Maíz · tienda web de demostración

Sitio adaptable en español para una tienda de comida mexicana. El nombre, el menú, los precios y las imágenes son de muestra; sustitúyelos por contenido autorizado del comercio antes de publicar.

## Pagos

Hay puntos de integración para Google Pay y Apple Pay en el navegador. El cliente no guarda datos de pago y no declara una orden pagada por sí mismo. En este estado no hay backend ni procesador configurados, por lo que **no se pueden cobrar pagos reales ni solicitar aprobación final**.

Edita `config.js` cuando exista un backend propio bajo el mismo origen HTTPS:

- `paymentEndpoint`: confirma pagos y crea pedidos después de que el procesador valide el token.
- `applePayValidationEndpoint`: obtiene la sesión mercantil de Apple en el servidor; nunca debe llamar a Apple directamente desde el navegador.
- `googlePayEnvironment`: mantén `TEST` hasta terminar el alta de la integración y pruebas del procesador.
- Merchant IDs y valores de pasarela: solo los identificadores públicos de comercio que exige cada API; nunca pongas certificados, llaves privadas ni secretos en JavaScript.

El frontend envía `wallet`, el token recibido de la billetera, IDs/cantidades de artículos, moneda y modalidad. **El backend debe recalcular el total usando su catálogo**, validar inventario, impuestos y envío, aplicar idempotencia, procesar el token con la pasarela y confirmar el pedido solo cuando el procesador responda que el pago fue aprobado. El precio calculado en el navegador es solo para presentar el pedido.

Consulta [SECURITY_AND_PAYMENTS.md](SECURITY_AND_PAYMENTS.md) para la revisión y los pasos de aprobación de Google Pay y Apple Pay.

## Vista previa

Abre `index.html` o sirve la carpeta desde `localhost`. Las APIs de pago requieren un origen seguro; para producción se necesita HTTPS. El modo de prueba de Google no genera credenciales de pago cobrables.

## Personalizar

- Cambia marca y copy en `index.html`.
- Edita productos y precios de muestra en el arreglo `products` de `app.js`.
- Ajusta colores y composición en `styles.css`.
- El carrito local guarda solamente IDs y cantidades, y se valida al recuperarse.

## Pendiente antes de publicar

Marca y menú confirmados, derechos de imágenes, cobertura/costo de entrega, impuestos, privacidad y términos, proveedor de pagos, backend HTTPS, dominio y cabeceras de seguridad, pruebas en dispositivos compatibles y alta por separado en Google Pay y Apple Developer.
