# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/). Para el
criterio de bump y el flujo de release, ver la sección "Versionado y releases"
del README.

## [Unreleased]

### Agregado

- Guía "Cómo colocar los grips en las palancas de tu control"
  (`content/guias/como-colocar-grips-control.md`), enlazada desde las
  fichas de los 5 productos con grips relacionados.
- Hook de pre-commit (`.githooks/pre-commit`) que corre `npm test` antes de
  cada commit y lo bloquea si falla; se activa automáticamente con `npm
  install` vía el script `prepare` (`core.hooksPath`).
- Página `/promociones/` con los cupones y campañas vigentes de la tienda
  de Mercado Libre, y su enlace en el header y el footer.
- Bloque de promociones a nivel tienda en la ficha de cada producto
  (`src/components/PromocionesResumen.astro`), con enlace a
  `/promociones/`.
- Sección `## Promociones` en `public/llms.txt`, generada desde
  `src/data/promociones.json`.
- JSON-LD `SaleEvent` por cada campaña publicable en `/promociones/`
  (`buildSaleEvent` en `src/lib/seo.ts`).
- `lastmod` en todas las URLs del sitemap (fecha de build).
- Test de sincronía entre `public/llms.txt` y `src/data/promociones.json`
  en `tests/unit/contenido.test.ts`.

### Cambiado

- El generador de catálogo (`npm run generar`) sube el máximo de imágenes
  por producto, variante y miembro de familia a 7 (antes 6/3/5
  respectivamente); el límite sigue siendo un tope, no un mínimo.
- Invariante de promociones: el sitio ahora publica promociones y cupones
  curados a mano desde `src/data/promociones.json` (antes nunca se
  mostraban), con ventana de vigencia explícita y filtrado por fecha en
  build; las promos vencidas requieren un redeploy periódico para dejar
  de mostrarse (ver `docs/adr/0001-promociones-curadas.md` y
  `docs/adr/0002-filtrado-promos-solo-en-build.md`).
- Meta description de `/promociones/` acortada a menos de 150 caracteres.

### Eliminado

- Filtrado de vigencia de promociones en cliente (`src/lib/promoFiltro.ts`
  y los `<script>` que lo invocaban en `/promociones/` y en
  `PromocionesResumen.astro`): la vigencia se filtra solo en build (ver
  `docs/adr/0002-filtrado-promos-solo-en-build.md`).

### Corregido

- El enlace a la tienda de Mercado Libre (`site.mercadolibre.tienda`) usa
  `https` en vez de `http`.
- La reputación del home excluye las reseñas de publicaciones de catálogo
  de Mercado Libre (compartidas entre todos los vendedores de esa página
  de producto): solo cuenta reseñas de publicaciones propias de AGAS.

## [1.0.0] - 2026-07-22

Primera versión estable del sitio en producción (agassoluciones.cl).

### Agregado

- Sitio catálogo estático con Astro 7, islas React 19 y Tailwind CSS 4:
  home, listado de productos con buscador, categorías, fichas de producto
  con galería/lightbox y selector de variantes, diseños y familias con
  deep-link a Mercado Libre por opción.
- Generador de catálogo (`npm run generar`) que lee el barrido de
  publicaciones de Mercado Libre desde `../agas-context` y produce fichas,
  imágenes WebP, `catalogo.json`, `resenas.json` y `llms.txt`.
- Guías de compra y uso (`content/guias/`) y descripciones propias por
  producto (`textos-productos.json`), ambas editoriales.
- Páginas de preguntas frecuentes, contacto, términos y condiciones y 404.
- SEO completo: meta tags, Open Graph, Twitter Card, JSON-LD
  (Organization, Product/Offer, FAQPage), sitemap, robots.txt con Content
  Signals afirmativas para búsqueda e IA.
- Reseñas reales de Mercado Libre en home y fichas de producto.
- Burbuja flotante de Mercado Libre en todas las páginas: lleva a la
  tienda oficial y, en la ficha de producto, al mismo destino que el CTA
  "Ver en Mercado Libre", sincronizada con la variante activa.
- Suites de tests: Vitest (unitarias de datos, SEO y ficha) y Playwright
  (e2e desktop y mobile).
- Deploy en Cloudflare (Workers & Pages) con Wrangler y assets estáticos.

[Unreleased]: https://github.com/GaboHub/agas-soluciones-innovadoras-site/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/GaboHub/agas-soluciones-innovadoras-site/releases/tag/v1.0.0
