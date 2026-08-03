# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/). Para el
criterio de bump y el flujo de release, ver la sección "Versionado y releases"
del README.

## [Unreleased]

### Agregado

- Medición con Google Analytics 4: pageviews en todas las páginas y evento
  `clic_saliente` al hacer click en cualquier link hacia Mercado Libre,
  condicionado a `PUBLIC_GA4_ID` en build de producción (ver guía de lectura
  en `docs/analitica.md`).
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
- JSON-LD `BreadcrumbList` en las fichas de producto (`buildBreadcrumbList`
  en `src/lib/seo.ts`), con los mismos nombres que la miga visible.
- Campo opcional `metaTitulo` en la colección `guias`, usado para componer
  un `<title>` más corto que el título editorial sin tocar el H1.
- Guard en `e2e/seo.spec.ts` que verifica que la meta description de cada
  página muestreada mida 160 caracteres o menos.
- Test de sincronía en `tests/unit/textos-productos.test.ts`: toda cifra
  `N.N★` en la copy curada de `src/data/textos-productos.json` debe
  coincidir con `reviews.promedio` de ese slug en `src/data/catalogo.json`,
  para que un refresco del barrido no deje valoraciones obsoletas
  publicadas en silencio.
- Catálogo regenerado con el barrido de Mercado Libre del 2026-08-03: nuevo
  producto "Audífonos Bluetooth TWS Ultrapods Pro" (slug
  `audifonos-bluetooth-tws`, familia de 4 colores: Azul, Negro, Rosa y
  Blanco) en la categoría audio; el catálogo pasa de 22 a 23 productos
  (`python3 -c "import json; print(len(json.load(open('src/data/catalogo.json'))['productos']))"`
  → `23`); imágenes y precios referenciales de los productos del barrido
  refrescados.

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
- Meta descriptions de `/productos/`, `/terminos-y-condiciones/`,
  `/categorias/nintendo-switch/`, `/preguntas-frecuentes/` y de la guía
  "Cómo proteger tu control de PS5" acortadas a 155 caracteres o menos.
- `<title>` de las 5 guías de `content/guias/` acortado con `metaTitulo`
  (el título editorial y el H1 no cambian).
- `tests/unit/resenas.test.ts`: el barrido del 2026-08-03 marca
  `pack-3-laminas-vidrio-switch-2` como publicación de catálogo compartido
  de Mercado Libre (`grep -n "Catálogo" ../agas-context/publicaciones/MLC1880083137*/publicacion.md`
  → `Catálogo: Sí`), así que su review sale del agregado de `resenas.json`
  igual que las otras publicaciones de catálogo ya excluidas; se agrega el
  slug a `SLUGS_REVIEWS_CATALOGO_ML` en el test.
- Descripción de la categoría `audio` (`CATEGORIAS` en
  `scripts/generar-catalogo.mjs` y `src/data/site.json`), de "Audífonos y
  manos libres USB-C para tu celular." a "Audífonos con cable USB-C y
  Bluetooth TWS inalámbricos para tu celular.", para cubrir el producto
  Bluetooth TWS nuevo.

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
- La meta description de `pack-2-laminas-vidrio-switch-oled` decía `4.9★`
  cuando el barrido del 2026-08-03 baja el promedio a `4.8` (17 reviews);
  ahora coincide con el JSON-LD `aggregateRating` de su propia ficha.

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
