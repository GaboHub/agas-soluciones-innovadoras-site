# agassoluciones.cl — catálogo AGAS Soluciones Innovadoras

Sitio estático de catálogo de **AGAS Soluciones Innovadoras**, ecommerce
chileno de accesorios de tecnología (Nintendo Switch, PlayStation 5 y audio
USB-C) que vende a través de Mercado Libre. El sitio es una vitrina: no hay
carrito ni checkout; cada producto enlaza a su publicación en Mercado Libre
("Ver en Mercado Libre") y a la tienda oficial.

Está construido con **Astro 7 + React islands + Tailwind CSS 4**, con SEO
(meta tags, Open Graph, JSON-LD) y tests (Vitest + Playwright) resueltos.
Los datos de negocio viven solo en `src/data/*.json`, `content/` y los
tokens `@theme` de `src/styles/global.css`; ningún componente tiene datos
hardcodeados.

## Qué trae

- **Astro 7** como framework, con salida 100% estática (sin adapter/SSR).
- **React 19** para las islas interactivas: buscador del catálogo
  (`BuscadorProductos`) y ficha de producto unificada (`FichaProducto`) con
  galería con lightbox (`GalleryLightbox`) y selector de variantes, diseños
  y miembros de familia con deep-link a Mercado Libre por opción.
- **Tailwind CSS 4** con tokens de marca centralizados (`@theme` en
  `global.css`): azul y naranja del logo AGAS, cambiables en un solo lugar.
- **Content Collections** de Astro cargando markdown desde `./content/`
  (páginas y fichas de producto con frontmatter tipado y validado con Zod).
- **SEO resuelto**: `BaseLayout` genera meta tags, Open Graph, Twitter Card
  y JSON-LD (`Organization`, `Product` con `Offer`, `FAQPage`, `WebSite`).
- **Reseñas reales de Mercado Libre** (`src/data/resenas.json`) y FAQs
  transversales (`src/data/faqs.json`).
- **Guías de compra y uso** (`content/guias/`): contenido editorial escrito
  a mano para SEO, enlazado desde las fichas de producto relacionadas
  (`productosRelacionados` en su frontmatter) y listado en `llms.txt`.
- **Descripciones propias por producto** (`src/data/textos-productos.json`):
  overrides manuales de descripción y meta description por slug, por sobre
  el texto que trae el barrido de Mercado Libre.
- **Burbuja flotante de Mercado Libre** (`BurbujaMercadoLibre`, Astro puro
  sin JS): en todas las páginas lleva a la tienda; en la ficha de producto
  apunta siempre al mismo destino que el CTA "Ver en Mercado Libre",
  sincronizada con la variante activa.
- **Tests**: Vitest (`tests/unit/`) valida catálogo, imágenes, reseñas,
  FAQs y SEO; Playwright (`e2e/`) cubre navegación, buscador, ficha de
  producto, familias, SEO y responsive en desktop y mobile.

## Estructura del proyecto

```text
agas_site/
├── content/
│   ├── guias/                  Guías de compra y uso (manuales, no generadas)
│   ├── paginas/                Inicio, categorías, contacto, términos
│   └── productos/              Fichas de producto (generadas por el script)
├── src/
│   ├── pages/                  /, /productos/, /productos/[slug]/, /categorias/[slug]/,
│   │                           /guias/, /guias/[slug]/, /preguntas-frecuentes/, /contacto/,
│   │                           /terminos-y-condiciones/, 404
│   ├── components/             Componentes Astro + islands React (buscador, galería, selector)
│   ├── layouts/                BaseLayout con SEO (meta, OG, JSON-LD) y burbuja de Mercado Libre
│   ├── lib/                    site, seo, images, galeria, productos, ficha, formato, faqs,
│   │                           resenas, guias, textos
│   ├── data/                   site.json, faqs.json, catalogo.json, resenas.json,
│   │                           textos-productos.json
│   ├── assets/images/          Logos SVG + imágenes de producto (productos/<slug>/*.webp)
│   └── styles/global.css       Tokens de marca (colores y fuentes) con Tailwind 4 `@theme`
├── scripts/
│   └── generar-catalogo.mjs    Regenera el catálogo desde ../agas-context
├── e2e/                        Pruebas Playwright (projects desktop/mobile)
├── tests/unit/                 Pruebas Vitest
└── public/                     robots.txt, llms.txt, favicon.svg, logo.png
```

Las colecciones de contenido cargan directamente desde `./content/`
(ver `src/content.config.ts`). Los textos de las páginas se editan en esos
markdown; las fichas de `content/productos/` las produce el script y no se
editan a mano.

## Comandos

| Comando             | Acción                                                    |
| :------------------- | :--------------------------------------------------------- |
| `npm install`        | Instala dependencias                                       |
| `npm run dev`        | Servidor de desarrollo en `localhost:4321`                  |
| `npm run build`      | Genera el sitio estático en `./dist/`                       |
| `npm run preview`    | Sirve `dist/` tal como quedaría publicado                   |
| `npm run test:unit`  | Pruebas unitarias (Vitest)                                  |
| `npm run test:e2e`   | Pruebas end-to-end (Playwright, projects desktop/mobile)    |
| `npm test`           | Ambas suites                                                |
| `npm run generar`    | Regenera el catálogo desde el contexto de Mercado Libre     |

