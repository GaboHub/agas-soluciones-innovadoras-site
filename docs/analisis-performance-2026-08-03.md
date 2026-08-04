# Análisis de performance — build de producción (2026-08-03)

Auditoría sobre el build real de producción, no sobre el código fuente. Convención: `$D` es el
directorio del build aislado, generado con:

```sh
npx astro build --outDir <scratchpad>/dist-audit
```

39 páginas generadas OK. Todas las cifras de texto (HTML/CSS/JS) son gzip (`gzip -9 -c <archivo> | wc -c`),
que es lo que sirve Cloudflare; los binarios son bytes reales (`stat -c%s`).

## Resumen ejecutivo

- Dist total **42,8 MB** (`du -sb $D`), dominado por 2001 webp (37,3 MB) que son variantes
  lazy/lightbox — el visitante no las descarga todas.
- La carga inicial real va de **~122 KB** (guía/promociones) a **~200–218 KB** (fichas de
  producto). En todas las páginas, **las fuentes (100 KB, 5 pesos woff2 latin) son el rubro más
  grande**.
- Hallazgo N.º 1: **React (62 KB gz de JS) se paga en las 24 páginas de conversión** (23 fichas +
  listado) para interactividad trivial. Vanilla de ~2–4 KB lo reemplaza → **−58 KB gz (~30 %) en
  las páginas más visitadas**.
- Hallazgo N.º 2: las props serializadas de la isla `FichaProducto` duplican la galería completa
  en el HTML: hasta **+18,3 KB gz** en la ficha con más variantes.
- No había `public/_headers`: cada visita repetida revalidaba ~180 KB de assets hasheados
  inmutables.

## Carga inicial por página representativa

| Componente | Home `/` | Ficha típica `/productos/audifonos-bluetooth-tws/` | Ficha peor caso `/productos/kit-funda-silicona-grips-control-ps5/` | Listado `/productos/` | Guía `/guias/como-colocar-grips-control/` | Promos `/promociones/` |
|---|---|---|---|---|---|---|
| HTML gz | 8.193 | 11.776 | 29.723 | 11.144 | 6.676 | 6.419 |
| CSS gz (`seo.DqVNuvuD.css`) | 14.824 | 14.824 | 14.824 | 14.824 | 14.824 | 14.824 |
| Fuentes woff2 latin pedidas¹ | 100.332 | 100.332 | 100.332 | 100.332 | 100.332 | 100.332 |
| JS (islas)² | 0 | 62.240 | 62.240 | 61.972 | 0 | 0 |
| Imágenes eager³ | 1.065 | 10.446 | ~10.000 | 0 | 0 | 0 |
| favicon.svg | 361 | 361 | 361 | 361 | 361 | 361 |
| **Total aprox.** | **~125 KB** | **~200 KB** | **~218 KB** | **~189 KB** | **~122 KB** | **~122 KB** |

¹ Inter latin 400/600/700 (23.664 + 24.452 + 24.356) + Manrope latin 700/800 (14.212 + 13.648) =
100.332 B — `ls -la $D/_astro/ | grep -E 'latin-[0-9]+-normal.*woff2'`. Los cinco pesos están
usados en el CSS (`grep -oE 'font-weight:[0-9]+' $D/_astro/seo.DqVNuvuD.css | sort | uniq -c` →
400×7, 600×7, 700×15, 800×8). Los subsets no-latin y los `.woff` no se piden gracias a
unicode-range/format.

² gz: `client.DW6xmEpB.js` 57.067 + `react.CD6hyuMb.js` 2.916 + `jsx-runtime` 299 +
`FichaProducto` 1.958 (o `BuscadorProductos` 1.690) —
`for f in $D/_astro/*.js; do gzip -9 -c $f | wc -c; done`.

³ Home: hero SVG `agas-lockup-blanco…_grW1U.svg` 1.065 B con `loading="eager"
fetchpriority="high"`. Ficha: hero webp 800px `01.D2DuaxrE_ZB6Xny.webp` 10.446 B (sin `loading` →
eager). Todo lo demás es `loading="lazy"` (`grep -oE '<img[^>]*>' $D/index.html`).

## Hallazgos rankeados por ahorro en las páginas más visitadas

