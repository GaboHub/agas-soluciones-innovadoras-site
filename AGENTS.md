# Guía para agentes

## Qué es este proyecto

Sitio web de AGAS Soluciones Innovadoras (agassoluciones.cl): vitrina estática del catálogo de un ecommerce chileno que vende por Mercado Libre —hoy, accesorios de tecnología— (Astro + Tailwind 4 + islas React + Vitest + Playwright, deploy en Cloudflare Pages). No hay carrito ni checkout: cada producto deriva con su CTA "Ver en Mercado Libre" al permalink de la publicación.

## Fuente de verdad

El comportamiento vigente vive en `openspec/specs/<capability>/spec.md` (8 capabilities) y se edita en sitio. Cada requirement lo cita un test de spec (`tests/spec/`, `e2e/spec/`, `tests/python/spec/`) y las auditorías fallan ante citas rotas o requirements sin test.

## Invariantes

- Los datos de negocio viven SOLO en `src/data/*.json`, `content/` y los tokens `@theme` de `src/styles/global.css`. Nunca hardcodeados en componentes, layouts o páginas.
- El contenido del catálogo es GENERADO: `npm run generar` (`scripts/generar-catalogo.mjs`) lee el barrido de Mercado Libre en `../agas-context` y regenera `content/productos/`, `src/assets/images/productos/` y `src/data/resenas.json`; `llms.txt` lo construye el build (`src/pages/llms.txt.ts`). `../agas-context` lo produce exclusivamente `npm run barrido` (`scripts/exportar-contexto-ml.py`, configurado por `.env`); es la única escritura permitida sobre ese directorio, nunca a mano. No se editan a mano los archivos generados: un dato malo se corrige en el script de barrido o en el generador, y se regenera. El generador descarta publicaciones (y miembros de familia) cuyo estado no es `active` antes de resolver duplicados de catálogo, y al agregar reseñas de familia deduplica por firma del bloque (promedio, cantidad, distribución y comentarios), porque Mercado Libre replica el mismo bloque en varios miembros.
- Los tokens de color son de rol, no de color literal: `primario` (marca, headers, CTAs), `acento` (links, botones secundarios), `destacado` (badges, highlights), `tinta` (texto), `fondo` (superficie). Cada uno con variantes `-oscuro`/`-claro` donde existan. Retematizar el sitio = editar los valores de `@theme` y las fuentes en `global.css`; ningún componente se toca. Todos los pares de tokens de texto cumplen contraste AA; las utilidades con opacidad (`text-tinta/NN`, `text-white/NN`) se miden componiendo el color sobre su superficie y algunas quedan bajo AA desde `v1.0.0`.
- Imágenes de producto en `src/assets/images/productos/<slug>/`, resueltas por `src/lib/images.ts`; logos en `src/assets/images/` (`agas-lockup.svg`, `agas-lockup-blanco.svg`, `logo.png`) y `public/favicon.svg`.
- Los rasters de marca son GENERADOS por dos scripts: `node scripts/generar-marca-ml.mjs` produce `public/logo.png`, `public/apple-touch-icon.png`, `src/assets/images/logo.png` y los tres de `marca/mercadolibre/`; `node scripts/generar-marca-redes.mjs` produce los siete de `marca/redes/` (`avatar.png` y `carrusel-presentacion-1..6.png`). Ninguno se edita a mano ni se rehace en un editor de imágenes: un cambio de paleta o de textos se hace en el script que corresponda (o en `src/data/site.json`, de donde salen los textos de los banners y los del carrusel, incluidos los conteos por categoría) y se vuelve a correr ese script. Los conteos del carrusel quedan horneados en el PNG: tras un `npm run generar` que los mueva hay que regenerar los assets de redes y republicarlos. `marca/` queda fuera del build.
- Precios siempre referenciales con fecha (`fechaPrecio` del barrido, leyenda "Precio referencial al DD-MM-AAAA — ver precio vigente en Mercado Libre"). Nunca se publica stock.
- Promociones y cupones sí se publican, pero SOLO desde `src/data/promociones.json`, dato de negocio curado a mano: nunca se autogeneran desde el barrido. Cada promo lleva ventana de vigencia explícita, la aclaración de que el beneficio se obtiene comprando directamente en Mercado Libre, y filtrado por fecha en build; las promos vencidas desaparecen en el siguiente redeploy, y el flujo de mantención exige redesplegar al vencer cada promo (ver README, sección "Mantención de promociones"). No se publican porcentajes ni precios promocionales derivados del barrido: el estado `candidate`/`started` de ML no garantiza que el descuento esté aplicado.
- El código no lleva comentarios de ningún tipo; única excepción, directivas funcionales (`// @ts-check`, `@ts-expect-error`, shebangs). La documentación va en Markdown.
- Tras cualquier cambio, `npm run check`, `npm run build`, `npm run test:unit` y `npm run test:e2e` deben quedar en verde (si el puerto 4321 está ocupado por otro proyecto, `E2E_PORT=4331 npm run test:e2e`). Tras tocar el script generador, además `npm run generar` seguido de `npm run build`.

## Versionado

SemVer manual con `CHANGELOG.md` (Keep a Changelog). Todo cambio notable se anota en `[Unreleased]` en el mismo commit que lo introduce. Los releases se cortan según el flujo de `README.md`, sección "Versionado y releases" (`npm run release:patch|minor|major` + `git push --follow-tags`), solo cuando el usuario lo pida.

## Refresco del catálogo

El flujo de actualización está documentado en `README.md`, sección "Refresco del catálogo", y en la skill `.claude/skills/refresco-catalogo/SKILL.md`: `npm run barrido` → `npm run generar` → (regenerar y republicar assets de redes si cambió algún conteo por categoría) → `npm run build`. Sin trabajo manual intermedio.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
