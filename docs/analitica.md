# Analítica del sitio

El sitio mide con Google Analytics 4 (GA4). La carga de GA4 vive en
`src/components/Analitica.astro` (snippet de gtag.js, inicialización con `define:vars`
y listener delegado de clicks salientes, hacia redes sociales y de contacto);
`src/layouts/BaseLayout.astro` solo resuelve
`PUBLIC_GA4_ID` y renderiza ese componente condicionalmente en builds de producción con
la variable definida (configurada en Cloudflare Pages). Sin esa variable —dev local,
tests, previews sin configurar— el sitio no carga ningún beacon.

La medición del buscador vive aparte: `src/lib/analitica.ts` (`normalizarTermino` y
`crearMedidorBusqueda`, funciones puras) y `src/components/BuscadorProductos.tsx`, que
la conecta. Esa isla es `client:load`, así que su código viaja en el bundle aunque la
analítica esté apagada; lo que la neutraliza no es la condición de render sino la guarda
`typeof window.gtag === 'function'` del medidor: sin `gtag` cargado calcula el término y
no emite nada.

Se registran cinco señales:

- `page_view`: automático en cada página.
- `clic_saliente`: click en cualquier link hacia los dominios configurados en
  `src/data/site.json` → `analitica.dominiosSalientes` (hoy: `mercadolibre.cl` y sus
  subdominios; `grep -n "dominiosSalientes" src/data/site.json`). Parámetros: `destino`
  (URL de la publicación en ML) y `pagina` (path de la página del sitio donde ocurrió el
  click). Es el evento clave de la conversión sitio→ML (más abajo), así que su lista de
  dominios queda reservada a los del marketplace: cualquier otro destino externo se mide
  con un evento propio para no contaminar ese numerador.
- `clic_red_social`: click en cualquier link hacia los dominios configurados en
  `src/data/site.json` → `analitica.dominiosRedes` (hoy: `instagram.com` y sus
  subdominios; `grep -n "dominiosRedes" src/data/site.json`), con el mismo matching por
  sufijo de hostname que `dominiosSalientes` —comparten la función `destinoSaliente` de
  `src/lib/analitica.ts`—. Hoy lo emiten el enlace «Instagram» del footer global y el
  botón de `/contacto/`, ambos leyendo `redes.instagram` de `src/data/site.json`
  (`grep -rn "redes.instagram" src/components/Footer.astro src/pages/contacto/index.astro`).
  Parámetros: `destino` (la URL de la red social) y `pagina` (path donde ocurrió el
  click). Existe como evento aparte para medir los seguimientos hacia redes sociales sin
  contaminar `clic_saliente`, que queda exclusivo de los dominios de marketplace y sigue
  siendo el evento clave de la conversión sitio→ML. Reutiliza `destino` y `pagina`, ya
  registradas, así que no necesita configuración nueva en GA4.
- `clic_contacto`: click en cualquier enlace `mailto:`; hoy, el correo de ventas por
  volumen que renderizan el footer global y `/contacto/`
  (`grep -rn "mailto:" src/components/Footer.astro src/pages/contacto/index.astro`).
  Lo pidió el dueño el 2026-08-06 para ver la demanda mayorista que no pasa por Mercado
  Libre. Parámetros: `destino` (el correo, sin la query del `mailto:` — un `?subject=`
  no viaja) y `pagina` (path donde ocurrió el click). Reutiliza `destino` en vez de
  estrenar una dimensión `canal`: `destino` y `pagina` ya están registradas (verificable
  en **Administrar → Visualización de datos → Definiciones personalizadas**), así que el
  evento no necesita configuración nueva en GA4. Dos consecuencias de esa reutilización:
  como las dos superficies leen el mismo `contacto.email` de `src/data/site.json`,
  `destino` es constante mientras haya un solo correo y lo que discrimina es `pagina`;
  y como `clic_saliente` (URLs de ML) y `clic_red_social` (URLs de redes) también usan
  `destino`, toda exploración sobre la dimensión `Destino` tiene que filtrar por evento
  o mezcla correos, URLs de ML y URLs de redes en la misma tabla.
