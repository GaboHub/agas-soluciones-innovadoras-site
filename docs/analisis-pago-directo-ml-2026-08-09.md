# Spike: pago directo con el ecosistema Mercado Libre / Mercado Pago

Fecha: 2026-08-09. Pregunta del spike: ¿se puede (a) agregar una plataforma de pago directa
con ML al sitio, o (b) hacer que el CTA de un producto lleve al usuario a armar su carrito
en Mercado Libre en lugar de a la publicación?

## Veredicto

| Vía | Viabilidad |
| --- | --- |
| (b) Precargar el carrito del comprador en ML desde el sitio | **No posible** de forma soportada |
| (a) Checkout propio con Mercado Pago en el sitio | **Viable con esfuerzo bajo**, con trade-offs operativos |

## (b) Carrito de Mercado Libre desde un sitio externo: no existe

- La API de ML Developers es solo de operación del vendedor (items, orders, shipments,
  questions). No hay ningún recurso `POST /carts` ni API de checkout del lado comprador; lo
  que las docs llaman "carrito" es post-venta (`GET /packs/$PACK_ID`, `GET /orders/$ORDER_ID`).
  Índice oficial: <https://developers.mercadolibre.cl/es_ar/api-docs-es>.
- No hay esquema de URL documentado que precargue cantidad/variante ni dispare "agregar al
  carrito" o "comprar ahora". Las rutas internas (`/gz/cart`) exigen sesión y no tienen
  contrato público; los deep links `meli://` que circulan en blogs abren la ficha del
  producto, no el carrito. Cualquier solución sería un hack sobre rutas internas, frágil y
  contrario a los T&C de developers
  (<https://developers.mercadolibre.cl/es_cl/terminos-y-condiciones>).
- El Programa de Afiliados y Creadores de ML Chile (2025,
  <https://www.mercadolibre.cl/ayuda/39155>) confirma la dirección: permite links a
  productos y prohíbe expresamente links a carritos y páginas de pago. No hay widgets ni
  botones embebibles oficiales para sitios externos.
- Máximo alcanzable soportado: permalink al ítem exacto con su variante (lo que el sitio ya
  hace) y, en la ficha, el comprador tiene "Comprar ahora" a un click. Complemento posible:
  CTA a la tienda oficial y, si interesara comisión/tracking, links de afiliado.

## (a) Checkout propio con Mercado Pago: viable, el costo es operativo

Opciones por esfuerzo (docs oficiales de <https://www.mercadopago.cl/developers>):

1. **Link de pago (sin código, esfuerzo casi nulo).** Se crea a mano en el panel de MP y se
   enlaza con un `<a href>`. Sin backend, sin carrito, sin stock; sirve como piloto para
   validar demanda. <https://www.mercadopago.cl/herramientas-para-vender/link-de-pago>
2. **Checkout Pro (esfuerzo bajo).** `POST /checkout/preferences` con el Access Token —
   que es privado y debe vivir en backend — y redirect al `init_point`. En este stack basta
   **una Pages Function** en Cloudflare (~50 líneas, `MP_ACCESS_TOKEN` como secret); la
   Public Key sí puede ir al cliente. Webhook opcional para confirmar pagos.
   <https://www.mercadopago.cl/developers/es/docs/checkout-pro/integrate-preferences>
3. **Checkout Bricks / API (esfuerzo medio-alto).** Pago transparente en el sitio; exige
   backend real (procesar `/v1/payments`, webhooks, estados). No se justifica para una
   vitrina.

Comisiones (fuentes oficiales, verificadas 2026-08-09):

| Canal | Comisión | Liberación |
| --- | --- | --- |
| MP Checkout / Link de pago | 3,19 % + IVA | al instante |
| MP Checkout / Link de pago | 2,89 % + IVA | a 10 días |
| ML marketplace Clásica | 8–17 % según categoría | — |
| ML marketplace Premium | 11–21 % según categoría | — |

Fuentes: <https://www.mercadopago.cl/herramientas-para-vender/check-out>,
<https://www.mercadolibre.cl/ayuda/costos-de-vender-un-producto_870>.

Trade-offs de vender directo:

- Sin Mercado Envíos ni reputación de ML: el despacho pasa a ser propio
  (Starken/Chilexpress/Bluexpress) y la venta no alimenta la reputación del vendedor.
- Cuotas sin interés: en MP propio las financia el vendedor si las ofrece
  (<https://www.mercadopago.cl/ayuda/16182>); el cliente igual puede pagar en cuotas con
  interés sin costo para AGAS.
- Emisión de boleta electrónica SII por cada venta y términos de compra/devoluciones (Ley
  del Consumidor) en el sitio: hoy ese flujo lo absorbe ML.
- Las políticas de ML (<https://www.mercadolibre.cl/seguro_publicacion.html>) prohíben
  promocionar el checkout propio **desde las publicaciones de ML** (sanción hasta cancelar
  la cuenta). Tener checkout en agassoluciones.cl y atraer tráfico por SEO/directo es
  legítimo; lo prohibido es enlazarlo desde ML.

## Recomendación

Descartar la vía (b): mantener el CTA al permalink es lo máximo que ML soporta. Si se
quiere cobrar directo, camino escalonado: piloto con links de pago (cero código) y, si
valida demanda, Checkout Pro con una Pages Function. El riesgo dominante no es técnico
sino operativo: logística, boletas y atención postventa dejan de estar cubiertos por ML.
