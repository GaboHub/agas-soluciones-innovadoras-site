# Diseño — especificacion-base

Cada chunk de `tasks.md` lee solo las secciones que cita. D0 aplica a todos.

## D0. Reglas comunes

- TDD: el test de spec primero, en rojo contra el código actual (o, si el comportamiento ya existe, rompiendo a mano la línea que lo produce para ver el rojo y restaurándola). Mutaciones de a una; cada mordida se reporta.
- Un test de spec por scenario ejecutable. Un scenario que no se pueda ejercer se informa en el resumen y no se finge.
- Los tests de spec no fijan cifras perecederas (cantidad de fichas, de reseñas, de guías, ids o fechas de promociones reales): derivan lo esperado de los datos (`content/`, `src/data/`, sitemap) o usan fixtures propias.
- Los unit tests y los e2e existentes no se mueven. Si un test de spec deja redundante a uno existente, el existente se borra en el mismo commit. Si un unit test fija contenido perecedero, como los de `site.test.ts` y `resenas.test.ts`, no se toca salvo que el chunk cambie ese dato.
- Código sin comentarios. `../agas-context` es de solo lectura: solo se lee, y solo con `npm run generar` cuando el chunk lo pide.
- Cada chunk termina con `npm test` en verde, porque el hook de pre-commit lo exige. E2E: si 4321 está ocupado, usar `E2E_PORT=<libre>`; nunca matar procesos ajenos ni esperar a que se libere un puerto.
- La prioridad del proyecto es SEO y GEO: ningún chunk degrada canonical, metadatos, JSON-LD, sitemap, robots ni `llms.txt` sin que su delta lo diga.

## D1. Capa de tests de spec (TS) y auditoría

- Directorios: `tests/spec/<capability>/<requirement-en-kebab>.test.ts` (Vitest) y `e2e/spec/<capability>/<requirement-en-kebab>.spec.ts` (Playwright). Un archivo por requirement y por runner.
- Cita: `describe` raíz con título exacto `'[<capability>] <nombre del requirement>'`. Dentro, un `test` por scenario, titulado con el nombre del scenario.
- `vitest.config.ts` incluye `tests/unit/**/*.test.ts` y `tests/spec/**/*.test.ts`. Playwright conserva `testDir: './e2e'`, que ya recorre `e2e/spec/` recursivamente; comprobar que lo haga.
- `tests/spec/auditoria/` exporta funciones puras:
  - `requirementsVigentes(raizOpenspec)`: por capability, los `### Requirement:` de `openspec/specs/<cap>/spec.md` más los ADDED, MODIFIED y RENAMED-TO de `openspec/changes/*/specs/<cap>/spec.md`, menos los REMOVED y RENAMED-FROM. Ignora `changes/archive/`.
  - `citas(archivos)`: extrae `(cap, requirement, archivo)` con la regex del `describe` raíz `'[cap] …'`, aceptando comillas simples, dobles o backtick.
  - `hallazgos(vigentes, citas, propias)`: devuelve tres listas: citas que no resuelven, requirements de capabilities propias sin ninguna cita y citas fuera de `tests/spec/` o `e2e/spec/`.
- `tests/spec/auditoria.test.ts` corre las funciones contra el repo real, escaneando `tests/` y `e2e/` completos, y falla listando cada hallazgo con su archivo. La constante `CAPACIDADES_PROPIAS` empieza vacía. Cada chunk agrega su capability cuando deja citados todos sus requirements, según la columna «Cierra» de `tasks.md`. La lista final es `analitica, catalogo, interfaz, marca, promociones, seo-geo, sitio`; `barrido` lo posee la suite de pytest.
- Las funciones puras llevan sus propios unit tests en `tests/unit/auditoria-spec.test.ts`, con fixtures de spec y deltas en texto: cita que no resuelve, requirement REMOVED, RENAMED y cita fuera de la capa.

## D2. Carril Python: arnés y auditoría

