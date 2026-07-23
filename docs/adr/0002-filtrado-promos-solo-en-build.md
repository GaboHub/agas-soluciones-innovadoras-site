# 0002. Filtrado de vigencia de promociones solo en build

## Estado

Aceptada, 2026-07-23.

## Contexto

El ADR 0001 estableció que la vigencia de cupones y campañas se filtra dos
veces: en build, para no incluir contenido ya vencido en el HTML generado,
y en cliente, con un script que ocultaba o reclasificaba tarjetas según la
fecha del navegador, pensado para que una promo que vence mientras la
página sigue cacheada dejara de mostrarse sin esperar un redeploy.

Una auditoría SEO/GEO mostró que ese filtrado en cliente no protege a
quienes más importa proteger: los crawlers de IA (GPTBot, ClaudeBot,
PerplexityBot, entre otros) no ejecutan JavaScript y leen directamente el
HTML servido en build, y `public/llms.txt` es un archivo estático que no
pasa por ningún filtrado en el navegador. Para esos consumidores, la única
frescura real de la información de vigencia la da el momento del último
redeploy, nunca el script de cliente. Mantener dos implementaciones de la
misma semántica de vigencia (`clasificar`/`hoyEnChile` en build y su
equivalente en cliente) duplicaba superficie de error para una protección
que no alcanzaba a los consumidores críticos.

## Decisión

El filtrado de vigencia de cupones y campañas se hace exclusivamente en
build, con `src/lib/promociones.ts` (`clasificar`, `hoyEnChile`,
`getCuponesPublicables`, `getCampanasPublicables`). Se elimina el filtrado
en cliente (`src/lib/promoFiltro.ts` y los `<script>` que lo invocaban en
`/promociones/` y en `PromocionesResumen.astro`).

El dueño del sitio redespliega manualmente al vencer cada promo, apoyado
en recordatorios personales para el día siguiente al vencimiento de cada
cupón o campaña (ver README, sección "Mantención de promociones"). Un
push a `main` o el botón de redeploy del dashboard de Cloudflare Pages
disparan el build y publican el HTML ya filtrado.

## Consecuencias

- Menos código: se elimina `src/lib/promoFiltro.ts` y los `<script>` de
  cliente, y queda una única fuente de la semántica de vigencia.
- El sitio nunca afirma una promo vencida frente a un crawler de IA o a
  cualquier consumidor que solo lea el HTML de build, que es exactamente
  el escenario que más importaba proteger.
- Entre el vencimiento real de una promo en Mercado Libre y el próximo
  redeploy del sitio, un visitante humano puede ver brevemente una promo
  ya vencida en el HTML servido. Es una ventana asumida y acotada por los
  recordatorios de redeploy del dueño del sitio.
