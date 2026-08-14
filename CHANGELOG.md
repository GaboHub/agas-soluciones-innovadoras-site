# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/). Para el
criterio de bump y el flujo de release, ver la sección "Versionado y releases"
del README.

## [Unreleased]

### Agregado

- `scripts/generar-marca-redes.mjs`: genera con sharp los siete assets de
  marca para redes sociales, el avatar de la foto de perfil
  (`marca/redes/avatar.png` 1080×1080, monograma sobre el degradado acero,
  sin la baldosa, porque el recorte circular de Instagram se come sus
  esquinas) y el carrusel de presentación de seis láminas
  (`carrusel-presentacion-1.png` … `-6.png`, 1080×1350 c/u). El carrusel se
  arma como una sola tira de 6480×1350 y se rebana con `extract`, para que
  las baldosas decorativas crucen los cortes y la decoración se lea continua
  al deslizar. Toma los textos y los conteos por categoría de
  `src/data/site.json` (`categorias[i].productos.length`), aborta si las
  fuentes no llegan a aplicarse, si el catálogo deja de tener exactamente 3
  categorías, si un texto no entra en la caja de contenido o si alguna
  dimensión o peso no da, y produce salidas byte a byte idénticas entre
  corridas (`md5sum marca/redes/*.png > /tmp/antes.txt && node scripts/generar-marca-redes.mjs && md5sum -c /tmp/antes.txt`).
  `node scripts/generar-marca-redes.mjs` imprime las dimensiones de las siete
  salidas. Racional y riesgos en
  `docs/adr/0007-assets-de-marca-para-redes-sociales-reproducibles.md`.
- `marca/fuentes/Sora-Bold.ttf` —convertida con fontTools desde
  `node_modules/@fontsource/sora/files/sora-latin-700-normal.woff`, porque los
  titulares del carrusel usan Sora 700 y en `marca/fuentes/` solo estaba la
  SemiBold—, bajo la misma licencia SIL OFL 1.1 ya presente en
  `OFL-Sora.txt`. `marca/fuentes/` pasa de dos TTF a tres
  (`ls marca/fuentes/*.ttf | wc -l` → `3`). Como el resto de `marca/`, no
  entra al build.
- `marca/redes/README.md`: qué es cada archivo, dónde se usa, el orden de
  publicación 1→6 del carrusel y cómo se regenera todo.
- `marca/redes/primera-publicacion/`: paquete de la primera publicación de
  Instagram, con las seis láminas del carrusel tal como salieron al aire, el
  caption listo para pegar (`texto-del-post.txt`) y su README. Es una copia
  **instantánea**, no una copia viva: registra lo publicado el 2026-08-14 y no
  se actualiza cuando se regeneran las láminas canónicas de `marca/redes/`.

### Cambiado

- El copy de identidad deja de describir a AGAS por su rubro y pasa a
  describir cómo elige, con lo tech como catálogo de hoy: `tagline`
  ("Productos elegidos con criterio para tu día a día"), `descripcion`,
  `hero.titulo` ("Soluciones innovadoras para tu día a día") y `hero.bajada`
  en `src/data/site.json`, la frase de cabecera de `public/llms.txt`
  —sincronizada en el string de `construirLlmsTxt()` de
  `scripts/generar-catalogo.mjs`, no en el archivo generado—, el resumen de la
  categoría de descarte `otros` del mismo script y el párrafo "Quiénes somos"
  de `content/paginas/inicio.md`. La `descripcion` es la meta description del
  home, que `e2e/seo.spec.ts` acota a 160 caracteres
  (`grep -n "toBeLessThanOrEqual(160)" e2e/seo.spec.ts`), y por eso quedó en
  158 (`node -e "console.log(require('./src/data/site.json').descripcion.length)"`).
  Sin ninguna alusión a expansión futura del giro, según el ADR 0003. Racional
  en `docs/adr/0008-copy-de-identidad-agnostico-de-categoria.md`.