- `requirements-dev.txt` con `pytest` y `requests` en versiones fijas. `.venv/` va en `.gitignore`.
- `scripts/test-py.sh`: crea `.venv` con `python3 -m venv` si no existe, instala `requirements-dev.txt` si cambió (el hash se guarda en `.venv/.req-hash`) y corre `.venv/bin/python -m pytest tests/python`. En `package.json`: `"test:py": "sh scripts/test-py.sh"` y `"test": "npm run test:py && npm run test:unit && npm run test:e2e"`. El carril no toca otra parte de `package.json`.
- `pytest.ini` con `testpaths = tests/python` y el marker `spec` registrado (`--strict-markers`).
- Importación del script: `tests/python/conftest.py` fija el entorno (`AGAS_ML_USER_ID`, `AGAS_CONTEXT_DIR` en `tmp_path`, `AGAS_PG_*`) antes de cargar `scripts/exportar-contexto-ml.py` con `importlib.util.spec_from_file_location`. Los mocks son `subprocess.run` (para `run_psql`), `requests.Session.get` y `time.sleep`. La salida va siempre a `tmp_path` con `--output`.
- Si un efecto al importar impide testear, como `sys.exit` por `AGAS_ML_USER_ID` o la lectura de `site.json`, se mueve a `main()` sin cambiar el comportamiento observable. Ese refactor también se hace con TDD: primero el test de caracterización.
- Tests de spec en `tests/python/spec/test_<requirement>.py` con `pytestmark = [pytest.mark.spec("barrido", "<nombre exacto>")]`.
- Auditoría Python en `tests/python/test_auditoria_spec.py`: la misma lógica de D1, con la regex de `pytest.mark.spec("cap", "req")` y el universo de requirements de `openspec/`. Solo escanea `tests/python/`. Su lista de capabilities propias nace vacía y recibe `barrido` en el chunk 2.
- Publicación no disponible: hoy se crea `item_dir` antes del resultado del fetch, y un 403 se registra como error, lo que omite la poda en todas las corridas. Con el cambio, `/items` con 403 o 404 devuelve un estado «no disponible». La carpeta no se crea. El id sale del conjunto protegido antes de podar y el resumen lo lista en «Publicaciones no disponibles». La poda sigue exigiendo cero errores.

## D3. Arnés del generador del catálogo

- `scripts/generar-catalogo.mjs` exporta sus funciones puras y su `main(opciones)`. Solo ejecuta `main()` cuando es el módulo de entrada (`import.meta.url === pathToFileURL(process.argv[1]).href`).
- `main` acepta `{ contexto, raiz }`. Por defecto `contexto` es `$AGAS_CONTEXT_DIR` o `../agas-context`, y `raiz` es la raíz del repo. Todas las rutas de salida se resuelven contra `raiz`, de modo que los tests generan en un `tmp` con un barrido de fixture.
- Fixture de barrido mínima en `tests/fixtures/barrido/`, con `empresa.md` y publicaciones que cubren suelta, variantes, familia genérica, familia agrupada, duplicado de catálogo, cerrada, reseñas replicadas, «Sin datos de reviews.» y sufijo de dislikes. Las imágenes son JPG pequeños generados con `sharp` en el setup del test, sin commitear binarios grandes. El formato es el de la tabla del requirement «Estructura y contrato de salida» de `barrido`.
- Se eliminan `src/data/catalogo.json` y su escritura. Consumidores que hay que migrar:
  - `tests/unit/contenido.test.ts`, el test «catalogo.json tiene los mismos … productos»: se borra, porque lo cubre «Consistencia de categorías y fichas».
  - `tests/unit/textos-productos.test.ts`, el chequeo de estrellas: pasa a leer `reviews` del frontmatter.
  - `tests/unit/resenas.test.ts`, si lo lee.
  - La constante `CATEGORIAS` del generador queda solo con lo que el generador usa.
- Las reseñas de una publicación de catálogo no suman a `resenas.json`. El generador ya lo sabe por `Catálogo: Sí`, y los tests derivan de la fixture.

## D4. Fecha de build y promociones

- `hoyEnChile()` devuelve `process.env.AGAS_FECHA_BUILD` si cumple `AAAA-MM-DD` y, si no, la fecha de `America/Santiago`. Se lee solo en build: en el cliente no hay lógica de vigencia.
- `src/lib/promociones.ts` exporta `publicables(items, hoy)`, el actual `ordenarPublicables`, para testear con fixtures. `getCuponesPublicables` y `getCampanasPublicables` lo usan.
- El cuerpo de `/promociones/` pasa a `src/components/PaginaPromociones.astro`, que recibe por props `aclaracion`, `cupones`, `campanas` y `faqs`. Los scenarios de estado (vigente, próxima, nada publicable, sin precios) se testean en Vitest con el Container API de Astro (`experimental_AstroContainer`) sobre fixtures. `PromocionesResumen.astro` también se testea por props. `vitest.config.ts` usa `getViteConfig` de `astro/config` para compilar `.astro`.
- E2E sobre el build real: lo que muestran `/promociones/`, una ficha y `/llms.txt` es exactamente lo que da clasificar `promociones.json` con la fecha del build. El test calcula esa fecha con la misma función y la misma zona horaria, sin ids fijos.
- `playwright.config.ts` no fija `AGAS_FECHA_BUILD`: el build de e2e usa la fecha real, igual que producción.

