# especificacion-base

## Qué cambia

- El comportamiento vigente de agas_site pasa a una spec viva en `openspec/specs/`, organizada en 8 capabilities: `barrido`, `catalogo`, `promociones`, `seo-geo`, `sitio`, `analitica`, `marca` e `interfaz`.
- Se agrega una capa de tests de spec que cita cada requirement: `tests/spec/` y `e2e/spec/` en TypeScript, y `tests/python/spec/` con pytest. Cada suite trae una auditoría que falla ante citas rotas, requirements sin test o citas fuera de esa capa.
- Cambios de comportamiento que fija la spec:
  - `llms.txt` se construye en cada build: una promoción próxima deja de aparecer como «vigente» y las vencidas salen sin necesidad de regenerar el catálogo.
  - Se retira `src/data/catalogo.json`, que no tenía consumidores.
  - JSON-LD:
    - `ProductGroup` con `hasVariant` para las fichas con opciones.
    - La `Offer` gana disponibilidad, condición y vendedor.
    - `ItemList` en el catálogo y en las categorías.
    - Fechas en los `Article` de las guías.
  - El sitemap pone `lastmod` solo cuando hay una fuente con fecha.
  - Correcciones de la auditoría ui-ux-pro-max: contraste, foco, objetivos táctiles, header entre 768 y 869 px, íconos SVG en lugar de emoji, movimiento reducido, visor centrado, regiones `aria-live` y estado de la búsqueda y de la opción en la URL.
  - Barrido: una publicación que responde 403 o 404 deja de contar como error y su carpeta se poda. El generador tolera «Sin datos de reviews.» y los sufijos de votos.
  - Los CTA hacia Mercado Libre salen de `site.json`.

## No objetivos

- Pago directo, carrito o checkout.
- Cambiar la paleta, la tipografía o el copy de identidad.
- Automatizar la curación de promociones: la regla de qué publicar vive en la skill `refresco-catalogo`.
- `priceValidUntil`, `shippingDetails` y `hasMerchantReturnPolicy`, mientras no haya datos curados que los respalden.
- Configuración de Cloudflare.