### 1. React para interactividad trivial — ahorro ~58 KB gz (−30 %) en 24 páginas. Esfuerzo: medio

- Medido: `grep -rl astro-island $D --include='*.html' | wc -l` → 24 páginas (23 fichas +
  `/productos/`). `client.DW6xmEpB.js` (react-dom) = 184.105 B raw / **57.067 B gz**
  (`gzip -9 -c $D/_astro/client.DW6xmEpB.js | wc -c`); con react + jsx-runtime + componente:
  62.240 B gz por ficha.
- Ambas islas van con `client:load` (hidratación inmediata, above-the-fold):
  `src/pages/productos/index.astro` y `src/pages/productos/[slug]/index.astro`.
- La interactividad es trivial (470 líneas TSX totales): `FichaProducto.tsx` = elegir
  grupo/opción y actualizar precio/link/galería; `GalleryLightbox.tsx` = lightbox;
  `BuscadorProductos.tsx` = filtro de texto normalizado sobre ~23 productos. Nada necesita React:
  scripts vanilla de ~2–4 KB por página lo cubren y permiten quitar `@astrojs/react` entero. El
  menú móvil ya es vanilla inline (200 B).
- **Estado: pendiente de decisión** (refactor de alcance medio; ver cierre).

### 2. Props de la isla duplican la galería completa en el HTML — hasta 18,3 KB gz por ficha. Esfuerzo: medio

- Medido: en `kit-funda-silicona-grips-control-ps5` el atributo `props` de `<astro-island>` pesa
  **254.225 B raw** con **1.176 URLs webp** (thumb + full de cada foto de cada variante),
  serializadas con el overhead del serializer de Astro. Página completa gz 30.393 vs **12.079 sin
  las props** → +18.314 B gz (reproducible extrayendo `props="…"` del HTML y comparando
  `gzip.compress` con y sin, sobre `$D/productos/kit-funda-silicona-grips-control-ps5/index.html`).
- Rango en fichas: gz mín 9.759 / mediana 10.734 / máx 29.723
  (`for f in $D/productos/*/index.html; do echo "$(gzip -9 -c $f | wc -c) $f"; done | sort -n`).
- Cae solo si el hallazgo 1 se hace bien: al migrar a vanilla, servir los datos de variantes como
  JSON plano (solo las URLs, sin la estructura duplicada del serializer).
- **Estado: pendiente de decisión** (acoplado al hallazgo 1).

### 3. Falta `public/_headers` con caché immutable — revalidaciones de ~180 KB por visita repetida. Esfuerzo: trivial

- Medido: `ls public/` → no había `_headers` ni en dist. El deploy es Workers static assets
  (`wrangler.jsonc` → `assets.directory: ./dist`), que soporta `_headers`. Todo `/_astro/*` lleva
  hash en el nombre → `Cache-Control: public, max-age=31536000, immutable`.
- **Estado: aplicado en este cambio.**

### 4. Menores (esfuerzo trivial, impacto chico)

- Hero de ficha sin `fetchpriority="high"` (sí tiene eager implícito + dimensiones): un atributo
  en el `<img>` del hero, que vive en `src/components/GalleryLightbox.tsx` (no en la página
  `[slug]`). React 19 SSR lo serializa como `fetchPriority` camelCase en el HTML; el parser de
  los navegadores normaliza los nombres de atributo a minúsculas, así que el DOM real queda con
  `fetchpriority="high"` (verificado en Chromium vía Playwright). **Aplicado en este cambio.**
- `apple-touch-icon` apuntaba a `/logo.png` de 512×512 y 12.396 B (`stat -c%s public/logo.png`);
  un 180×180 pesa ~3–4 KB. Solo lo piden Safari/homescreen. **Aplicado en este cambio.**

## Ya está bien, no tocar

- **Calidad webp ya es 65**, no el q80 por defecto (`src/lib/images.ts`,
  `src/layouts/BaseLayout.astro`). El hero de ficha 800 px pesa 10,4 KB — excelente.
- **CSS: un solo bundle compartido** de 51.090 B raw / 14.824 B gz cacheado entre las 39 páginas.
  No inlinear.
- **Lazy loading correcto**: thumbs de cards, fotos secundarias de galería y footer con
  `loading="lazy"`; heroes eager con dimensiones explícitas (CLS cero).