## D5. llms.txt en el build

- Ruta `src/pages/llms.txt.ts` (`GET`, prerender) que devuelve `text/plain; charset=utf-8`. El texto lo arma la función pura `construirLlmsTxt({ site, categorias, fichas, guias, promociones, hoy })` en `src/lib/llms.ts`. Lee las colecciones `productos` y `guias`, `site.json` y `publicables(...)` de D4.
- Se borran `public/llms.txt` y `construirLlmsTxt`/`construirSeccionPromociones` del generador, y los tests de `contenido.test.ts` que leían el archivo (sincronía y secciones). Los cubren los tests de spec nuevos. Los de `e2e/estaticos.spec.ts` sobre `llms.txt` pasan a `e2e/spec/seo-geo/`.
- Formato: el de la tabla del requirement, con fechas `DD-MM-AAAA` y precio `toLocaleString('es-CL')`. La cabecera sale de `site.json`, lo que corrige la URL de tienda en `http://` y la frase de identidad duplicada.

## D6. JSON-LD y sitemap

- `src/lib/seo.ts`:
  - `buildOrganization` agrega `@id`.
  - `buildOffer({ url, precio, condicion })` es la única fábrica de `Offer`.
  - `buildProduct` (para `simple`) y `buildProductGroup(ficha, opciones, imagenes)` (para `variantes`/`familia`) toman las opciones de `construirFicha` de `src/lib/ficha.ts`, así el JSON-LD y el selector comparten la misma fuente.
  - `buildItemList(urls)`.
  - `buildArticle` suma `datePublished` y `dateModified`.
- Ejes a `variesBy`: `Color` va a `https://schema.org/color` y `Diseño` a `https://schema.org/pattern`. Otro eje no se declara. Cada `hasVariant` lleva `color` y/o `pattern` con el valor de su opción.
- Imagen de cada `hasVariant`: la primera imagen de la opción, procesada con el mismo helper de URL absoluta de `src/lib/images.ts` que usa `Product`.
- Guías: frontmatter `publicado` y `actualizado`. El valor inicial sale de git: `git log --diff-filter=A --format=%as -1 -- <archivo>` para `publicado` y `git log --format=%as -1 -- <archivo>` para `actualizado`. Desde ahí son datos curados, no se derivan de git en el build. Rationale: no está verificada la profundidad del clon de Cloudflare Pages.
- Sitemap: `serialize` de `@astrojs/sitemap` recibe un mapa `url → lastmod` que arma `astro.config.mjs` leyendo los frontmatter con `gray-matter` (`content/productos/*.md`, `content/guias/*.md`) y `site.json` (orden y pertenencia por categoría). La URL que no está en el mapa sale sin `lastmod`.
- «Contenido legible sin JavaScript»: Playwright con `javaScriptEnabled: false`.

## D7. Datos y CTA

- `site.json` agrega `ctaFicha: "Ver en Mercado Libre"` y `ctaCupon: "Seguir la tienda en Mercado Libre"`. `TarjetaPromocion`, `Resenas.astro` y el fallback de promociones usan `ctaHeader`.
- Escaneo de fuentes: regex `https?://` y `[\w.+-]+@[\w-]+\.[\w.]+` sobre `src/components`, `src/layouts` y `src/pages`, con lista permitida `schema.org`, `googletagmanager.com` y `w3.org`.
- Menú móvil: listener de `keydown` Escape en el `<details>`, que cierra y devuelve el foco al `summary`.

## D8. Interfaz: header, foco y navegación

- Header de una fila desde `md`: el nav de escritorio pasa a mostrarse desde `lg`, el menú `<details>` cubre `< lg` y el CTA del header no se parte (`whitespace-nowrap`). Los límites que valen son los del requirement, medidos a 768, 820, 844, 900 y 1100 px.
- `html { scroll-padding-top: <alto del header> + 8px }`, con el alto del header como variable CSS en `global.css`.
- Regla global `:focus-visible { outline: 2px solid var(--color-primario); outline-offset: 2px }`. Sobre superficies `primario`/`primario-oscuro` el outline es `white` o `destacado`, por contraste ≥ 3:1 contra la superficie.
- Enlace «Saltar al contenido»: primer hijo de `body` en `BaseLayout`, `sr-only` con `focus:not-sr-only`. `<main id="contenido" tabindex="-1">`.
- Estado activo: la sección se resuelve por prefijo de ruta (`/productos/…` → Productos, `/guias/…` → Guías, `/categorias/…` → Productos). Lleva `aria-current="page"` más un subrayado o borde inferior. El orden de las clases no puede dejar que `text-tinta` le gane a la clase activa: la clase de color va condicional, una u otra, nunca las dos.

