# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/). Para el
criterio de bump y el flujo de release, ver la sección "Versionado y releases"
del README.

## [Unreleased]

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