- Regenerados los siete PNG de `marca/redes/`
  (`node scripts/generar-marca-redes.mjs`): las láminas del carrusel hornean
  `hero.titulo` y `hero.bajada`, así que un cambio de copy obliga a
  regenerarlos y a **republicarlos**. Como los assets y el copy nuevo salen en
  esta misma versión, los archivos entran al repo ya con el texto vigente.

## [1.1.0] - 2026-08-06

Identidad «Acero y cobre» con los assets de marca generados por script,
medición GA4 ampliada y mejoras de carga.

### Agregado

- `ConstelacionMarca.astro`: pieza gráfica del hero del home, un rombo de
  cuatro baldosas (marca, gamepad, audífonos, escudo) con la esquina
  `rounded-[26%]` de la firma AGAS, coloreada solo con tokens vía
  `currentColor` y flotando con el keyframe `flotar` nuevo de `global.css`
  bajo `motion-safe` (ver `docs/adr/0003-identidad-visual-serena-e-innovadora.md`).
  La rejilla va rotada 45°, así que lleva margen vertical explícito
  (`grep -n "my-\[3.1rem\]" src/components/ConstelacionMarca.astro`) para
  que su huella visual no invada la leyenda de abajo.
- Spec e2e `e2e/constelacion.spec.ts`: mide el área de intersección entre la
  leyenda del hero y cada una de las cuatro baldosas de la constelación y
  exige `0` en los dos projects de Playwright, desktop y mobile.
- `scripts/generar-marca-ml.mjs`: genera con sharp los tres assets de marca
  para Mercado Libre (`marca/mercadolibre/logo.png` 1000×1000,
  `banner-escritorio.png` 3840×200, `banner-movil.png` 1440×320) y regenera
  los rasters del sitio (`public/logo.png`, `public/apple-touch-icon.png`,
  `src/assets/images/logo.png`). Toma los textos de los banners de
  `src/data/site.json` (`hero.chip` y `envio`), aborta si la fuente Sora no
  llega a aplicarse en el render y produce salidas byte a byte idénticas
  entre corridas. `node scripts/generar-marca-ml.mjs` imprime las
  dimensiones de las seis salidas.
- `marca/fuentes/` con `Sora-SemiBold.ttf` e `Inter-Regular.ttf`
  —convertidos desde `node_modules/@fontsource/{sora,inter}` para que sharp
  pueda componer los banners— y sus licencias SIL OFL 1.1 al lado
  (`OFL-Sora.txt`, `OFL-Inter.txt`). Como el resto de `marca/`, no entra al
  build.
- `GlifoCategoria.astro`: glifos SVG por slug que reemplazan el emoji en las
  tarjetas de categoría del home.
- Contacto de ventas por volumen fuera de Mercado Libre
  (`contacto.email` y `contacto.ventasVolumen` en `src/data/site.json`),
  publicado como `mailto:` en el footer y en un bloque propio de
  `/contacto/`.
- Copy del hero y sellos de confianza como dato de negocio
  (`hero` y `sellosConfianza` en `src/data/site.json`, tipados en
  `src/lib/site.ts`).
- Spec e2e `e2e/ventas-volumen.spec.ts` (bloque de ventas por volumen en
  footer y `/contacto/`).
- Evento GA4 `busqueda` en el buscador de `/productos/`
  (`crearMedidorBusqueda` en `src/lib/analitica.ts`, conectado desde
  `src/components/BuscadorProductos.tsx`): emite `termino` (consulta
  normalizada a minúsculas, sin tildes y con espacios colapsados),
  `resultados` (productos del catálogo que matchean) y `pagina` 1,5 s
  después de la última tecla, sin re-emitir si el término normalizado
  coincide con el último emitido; condicionado a `PUBLIC_GA4_ID` en build
  de producción como el resto de la analítica (ver `docs/analitica.md`).