## D9. Interfaz: contraste, tipografía y movimiento

- `text-tinta/40`, `/50` y `/60` pasan a `text-tinta/70`, y `text-white/55` y `/60` a `text-white/70`. Contrastes medidos de `tinta/70`: 5.96 sobre `white`, 5.68 sobre `fondo` y 5.31 sobre `primario-claro`. El placeholder del buscador usa `placeholder:text-tinta/70`.
- axe: devDependency `@axe-core/playwright`, solo con la regla `color-contrast` sobre las páginas de muestra (D14).
- Tipografía: en `@theme`, `--text-sm--line-height: 1.5` y `--text-xs--line-height: 1.5`. `.contenido-md p, .contenido-md li { max-width: 70ch }`. El `select` y el resumen de la ficha van a `text-base`.
- Movimiento: `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`. Los `hover:scale-*` y `hover:-translate-*` pasan a `motion-safe:hover:…`. `cursor: pointer` va como regla base para `button:not(:disabled)`, `select:not(:disabled)` y `summary`.
- `min-h-screen` pasa a `min-h-dvh`, y los `[NNvh]` del visor a `dvh`.

## D10. Íconos y retiro de emoji

- `src/components/Icono.tsx`: un componente React sin estado con un mapa `nombre → paths`, tomado del set Lucide (ISC). Lleva `viewBox 0 0 24 24`, `stroke="currentColor"`, `stroke-width 2`, `fill none` y `aria-hidden="true"`. Se usa en `.astro` sin directiva de hidratación, así que no agrega JS, y en las islas.
- Nombres: `carrito`, `estrella`, `instagram`, `ubicacion`, `camion`, `paquete`, `check`, `escudo`, `buscar`, `cerrar`, `mas`, `flecha-derecha`, `flecha-izquierda`, `chevron-derecha` y `libro`.
- Reemplazos:
  - Los chips de categoría, el badge de categoría y los `h1` de categoría usan `GlifoCategoria`.
  - Las guías usan `libro`.
  - Las viñetas ✔️ usan `check`.
  - Las flechas de texto de los enlaces van como `Icono` después del texto.
  - El ✕ del visor pasa a `cerrar`.
  - El «+» del FAQ pasa a `mas`, con rotación al abrir solo bajo `motion-safe`.
  - Las estrellas ★ de `ReviewsProducto` usan el SVG de `Estrellas`.
  - El 🔍 de la 404 pasa a `buscar`.
- Datos: se retira `emoji` de `site.json` (`categorias`), de la constante `CATEGORIAS` del generador, del frontmatter de fichas (generador y `content.config.ts`), del frontmatter de guías, de los `h1` de `content/paginas/*.md` y de `content/paginas/inicio.md`. El chunk corre `npm run generar` y commitea las fichas regeneradas: el único diff permitido en `content/productos/` es la línea `emoji`.

## D11. Interfaz: táctil, fijos, visor, imágenes, anuncios y URL

- Objetivos de 44 px:
  - Chips: `min-h-11 px-3`.
  - Enlaces del footer y del menú: `py-3` o `min-h-11 inline-flex items-center`, con `gap-2` entre ellos.
  - La hamburguesa y el cerrar del visor pasan a `size-11`.
  - Las migas y los enlaces sueltos de bloque llevan `min-h-11 inline-flex items-center`.
  - `summary` del FAQ con `min-h-11`.
  - El logo, con `min-h-11` en su enlace.
- Burbuja: `bottom: max(1.25rem, env(safe-area-inset-bottom))` (y lo mismo con `right`). `viewport-fit=cover` en el meta viewport. El footer suma `padding-bottom` de 96 px en móvil.
- Visor: `<dialog>` con `m-auto`, porque el preflight de Tailwind pone `margin: 0`.
- Imágenes:
  - El logo del header va con `loading="eager"`.
  - Las tarjetas aceptan `prioridad`, y las 4 primeras de cada listado van `eager`.
  - Las miniaturas de la galería salen con `widths={[84, 168, 252]}` y `sizes="84px"` en `<Image>`.
  - El tope de despliegue de la foto principal es su ancho natural.
