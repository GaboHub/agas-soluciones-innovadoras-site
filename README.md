# agassoluciones.cl — catálogo AGAS Soluciones Innovadoras

Sitio estático de catálogo de **AGAS Soluciones Innovadoras**, tienda chilena
que elige con criterio productos para el día a día y los vende a través de
Mercado Libre; hoy el catálogo es accesorios de tecnología (Nintendo Switch,
PlayStation 5 y audio). El sitio es una vitrina: no hay
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
  `global.css`): la paleta y las tipografías de la identidad AGAS,
  cambiables en un solo lugar.
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
- **Salto permanente a Mercado Libre** (Astro puro sin JS): la burbuja
  flotante (`BurbujaMercadoLibre`), visible en todos los viewports, que en
  todas las páginas lleva a la tienda y en la ficha de producto apunta
  siempre al mismo destino que el CTA "Ver en Mercado Libre", sincronizada
  con la variante activa.
- **Spec viva**: `openspec/specs/<capability>/spec.md` (8 capabilities) es
  la fuente de verdad del comportamiento.
- **Tests**: Vitest (`tests/unit/`) valida catálogo, imágenes, reseñas,
  FAQs y SEO; Playwright (`e2e/`) cubre navegación, buscador, ficha de
  producto, familias, SEO y responsive en desktop y mobile. La capa de spec
  (`tests/spec/`, `e2e/spec/` y `tests/python/spec/`) cita cada requirement
  por nombre; su auditoría (`tests/spec/auditoria/propias.ts` exige las 8
  capabilities, y `tests/python/test_auditoria_spec.py` la de `barrido`) falla
  ante una cita rota o un requirement sin test. `tests/python/` prueba el
  barrido con pytest.

## Estructura del proyecto