- **Tree-shaking sano en los chunks de `_astro/*.js`**, medido sobre un build sin
  `PUBLIC_GA4_ID` (`grep 'mercadolibre\|precioTexto' $D/_astro/*.js` solo matchea código de
  componentes). Esta afirmación no cubre los `<script>` inline del HTML ni los scripts que solo
  se emiten con GA4 activo — ver el addendum: ahí sí había arrastre, ya corregido.
- **GA4 no estaba en este build** (`grep -c googletagmanager $D/index.html` → 0;
  `PUBLIC_GA4_ID` sin setear). Con GA4 ya activo en producción, el `preconnect` a
  googletagmanager quedó implementado en `src/components/Analitica.astro` (ver addendum).
- **`.woff` fallback (31 archivos, 483.608 B) y subsets no-latin de @fontsource**: peso muerto
  inofensivo esperado; unicode-range evita que se pidan. No gastarle esfuerzo.
- **Los 106 jpg (2.282.368 B) son las og:image**: solo los descargan scrapers sociales.

## Higiene de bajo impacto (peso muerto del deploy, no afecta visitantes)

- **79 webp huérfanos = 1.482.686 B**: copias a resolución original sin sufijo de tamaño emitidas
  junto a las variantes referenciadas. Barrido: concatenar todos los HTML+JS+CSS de dist y grep
  del basename de cada asset de `_astro/`; 0 referencias = huérfano.
- **1 png huérfano (12.396 B)**: copia hasheada de logo.png en `_astro/` que nadie referencia.
- **3 svg huérfanos (6.816 B)**. Total peso muerto: **1.501.898 B (~1,5 MB de 42,8 MB)** — sano;
  sugiere emisión de originales en el pipeline de imágenes, pero no urge.

## Opcional a evaluar con diseño

Consolidar pesos tipográficos (p. ej. Inter 600→700 o Manrope 800→700) ahorraría ~14–24 KB por
primera visita en todas las páginas. No es hallazgo técnico: los 5 pesos están realmente usados;
es decisión estética.

## Addendum (mismo día): segunda medición con `PUBLIC_GA4_ID` seteado

Con GA4 activo en producción (`PUBLIC_GA4_ID=G-WRK4VS1HLE`, validado contra el sitio desplegado:
`curl -sL https://agassoluciones.cl/ | grep -oE 'G-[A-Z0-9]{10}'` → `G-WRK4VS1HLE` en las 39
páginas del build equivalente), se re-midió con
`PUBLIC_GA4_ID=G-WRK4VS1HLE npx astro build --outDir <scratchpad>/dist-ga4`:

- **Hallazgo nuevo — el script inline de analítica arrastraba `site.json` completo**: el listener
  de `clic_saliente` importaba el módulo accessor `lib/site` y el `<script type="module">` inline
  de cada página incluía dirección, teléfonos y URLs de Mercado Libre que no usa. Medido:
  **2717 B → 481 B por página** tras reemplazarlo por el import nombrado
  `import { analitica } from '../data/site.json'` (comando: extraer el `<script type="module">`
  que contiene `clic_saliente` de `dist/index.html` y contar `len(script.encode('utf-8'))`; el
  "antes" se reconstruyó con `git show HEAD:src/components/Analitica.astro` y el mismo build).
  Invisible en la primera medición porque el script no se emite sin la variable y porque vive
  inline en el HTML, no en `_astro/*.js`. **Aplicado.**
- **Preconnect a googletagmanager**: `<link rel="preconnect" href="https://www.googletagmanager.com" />`
  como primer elemento de `src/components/Analitica.astro` (sin `crossorigin`: `gtag.js` es
  script clásico sin CORS), heredando la guarda `PROD && PUBLIC_GA4_ID`. Un build sin la
  variable emite cero menciones de googletagmanager. **Aplicado.**
- Cobertura sin guardarraíl de CI, declarado: el arnés de tests buildea sin `PUBLIC_GA4_ID`, así
  que ningún test observa el preconnect ni el contenido del script inline; la verificación es el
  barrido sobre el build con la variable descrito arriba.

## Límites de la medición

No se midió comportamiento en red real (TTFB, HTTP/3, caché efectiva de Workers assets) — eso
requiere el sitio desplegado; todo lo anterior es sobre bytes del build.
