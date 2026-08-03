# Analítica del sitio

El sitio mide con Google Analytics 4 (GA4). La instrumentación completa vive en
`src/components/Analitica.astro` (snippet de gtag.js, inicialización con `define:vars`
y listener delegado de clicks salientes); `src/layouts/BaseLayout.astro` solo resuelve
`PUBLIC_GA4_ID` y renderiza ese componente condicionalmente en builds de producción con
la variable definida (configurada en Cloudflare Pages). Sin esa variable —dev local,
tests, previews sin configurar— el sitio no carga ningún beacon.

Se registran dos señales:

- `page_view`: automático en cada página.
- `clic_saliente`: click en cualquier link hacia los dominios configurados en
  `src/data/site.json` → `analitica.dominiosSalientes` (hoy: `mercadolibre.cl` y sus
  subdominios). Parámetros: `destino` (URL de la publicación en ML) y `pagina` (path de
  la página del sitio donde ocurrió el click).

## Qué productos visitan más los usuarios

Cada producto tiene URL propia (`/productos/<slug>/`), así que popularidad = vistas por path.

En GA4: **Informes → Interacción → Páginas y pantallas**. Filtrar por ruta que empiece
con `/productos/` y ordenar por vistas.

## Cuánto tráfico se convierte en salidas hacia Mercado Libre

La tasa de conversión sitio→ML de un producto es `clic_saliente` / `page_view` de su ficha.

En GA4: **Explorar → exploración libre**, dimensión "Ruta de página", métricas "Vistas" y
"Número de eventos" filtrado a `clic_saliente`. La dimensión personalizada `pagina` del
evento permite atribuir el click a la ficha donde ocurrió; el parámetro `destino` permite
agrupar por publicación de ML.

Para verlo como conversión en los informes estándar: **Administrar → Eventos → marcar
`clic_saliente` como evento clave**.

## Tráfico que llega desde asistentes de IA

Son humanos que llegaron al sitio desde una respuesta de ChatGPT, Perplexity, etc. En GA4:
**Informes → Adquisición → Adquisición de tráfico**, dimensión "Fuente de la sesión", y
buscar los referrers:

- `chatgpt.com`
- `perplexity.ai`
- `gemini.google.com`
- `copilot.microsoft.com`
- `claude.ai`

Conviene revisar la lista cada tanto: aparecen asistentes nuevos y algunos no mandan
referrer (ese tráfico cae en "Directo" y es invisible; la cifra medida es piso, no total).

## Qué leen los crawlers de IA

Los bots de IA no ejecutan JavaScript: GA4 no los ve. Se miran en Cloudflare:
**dashboard de la zona agassoluciones.cl → AI Crawl Control**, en modo observación (sin
bloquear ningún bot: el objetivo GEO del sitio es que las IAs lean el catálogo).

Ahí se ve qué paths lee cada crawler y con qué frecuencia, incluido `llms.txt`. Los bots
relevantes:

- **GPTBot** (OpenAI) y **ClaudeBot** (Anthropic): entrenamiento e indexación.
- **OAI-SearchBot** / **ChatGPT-User** y **Perplexity-User**: navegación en vivo cuando
  un usuario pregunta — la señal más cercana a "un usuario consultó este producto en IA".
- **PerplexityBot**: indexación del buscador de Perplexity.
- **Google-Extended**: uso de contenido para Gemini (no afecta el ranking de búsqueda).

Las dos métricas son complementarias: AI Crawl Control mide cuánto **leen** las IAs;
el informe de referrers de arriba mide cuánto tráfico **devuelven**.

## Señal de compras

Mercado Libre no ofrece atribución de compras hacia sitios externos en su plan de
vendedor: no hay pixel ni postback. Las señales disponibles, ambas gratis:

- **Cupón exclusivo del sitio** (en `src/data/promociones.json`, comunicado solo en
  agassoluciones.cl): cada canje es una conversión atribuible al sitio.
- **Correlación periódica**: cruzar los `clic_saliente` por `destino` contra las visitas
  y ventas de cada publicación en las métricas de vendedor de Mercado Libre, y observar
  si los picos del sitio mueven las visitas de ML.

## Cumplimiento

GA4 usa cookies. La ley chilena 21.719 de protección de datos personales rige desde
**diciembre de 2026**: antes de esa fecha hay que revisar si el sitio necesita aviso o
gestión de consentimiento para mantener GA4 tal como está.