```text
agas_site/
├── openspec/specs/             Spec viva por capability (fuente de verdad)
├── content/
│   ├── guias/                  Guías de compra y uso (manuales, no generadas)
│   ├── paginas/                Inicio, categorías, contacto, términos
│   └── productos/              Fichas de producto (generadas por el script)
├── src/
│   ├── pages/                  /, /productos/, /productos/[slug]/, /categorias/[slug]/,
│   │                           /guias/, /guias/[slug]/, /preguntas-frecuentes/, /contacto/,
│   │                           /terminos-y-condiciones/, 404
│   ├── components/             Componentes Astro + islands React (buscador, galería, selector)
│   ├── layouts/                BaseLayout con SEO (meta, OG, JSON-LD) y burbuja flotante de Mercado Libre
│   ├── lib/                    site, seo, images, galeria, productos, ficha, formato, faqs,
│   │                           resenas, guias, textos
│   ├── data/                   site.json, faqs.json, resenas.json, promociones.json,
│   │                           textos-productos.json
│   ├── assets/images/          Logos SVG + imágenes de producto (productos/<slug>/*.webp)
│   └── styles/global.css       Tokens de marca (colores y fuentes) con Tailwind 4 `@theme`
├── scripts/
│   ├── generar-catalogo.mjs    Regenera el catálogo desde ../agas-context
│   ├── generar-marca-ml.mjs    Regenera los assets de Mercado Libre y los rasters del sitio
│   └── generar-marca-redes.mjs Regenera el avatar y el carrusel de redes sociales
├── marca/                      Fuera del build: assets de marca para Mercado Libre
│                               y para redes sociales, y los TTF con que los
│                               scripts componen los textos
├── e2e/                        Pruebas Playwright (projects desktop/mobile/ga4); e2e/spec/ = capa de spec
├── tests/unit/                 Pruebas Vitest
├── tests/spec/                 Tests de spec (Vitest) y su auditoría
├── tests/python/               Pruebas pytest del barrido; tests/python/spec/ = capa de spec
└── public/                     robots.txt, favicon.svg, logo.png,
                                apple-touch-icon.png, _headers
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
| `npm run test:unit`  | Pruebas unitarias y de spec (Vitest)                        |
| `npm run test:py`    | Pruebas pytest del barrido (crea `.venv/` la primera vez)   |
| `npm run test:e2e`   | Pruebas end-to-end (Playwright, projects desktop/mobile). Si el puerto 4321 está ocupado por otro proyecto, correr `E2E_PORT=4331 npm run test:e2e` (u otro puerto libre): con `reuseExistingServer` activo, reusar un servidor ajeno en 4321 probaría el sitio equivocado. El segundo build, con GA4 de prueba, usa `E2E_PORT_GA4` (4322 por defecto) |
| `npm test`           | `test:py`, `test:unit` y `test:e2e`                         |
| `npm run barrido`    | Descarga el barrido de Mercado Libre a `../agas-context` (ver skill `refresco-catalogo`) |
| `npm run generar`    | Regenera el catálogo desde el contexto de Mercado Libre     |
| `node scripts/generar-marca-ml.mjs` | Regenera los assets de marca de Mercado Libre y los rasters del sitio (ver `marca/mercadolibre/README.md`) |
| `node scripts/generar-marca-redes.mjs` | Regenera los assets de marca para redes sociales: avatar y carrusel de presentación (ver `marca/redes/README.md`) |

Un hook de pre-commit (`.githooks/pre-commit`) corre `npm test` antes de cada
commit y lo bloquea si algo falla. Se activa solo al correr `npm install`
(script `prepare` que configura `git config core.hooksPath .githooks`); en
una emergencia se puede saltar con `git commit --no-verify`. En un clon
nuevo, correr además `npx playwright install` una vez, o el e2e del hook
fallará por falta de navegadores.

## Refresco del catálogo

El flujo completo de actualización es: `npm run barrido` → `npm run generar` →
(si cambió algún conteo de productos por categoría, regenerar y republicar los
assets de redes) → `npm run build` y las suites de test. Procedimiento
detallado, con la tabla de advertencias del generador y las trampas
conocidas, en la skill `.claude/skills/refresco-catalogo/SKILL.md`; contratos
en `openspec/specs/barrido/spec.md` y `openspec/specs/catalogo/spec.md`.

**`npm run barrido`** ejecuta `scripts/exportar-contexto-ml.py` (Python 3,
stdlib + `requests`), configurado por un `.env` en la raíz (copiar de
`.env.example`). Lee el access token vigente y el listado de
publicaciones/variantes/familias virtuales desde la base Postgres de la app
`mi-app-ml` (contenedor Docker `pg-dev`), y descarga de la API de Mercado
Libre detalle, descripción, promociones por ítem, reseñas e imágenes,
escribiendo `../agas-context` (`empresa.md`, `indice.md`,
`publicaciones/<carpeta>/publicacion.md` + imágenes). Es el único proceso con
permiso de escritura sobre ese directorio: un dato mal capturado se corrige
en este script, nunca editando el markdown exportado a mano. Poda las
carpetas de `publicaciones/` que ya no aparecen en la corrida, pero solo en un
barrido completo (nunca con `--only`) y solo si el listado de publicaciones no
vino vacío y la corrida no tuvo errores; ante un fallo transitorio de la API
prefiere dejar una carpeta obsoleta antes que arriesgar borrar una válida.
Publicaciones eliminadas de la cuenta devuelven 403 en la API y no aparecen en
el barrido aunque la base todavía las liste.

**`npm run generar`** ejecuta `scripts/generar-catalogo.mjs`, que lee el
barrido desde `../agas-context` (configurable con la variable de entorno
`AGAS_CONTEXT_DIR`, la misma que lee el script de barrido) y regenera:

- `content/productos/*.md`: una ficha por publicación lógica, con frontmatter estructurado (FAQs, reviews, variantes, grupos) y la descripción limpia como cuerpo.
- `src/assets/images/productos/<slug>/`: imágenes convertidas a WebP (máximo 800 px de lado mayor).
- `src/data/resenas.json`: fuente de reseñas.

`llms.txt` no lo escribe el script: lo construye el build (`src/pages/llms.txt.ts`).

El script es idempotente: borra y vuelve a crear todo lo que produce. Antes de
resolver duplicados de catálogo o armar familias, descarta las publicaciones
(y los miembros de familia) cuyo estado no es `active`, para que una
publicación de catálogo cerrada nunca le gane a su gemela activa. Al agregar
reseñas de los miembros no-catálogo de una familia genérica, deduplica por
firma del bloque (promedio, cantidad, distribución y comentarios): Mercado
Libre replica el mismo bloque de reseñas en varios miembros de una familia, y
sumarlos sin deduplicar duplicaría el conteo real.

Lo que el script **no** toca: `content/guias/` y `src/data/textos-productos.json` son contenido editorial manual y sobreviven intactos a cada regeneración (las guías solo se *leen* para listarlas en `llms.txt` durante el build). Requisito de entrada: que `../agas-context` exista con el barrido de publicaciones; sin él, `npm run generar` falla y el resto del sitio sigue construyendo con lo último generado y commiteado.

## Datos manuales vs generados

- **Manuales**: `src/data/site.json` (identidad, categorías y su orden de
  productos, enlaces de Mercado Libre), `src/data/faqs.json` (FAQs
  transversales), `src/data/promociones.json` (cupones y campañas curados a
  mano, ver "Mantención de promociones"), `content/paginas/*.md`,
  `content/guias/*.md` (guías de compra/uso: se escribieron una vez y solo
  cambian editando su markdown), `src/data/textos-productos.json`
  (descripciones y meta descriptions propias por slug), tokens de
  `global.css`, logos.
- **Generados** (no editar a mano; corregir en el script de barrido o en el generador y regenerar):
  `content/productos/*.md`, `src/assets/images/productos/`,
  `src/data/resenas.json`.

Si se agrega o quita un producto del catálogo, hay que actualizar el
arreglo `productos` de su categoría en `site.json` (los tests validan la
consistencia entre ambos) y los conteos exactos de `tests/unit/`.

## Mantención de promociones

`src/data/promociones.json` es la única fuente de las promociones y cupones
que se publican, tanto en `/promociones/` como en el bloque de la ficha de
cada producto: es un dato curado a mano, nunca se genera ni se deriva de
`../agas-context`.

- Cada cupón o campaña declara `desde` y `hasta` en formato `YYYY-MM-DD`,
  ambos **inclusivos**: la promo se muestra desde las 00:00 de `desde` hasta
  las 23:59 de `hasta` en horario de Chile. Mercado Libre cierra sus campañas
  al final del día en Chile (02:59:59Z en horario de verano, 03:59:59Z en
  invierno), así que `hasta` es el día anterior al `finish_date` en UTC de la
  campaña. `desde` es el primer día completo de vigencia en Chile: si la
  promoción arranca antes de la medianoche chilena, `desde` es el día
  siguiente.
- El barrido de `../agas-context` (sección `### Promociones y cupones` de
  cada `publicacion.md`) sirve solo como **referencia** para enterarse de
  qué campañas existen: nunca como fuente automática. El campo
  `estado: candidate|started|pending` que trae esa sección no garantiza que
  el descuento esté realmente aplicado sobre el precio de la publicación
  (por eso nunca se usa como fuente).
- Otra vía de referencia es consultar directamente la API de promociones de
  Mercado Libre con el token vigente:
  `GET /seller-promotions/users/{seller_id}?app_version=v2` (lista campañas
  con `start_date`/`finish_date` en UTC),
  `GET /seller-promotions/promotions/{id}?promotion_type=<TYPE>&app_version=v2`
  (detalle, por ejemplo el `fixed_percentage` de un cupón) y
  `GET /seller-promotions/promotions/{id}/items?promotion_type=<TYPE>&app_version=v2&limit=50`
  (ítems de la promoción, paginado con `searchAfter`). Igual que el barrido,
  es solo referencia; el snippet completo y qué tipos de promoción publicar
  están en la skill `refresco-catalogo`.
- Las promociones vencidas desaparecen en el **siguiente redeploy**: el
  filtrado de vigencia corre solo en build, así que hay que
  redesplegar al día siguiente del vencimiento de cada promo para que deje
  de mostrarse. Flujo de mantención: al vencer una promo, actualizar
  `src/data/promociones.json` si corresponde (por ejemplo dar de alta una
  campaña o cupón nuevo), y hacer commit + push (el push a `main` dispara el
  deploy en Cloudflare Pages); alternativamente, disparar un redeploy
  manual desde el dashboard de Cloudflare Pages si no hay cambios que
  commitear.

## Versionado y releases

El proyecto usa [SemVer](https://semver.org/lang/es/) con changelog en
`CHANGELOG.md` (formato [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)).
El flujo es manual:

1. Cada cambio notable se anota en la sección `[Unreleased]` del changelog
   dentro del mismo commit que lo introduce.
2. Para cortar una versión: mover lo de `[Unreleased]` a una sección
   `[X.Y.Z] - fecha` (actualizando los links de comparación al final) y
   **commitear ese cambio antes de release**: `npm version` aborta con
   "Git working directory not clean" si queda algo sin commitear, incluso
   staged. Con el árbol limpio, correr
   `npm run release:patch|minor|major` según el cambio (fix → patch,
   feature → minor, breaking → major); el script bumpea `package.json` y
   crea commit `chore(release): vX.Y.Z` + tag `vX.Y.Z`.
3. Publicar con `git push --follow-tags`.

## Runbook: deploy y dominio

1. **Deploy en Cloudflare Pages con integración Git**: en el dashboard,
   crear el proyecto de Pages conectado a GitHub y seleccionar este
   repositorio (no usar la opción de subir estático a mano, para que cada
   push dispare build y deploy automáticos). Ajustes:

   | Ajuste                  | Valor           |
   | :---------------------- | :-------------- |
   | Root directory          | `/`             |
   | Build command           | `npm run build` |
   | Deploy command          | `npx wrangler deploy` (dejar el default) |
   | Framework preset        | Astro (si aparece la opción) |
   | Variable `NODE_VERSION` | `22.12.0` (o la del `.nvmrc`) |
   | Variable `PUBLIC_GA4_ID` | Measurement ID de GA4; sin ella el build no emite analítica (ver `docs/analitica.md`) |

   El sitio es 100% estático (Astro sin adapter): no hay SSR ni funciones.
   `wrangler.jsonc` en la raíz declara `assets.directory: "./dist"`, así
   que `wrangler deploy` sabe qué publicar sin necesidad de un Worker
   propiamente tal. `public/_headers` se copia a `dist/_headers` en el
   build y fija `Cache-Control: public, max-age=31536000, immutable` para
   los assets hasheados de `/_astro/*` en Workers static assets; el efecto
   real se confirma post-deploy con `curl -I` sobre un asset de `/_astro/`. Cada push a la rama de producción dispara build y
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
  `primario` (marca, headers, CTAs), `acento` (estrellas y detalles; su
  variante `-oscuro` se usa para texto sobre fondo claro por contraste AA),
  `destacado` (etiquetas y realces; sobre fondo claro se usa
  `destacado-oscuro`, también por AA), `tinta` (texto) y `fondo`
  (superficie). Retematizar el sitio es editar los valores de `@theme` y
  las fuentes en `global.css`; los valores vigentes son los de la paleta
  «Acero y cobre», definida en
  `openspec/specs/marca/spec.md`.
- Los colores literales viven solo en `global.css` y en los assets de marca
  (los SVG de `src/assets/images/` y `public/`, más
  `scripts/generar-marca-ml.mjs` y `scripts/generar-marca-redes.mjs`). Un
  barrido de color se hace por hex **y**
  por notación decimal `rgb`/`rgba`/`hsl`: un `rgba()` dentro de un atributo
  `style` ya se escapó una vez de un grep que solo miraba hexes. Un chequeo
  de contraste, además de los pares de tokens, tiene que componer las
  utilidades con opacidad (`text-tinta/NN`, `text-white/NN`) contra su
  superficie.
- Los hex de los assets de marca replican valores de `@theme`, incluida la
  bajada "SOLUCIONES INNOVADORAS" de los lockups (`primario` sobre
  superficies claras, `primario-claro` sobre oscuras). Ningún
  asset inventa un color propio; la única excepción aprobada es el cobre
  claro `#C8813F` del travesaño sobre oscuro (`openspec/specs/marca/spec.md`). El barrido
  `grep -oh "#[0-9A-Fa-f]\{6\}" public/favicon.svg src/assets/images/agas-lockup*.svg scripts/generar-marca-ml.mjs scripts/generar-marca-redes.mjs | tr 'a-f' 'A-F' | sort -u`
  lista los valores en uso; el `#000000` que aparece es del arnés con que los
  scripts miden anchos de texto, no de un asset. Sumar el script de redes
  agrega un solo valor al barrido, `#E9C49A`, que es el token `destacado`:
  los assets de redes no inventan colores propios y la excepción sigue
  siendo una sola.
- Los rasters de marca son generados por dos scripts y no se editan a mano:
  `node scripts/generar-marca-ml.mjs` produce `public/logo.png`,
  `public/apple-touch-icon.png`, `src/assets/images/logo.png` y los tres de
  `marca/mercadolibre/`; `node scripts/generar-marca-redes.mjs` produce los
  siete de `marca/redes/` (`avatar.png` y `carrusel-presentacion-1..6.png`).
  Los del carrusel llevan horneados los conteos de productos por categoría,
  así que un refresco del catálogo que los mueva obliga a regenerarlos **y a
  republicarlos** en la red social.
- El sitio nunca muestra stock: los precios son referenciales con su fecha,
  y el precio vigente vive en la publicación de Mercado Libre de cada
  producto. Las promociones y cupones sí se publican, pero solo desde
  `src/data/promociones.json` (ver "Mantención de promociones" más arriba).
- Las familias de productos (fundas PS5 por diseño/color, cargador dual por
  color) se agrupan en una sola ficha con selector; cada combinación enlaza
  a su propia publicación de Mercado Libre.