- Evento GA4 `clic_contacto`: mide los clicks al correo de ventas por volumen
  en el footer global y en `/contacto/`
  (`grep -rn "mailto:" src/components/Footer.astro src/pages/contacto/index.astro`).
  El listener delegado de `src/components/Analitica.astro` evalúa
  `destinoContacto` de `src/lib/analitica.ts` cuando el href no es saliente y
  emite `destino` (el correo, sin la query del `mailto:`) y `pagina`; reutiliza
  las dimensiones ya registradas, así que no necesita configuración nueva en
  GA4 (ver `docs/analitica.md`).
- `public/_headers` con caché `immutable` de un año para los assets
  hasheados de `/_astro/*`, para que Cloudflare Workers deje de
  revalidarlos en cada visita repetida.
- `fetchpriority="high"` en la foto principal de la galería de cada ficha
  de producto (`src/components/GalleryLightbox.tsx`), para adelantar la
  descarga del recurso LCP.
- `public/apple-touch-icon.png` (180×180) referenciado como
  `apple-touch-icon` en el `<head>` (`src/layouts/BaseLayout.astro`), en
  reemplazo del logo de 512×512 que se usaba antes para ese propósito; lo
  produce `scripts/generar-marca-ml.mjs` rasterizando el SVG del isotipo
  directo a 180 px, sin pasar por `public/logo.png`.
- `<link rel="preconnect">` a `https://www.googletagmanager.com` en
  `src/components/Analitica.astro`, emitido solo cuando la analítica está
  activa (build de producción con `PUBLIC_GA4_ID`), para adelantar la
  conexión antes de que llegue `gtag.js`.
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

- Identidad visual completa del sitio ("serena e innovadora", paleta
  «Acero y cobre»): la paleta de `@theme` pasa de azul/naranja a acero,
  cobre y arena sobre fondo cálido casi neutro, y los titulares de Manrope
  700/800 a Sora 600/700 (Inter sigue como texto de cuerpo). Valores
  vigentes con `grep -n -- "--color-\|--font-" src/styles/global.css`; los
  anteriores, con `git show 400df19:src/styles/global.css`. Los roles de los
  tokens no cambian, solo sus valores, y todos los pares de tokens siguen
  cumpliendo AA. Racional, alternativas descartadas y decisiones del dueño
  del sitio en `docs/adr/0003-identidad-visual-serena-e-innovadora.md` y
  `docs/adr/0005-paleta-acero-y-cobre-y-assets-de-marca-reproducibles.md`.
- Los SVG de marca (`src/assets/images/agas-lockup.svg`,
  `agas-lockup-blanco.svg`, `public/favicon.svg`) se recolorean con la
  paleta nueva y unifican en cobre el travesaño de la "A": `#9E5220` sobre
  superficies claras y `#C8813F` sobre oscuras. El único cambio de geometría
  es el radio de la baldosa, `rx` de 20 a 24. El lockup blanco además
  invierte la baldosa: fondo blanco con el trazo en acero, en vez de fondo
  de color con el trazo blanco.
- La bajada "SOLUCIONES INNOVADORAS" de los lockups deja de tener color
  propio y se deriva de los tokens: `primario` `#24455C` sobre superficies
  claras (`src/assets/images/agas-lockup.svg`) y `primario-claro` `#DCE6ED`
  sobre oscuras (`agas-lockup-blanco.svg` y la constante `bajadaClara`
  —antes `arenaTexto`— de `scripts/generar-marca-ml.mjs`, con la que se
  regeneran los dos banners de Mercado Libre, los únicos rasters que dibujan
  la bajada). Reemplaza los tres grises heredados de la
  etapa petróleo que el ADR 0005 había dejado como desviación registrada
  (`grep -rn "4E5E63\|9BB6BC\|B9C9CF\|arenaTexto" src/ scripts/ | wc -l` →
  `0`) y sube el contraste en las tres superficies: 6.11 → 9.11:1 en el
  header, 6.42 → 10.85:1 en el footer y 5.92 → 7.97:1 en el peor extremo del
  degradado de los banners. Comandos de medición y racional en
  `docs/adr/0006-la-bajada-del-lockup-se-deriva-de-los-tokens.md`.