- `busqueda`: consulta escrita en el buscador de productos. Parámetros: `termino` (la
  consulta normalizada —minúsculas, sin tildes y con espacios colapsados—, de modo que
  `Mando`, `mando` y `mando ` cuentan como el mismo término), `resultados` (cantidad de
  productos del catálogo que matchean esa consulta) y `pagina` (path donde ocurrió; hoy
  el buscador se monta solo en `/productos/`, `grep -rl BuscadorProductos src/pages`).
  Se emite 1,5 s después de la última tecla, y no re-emite si el término normalizado
  coincide con el último emitido (el medidor recuerda solo el último, así que volver a
  un término anterior sí vuelve a emitir); vaciar el campo no emite nada. Responde qué
  buscan los usuarios y qué búsquedas quedan sin resultados —`resultados: 0` es demanda
  que el catálogo no cubre—; cómo explotarlo, más abajo.

Los tres eventos de click salen del mismo listener delegado de
`src/components/Analitica.astro`, que evalúa cada click en un orden fijo
—`dominiosSalientes` → `dominiosRedes` → `mailto:`— y corta en el primer match, así que
un click emite a lo más uno de los tres
(`grep -n "clic_saliente\|clic_red_social\|clic_contacto" src/components/Analitica.astro`).
Ese orden solo se vuelve visible si un dominio quedara en las dos listas: ganaría
`clic_saliente`. Mantenerlas disjuntas es lo que sostiene la separación.

## Registrar las dimensiones personalizadas (configuración única en GA4)

GA4 recibe los parámetros `destino`, `pagina`, `termino` y `resultados` pero no los
muestra en ningún informe hasta registrarlos como dimensiones personalizadas. Sin este
paso, el detalle del evento `clic_saliente` muestra "Parameter name" vacío. Se hace una
sola vez, en la consola:

1. **Administrar (engranaje) → Visualización de datos → Definiciones personalizadas →
   Crear dimensión personalizada**.
2. Dimensión 1: nombre `Destino`, alcance **Evento**, parámetro del evento `destino`
   (exactamente así, en minúscula).
3. Dimensión 2: nombre `Pagina`, alcance **Evento**, parámetro `pagina`.

Los eventos `clic_contacto` y `clic_red_social` reutilizan esas dos dimensiones y no
aportan parámetros nuevos: **no hay nada que configurar en GA4 por ellos**, ni en la
consola ni corriendo el script de administración de más abajo.

El evento `busqueda` reutiliza `pagina`, ya registrada (verificable en **Administrar →
Visualización de datos → Definiciones personalizadas**), así que le faltan solo `termino`
y `resultados`. Esas dos no necesitan la consola: las crea por API el script de la skill
`analitica-ga4`, con la cuenta de servicio impersonada. El mail de esa cuenta no se
escribe en este repo: vive como `GA4_ADMIN_SA` en el `.env` privado de la raíz
(gitignoreado), y el comando lo lee de ahí:

```bash
source .env
python3 ~/.claude/skills/analitica-ga4/scripts/crear_dimensiones.py \
  --impersonar "$GA4_ADMIN_SA" \
  G-WRK4VS1HLE=termino,resultados
```

El script resuelve la propiedad por measurement ID, crea cada parámetro con alcance
**Evento** y el nombre capitalizado (`Termino`, `Resultados`) —el mismo resultado que los
pasos manuales de arriba— y es idempotente: los parámetros ya registrados los reporta
como existentes en vez de duplicarlos, así que se puede volver a correr sin miedo.

`resultados` queda como dimensión, no como métrica: sirve para segmentar y filtrar por
valor exacto (por ejemplo, quedarse con los eventos de `resultados` = `0`), no para
promediarlo en un informe.

Advertencias de GA4:

- Tarda 24–48 h en empezar a poblarse en los informes.
- No es retroactivo: los eventos anteriores al registro no muestran sus parámetros en
  los informes. Para verificar en el momento que un parámetro llega bien, usar
  **Administrar → DebugView** o el informe de Tiempo real, que sí muestran parámetros
  sin registro previo.

## Qué productos visitan más los usuarios

Cada producto tiene URL propia (`/productos/<slug>/`), así que popularidad = vistas por path.

En GA4: **Informes → Interacción → Páginas y pantallas**. Filtrar por ruta que empiece
con `/productos/` y ordenar por vistas.

## Qué buscan los usuarios en el catálogo

El evento `busqueda` responde dos preguntas con el mismo dato.