- Regiones live: en el buscador, un `<p role="status" class="sr-only">` con «N productos» o el mensaje vacío. En la ficha, el bloque de precio y opción activa va dentro de `aria-live="polite"`.
- URL:
  - El buscador lee `q` de `location.search` al hidratar y escribe con `history.replaceState`.
  - La ficha usa `?opcion=<slug(nombre de la opción)>`; en una familia agrupada, `slug(grupo)-slug(opción)`.
  - El canonical se arma con `Astro.url.pathname`, sin query, así que no cambia; el test lo afirma.

## D12. Analítica: build con GA4

- `astro.config.mjs` lee `outDir` de `AGAS_OUT_DIR`, con `dist` por defecto.
- `playwright.config.ts` pasa a tener dos `webServer`:
  - El actual.
  - Otro con `PUBLIC_GA4_ID=G-TEST AGAS_OUT_DIR=dist-ga4 npm run build && AGAS_OUT_DIR=dist-ga4 npm run preview -- --port $E2E_PORT_GA4`, con 4322 por defecto.
- El proyecto `ga4` solo corre `e2e/spec/analitica/**`. Los proyectos `desktop` y `mobile` lo ignoran.
- `dist-ga4/` va en `.gitignore`.
- Los eventos se observan reemplazando `window.gtag` con `page.addInitScript` antes de la navegación, y registrando las llamadas.

## D13. Marca: arnés de los generadores

- Los dos scripts exportan `main({ salida })` y sus funciones de render, y solo ejecutan `main()` cuando son el módulo de entrada. `FONTCONFIG_FILE` se fija dentro de `main`, no al importar. La guarda pasa a lanzar un error que `main` convierte en `process.exit(1)`, así el test la observa sin matar el proceso.
- Guarda de render vacío de `generar-marca-ml.mjs`: compara los píxeles crudos (`raw()`) contra el color de fondo. Hoy usa `trim().metadata()`, que devuelve el ancho del lienzo y nunca falla.
- `site.json` agrega `presentacionRedes: "Tienda online chilena"`. El script arma la línea con ese campo, `direccion.localidad` y `sellosConfianza[0]`.
- Determinismo: dos corridas a dos `tmp` y comparación de bytes. Las dimensiones y el peso de los PNG comprometidos se leen con `sharp(...).metadata()`.
- Constelación: `animation-iteration-count` y duración tales que la animación termine en a lo más 5 s, por ejemplo 2 iteraciones de 2.5 s con `alternate` y `fill-mode: both`. El test e2e espera 5.5 s y comprueba `document.getAnimations()` en la constelación.

## D14. Páginas de muestra

`e2e/spec/_muestras.ts` elige las páginas de muestra en tiempo de test desde los datos: `/`, `/productos/`, la primera ficha con `grupos`, la primera ficha `simple`, `/promociones/`, la primera guía y `/contacto/`. Los slugs no se escriben a mano. Lo usan los requirements de interfaz y los de seo-geo que recorren páginas; los que recorren el sitemap leen `sitemap-0.xml` del build.

## D15. Cierre documental (documentador)

- Antes de `openspec archive`: cada capability nueva recibe su `## Purpose` en una línea, y los contratos ya están en los requirements.
- Después: `openspec validate --specs --strict`, y el directorio del cambio se borra en el mismo commit.
- Se borran `docs/adr/` y `docs/analisis-*.md`. `docs/analitica.md` queda solo con la operación: registro de dimensiones, DebugView, AI Crawl Control y revisión legal.
- README:
  - El runbook describe Cloudflare Pages con integración Git.
  - La regla de fechas de promociones queda igual a la de la skill.
  - Se quita «desde cero» del barrido.
  - Se retira `catalogo.json`.
  - `llms.txt` se construye en el build.
  - La estructura incluye `openspec/`, `tests/spec/`, `e2e/spec/` y `tests/python/`.
- `AGENTS.md`: apuntar a `openspec/specs/` como fuente de verdad y quitar las referencias a ADR.
- Skill `refresco-catalogo`:
  - Quitar las referencias a ADR.
  - `npm run generar` ya no escribe `catalogo.json` ni `llms.txt`.
  - Las promociones se reflejan en `llms.txt` con el próximo build.
  - Agregar `npm run test:py`.
- CHANGELOG: una sola entrada, con cifras salidas de comandos.