- Los rasters de marca pasan a la paleta nueva y dejan de hacerse a mano:
  `public/logo.png`, `public/apple-touch-icon.png`,
  `src/assets/images/logo.png` y los tres de `marca/mercadolibre/` salen de
  `node scripts/generar-marca-ml.mjs`. Cierra el pendiente que el ADR 0003
  había dejado abierto, con el que el sitio convivía con dos paletas en sus
  PNG.
- El fondo del hero del home deja de llevar colores literales: sus dos
  resplandores radiales pasan de `rgba()` decimal a
  `color-mix(in srgb, var(--color-acento) 35%, transparent)` y
  `color-mix(in srgb, var(--color-destacado) 12%, transparent)`. Con eso el
  sitio queda sin ningún color literal fuera de `global.css` y de los assets
  de marca:
  `grep -rnE "rgba?\(|hsla?\(|#[0-9a-fA-F]{3,8}\b" src/ --include="*.astro" --include="*.tsx" --include="*.ts" --include="*.css" | grep -v "src/styles/global.css" | wc -l`
  → `0`.
- Hero del home reconstruido: chip, título con palabra acentuada, bajada y
  sellos de confianza salen de `site.hero` y `site.sellosConfianza`, con
  `ConstelacionMarca` en lugar del lockup grande y la decoración flotante.
  El `<h1>` pasa de "Soluciones innovadoras en accesorios tech" al título
  del hero (`grep -n '"titulo"' src/data/site.json`).
- La reputación verde deja de ser un badge enlazado a Mercado Libre en el
  home y pasa a ser un sello de texto del hero, sin enlace; el home
  conserva sus enlaces salientes en los CTA, el header, el footer y la
  burbuja flotante.
- Barrido de identidad en todo el sitio: `font-extrabold` → `font-bold`
  (`global.css` importa solo Sora 600 y 700, así que los titulares topan en
  700: `grep -n "fontsource/sora" src/styles/global.css`;
  `grep -rn "font-extrabold" src/ | wc -l` → `0`), `text-destacado` sobre
  fondo claro → `text-destacado-oscuro` por contraste AA, y botones de
  acción de `rounded-full` a `rounded-xl` con `active:translate-y-[2px]`
  (chips, badges y pills conservan la forma de píldora).
- La ubicación pública del sitio pasa de Macul a Santiago, Región
  Metropolitana (`ubicacion` y `direccion.localidad` en
  `src/data/site.json`, `content/paginas/inicio.md`,
  `content/paginas/contacto.md`); afecta el texto visible y el
  `addressLocality` del JSON-LD `Organization`.
- El listener de `clic_saliente` (`src/components/Analitica.astro`) importa
  solo `analitica` con import nombrado directo de `src/data/site.json`, en
  vez del módulo accessor `lib/site` que arrastraba el objeto `site`
  completo al script inline de cada página: 2717 B → 481 B por página
  (medido extrayendo el `<script type="module">` que contiene
  `clic_saliente` de `dist/index.html` en un build con `PUBLIC_GA4_ID`
  seteado y contando `len(script.encode('utf-8'))`).
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

- `src/components/DecoracionFlotante.astro` y
  `src/components/BadgeMercadoLibre.astro`: código muerto tras el hero
  nuevo (`grep -rn "DecoracionFlotante\|BadgeMercadoLibre" src/ e2e/ tests/
  | wc -l` → `0`).
- Dependencia `@fontsource/manrope`, reemplazada por `@fontsource/sora`.
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

[Unreleased]: https://github.com/GaboHub/agas-soluciones-innovadoras-site/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/GaboHub/agas-soluciones-innovadoras-site/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/GaboHub/agas-soluciones-innovadoras-site/releases/tag/v1.0.0