## Refresco del catálogo

`npm run generar` ejecuta `scripts/generar-catalogo.mjs`, que lee el barrido de publicaciones de Mercado Libre desde `../agas-context` (configurable con la variable de entorno `AGAS_CONTEXT_DIR`) y regenera desde cero:

- `content/productos/*.md`: una ficha por publicación lógica, con frontmatter estructurado (FAQs, reviews, variantes, grupos) y la descripción limpia como cuerpo.
- `src/assets/images/productos/<slug>/`: imágenes convertidas a WebP (máximo 800 px de lado mayor).
- `src/data/catalogo.json` y `src/data/resenas.json`: fuentes para listados, buscador y reseñas.
- `public/llms.txt`: resumen del catálogo para agentes de IA.

El script es idempotente: borra y vuelve a crear todo lo que produce. El flujo completo de actualización es: regenerar `agas-context/` → `npm run generar` → `npm run build`.

Lo que el script **no** toca: `content/guias/` y `src/data/textos-productos.json` son contenido editorial manual y sobreviven intactos a cada regeneración (las guías solo se *leen* para listarlas en `llms.txt`). Requisito de entrada: que `../agas-context` exista con el barrido de publicaciones; sin él, `npm run generar` falla y el resto del sitio sigue construyendo con lo último generado y commiteado.

## Datos manuales vs generados

- **Manuales**: `src/data/site.json` (identidad, categorías y su orden de
  productos, enlaces de Mercado Libre), `src/data/faqs.json` (FAQs
  transversales), `content/paginas/*.md`, `content/guias/*.md` (guías de
  compra/uso: se escribieron una vez y solo cambian editando su markdown),
  `src/data/textos-productos.json` (descripciones y meta descriptions
  propias por slug), tokens de `global.css`, logos.
- **Generados** (no editar a mano; corregir en `agas-context` y regenerar):
  `content/productos/*.md`, `src/assets/images/productos/`,
  `src/data/catalogo.json`, `src/data/resenas.json`, `public/llms.txt`.

Si se agrega o quita un producto del catálogo, hay que actualizar el
arreglo `productos` de su categoría en `site.json` (los tests validan la
consistencia entre ambos) y los conteos exactos de `tests/unit/`.

## Runbook: deploy y dominio

1. **Deploy en Cloudflare (Workers & Pages)**: en el dashboard actual,
   "Create application" → conectar con GitHub → seleccionar este
   repositorio (no usar la opción de subir estático a mano, para que cada
   push dispare build y deploy automáticos). Ajustes:

   | Ajuste                  | Valor           |
   | :---------------------- | :-------------- |
   | Root directory          | `/`             |
   | Build command           | `npm run build` |
   | Deploy command          | `npx wrangler deploy` (dejar el default) |
   | Framework preset        | Astro (si aparece la opción) |
   | Variable `NODE_VERSION` | `22.12.0` (o la del `.nvmrc`) |

   El sitio es 100% estático (Astro sin adapter): no hay SSR ni funciones.
   `wrangler.jsonc` en la raíz declara `assets.directory: "./dist"`, así
   que `wrangler deploy` sabe qué publicar sin necesidad de un Worker
   propiamente tal. Cada push a la rama de producción dispara build y
   publicación automáticos; las Pull Requests generan *preview
   deployments*. Alternativa manual sin integración Git: `npm run build
   && npx wrangler deploy`.

2. **Dominio `.cl`**: registra `agassoluciones.cl` en NIC Chile y apunta
   sus nameservers a Cloudflare (zona del dominio en la misma cuenta que el
   proyecto de Pages). Conecta el dominio en el proyecto de Pages → Custom
   domains (raíz y `www`), y define la redirección 301 `www` → raíz para
   que la única versión canónica coincida con `site:
   'https://agassoluciones.cl'` en `astro.config.mjs` (que también fija el
   sitemap y las URLs canónicas).

3. **Google Search Console**: verifica la propiedad del dominio y envía el
   sitemap (`https://agassoluciones.cl/sitemap-index.xml`).

## Notas de diseño

- `trailingSlash: 'always'` en `astro.config.mjs` es coherente con el
  servido de Cloudflare Pages (`/productos/` → `/productos/index.html`).
- Los tokens de color de `global.css` son de **rol**, no de color literal:
  `primario` (azul AGAS: marca, headers, CTAs), `acento` (naranja AGAS:
  estrellas y detalles; su variante `-oscuro` se usa para texto sobre fondo
  claro por contraste AA), `destacado` (gris azulado: etiquetas), `tinta`
  (texto) y `fondo` (superficie). Retematizar el sitio es editar los
  valores de `@theme` y las fuentes en `global.css`.
- El sitio nunca muestra stock ni promociones: los precios son
  referenciales con su fecha, y el precio vigente vive en la publicación de
  Mercado Libre de cada producto.
- Las familias de productos (fundas PS5 por diseño/color, cargador dual por
  color) se agrupan en una sola ficha con selector; cada combinación enlaza
  a su propia publicación de Mercado Libre.