**Términos más frecuentes**: en GA4, **Explorar → exploración libre**, dimensión
`Termino` y métrica "Número de eventos", filtrado al evento `busqueda`. Es la demanda
dicha con las palabras del usuario: sirve para nombrar productos, guías y categorías
como la gente los busca, no como los nombra el proveedor.

**Búsquedas sin resultados**: la misma exploración agregando el filtro `Resultados`
exactamente `0`. Cada término de esa lista es demanda que el catálogo no cubre —o que
cubre con un nombre que el buscador no matchea—; para distinguir los dos casos, buscar
el producto a mano en `/productos/`: si está, el problema es de nomenclatura; si no
está, es un hueco de catálogo.

Las cifras que salgan de acá son perecederas y dependen del período elegido: se releen
en GA4 cada vez, no se transcriben a este doc.

## Cuánto tráfico se convierte en salidas hacia Mercado Libre

La tasa de conversión sitio→ML de un producto es `clic_saliente` / `page_view` de su ficha.

En GA4: **Explorar → exploración libre**, dimensión "Ruta de página", métricas "Vistas" y
"Número de eventos" filtrado a `clic_saliente`. La dimensión personalizada `pagina` del
evento permite atribuir el click a la ficha donde ocurrió; el parámetro `destino` permite
agrupar por publicación de ML.

Para verlo como conversión en los informes estándar: **Administrar → Eventos → marcar
`clic_saliente` como evento clave**.

`clic_red_social` **no** entra en este numerador y **no** se marca como evento clave:
mide seguimiento en redes, no salida hacia el marketplace. Por eso `instagram.com` vive
en `dominiosRedes` y no en `dominiosSalientes`
(`grep -n "dominiosSalientes\|dominiosRedes" src/data/site.json`). Si algún día se agrega
otro destino externo que no sea marketplace, el criterio es el mismo: lista propia y
evento propio, no `dominiosSalientes`.

## Cuánto seguimiento hacia redes sociales genera el sitio

`clic_red_social` cuenta las intenciones de seguir la marca fuera del sitio.

En GA4: **Explorar → exploración libre**, dimensión `Pagina` y métrica "Número de
eventos", **filtrado al evento `clic_red_social`** —sin ese filtro la dimensión `Destino`
mezcla los tres eventos de click, ver arriba—. Así se separa el enlace del footer global,
presente en todas las páginas, del botón propio de `/contacto/`.

Mide intención, no seguidores: el click abre Instagram fuera del sitio y GA4 no ve si la
visita termina en un follow. El conteo de seguidores se lee en Instagram, no acá.

## Cuántos contactos de ventas por volumen genera el sitio

`clic_contacto` cuenta las intenciones de contacto mayorista fuera de Mercado Libre.

En GA4: **Explorar → exploración libre**, dimensión `Pagina` y métrica "Número de
eventos", **filtrado al evento `clic_contacto`** —sin ese filtro la dimensión `Destino`
mezcla correos con URLs de ML y de redes, ver arriba—. Así se separa el footer global,
presente en todas las páginas, del bloque propio de `/contacto/`.

Mide intención, no resultado: el click abre el cliente de correo del visitante, y si el
mensaje llega a enviarse ocurre fuera del sitio y GA4 no lo ve.

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
vendedor: no hay pixel ni postback. Tampoco existe hoy el cupón exclusivo del sitio: la
"campaña de cupón del vendedor" (código propio aplicable en el checkout) está disponible
solo en Brasil según la doc de la API de ML (verificado 2026-08; los cupones de
`src/data/promociones.json` son la mecánica de seguidores de ML, sin código). Si ML
habilita esa campaña en Chile, cada canje del código publicado solo en agassoluciones.cl
sería una conversión atribuible — revisar
developers.mercadolibre.com/es_ar/cupones-del-vendedor cada tanto.

La señal disponible mientras tanto, gratis:

- **Correlación periódica**: cruzar los `clic_saliente` por `destino` contra las visitas
  y ventas de cada publicación en las métricas de vendedor de Mercado Libre, y observar
  si los picos del sitio mueven las visitas de ML.

## Cumplimiento

GA4 usa cookies. La ley chilena 21.719 de protección de datos personales rige desde
**diciembre de 2026**: antes de esa fecha hay que revisar si el sitio necesita aviso o
gestión de consentimiento para mantener GA4 tal como está.
