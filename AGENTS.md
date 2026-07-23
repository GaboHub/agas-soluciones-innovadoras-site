# Guía para agentes

## Qué es este proyecto

Sitio web de AGAS Soluciones Innovadoras (agassoluciones.cl): vitrina estática del catálogo de un ecommerce chileno de accesorios de tecnología que vende por Mercado Libre (Astro + Tailwind 4 + islas React + Vitest + Playwright, deploy en Cloudflare Pages). No hay carrito ni checkout: cada producto deriva con su CTA "Ver en Mercado Libre" al permalink de la publicación.

## Invariantes

- Los datos de negocio viven SOLO en `src/data/*.json`, `content/` y los tokens `@theme` de `src/styles/global.css`. Nunca hardcodeados en componentes, layouts o páginas.
- El contenido del catálogo es GENERADO: `npm run generar` (`scripts/generar-catalogo.mjs`) lee el barrido de Mercado Libre en `../agas-context` (solo lectura, nunca se modifica) y regenera desde cero `content/productos/`, `src/assets/images/productos/`, `src/data/catalogo.json`, `src/data/resenas.json` y `public/llms.txt`. No se editan a mano los archivos generados: un dato malo se corrige en el script o en el contexto, y se regenera.
- Los tokens de color son de rol, no de color literal: `primario` (marca, headers, CTAs), `acento` (links, botones secundarios), `destacado` (badges, highlights), `tinta` (texto), `fondo` (superficie). Cada uno con variantes `-oscuro`/`-claro` donde existan. Retematizar el sitio = editar los valores de `@theme` y las fuentes en `global.css`; ningún componente se toca. Todos los pares de texto cumplen contraste AA.
- Imágenes de producto en `src/assets/images/productos/<slug>/`, resueltas por `src/lib/images.ts`; logos en `src/assets/images/` (`agas-lockup.svg`, `agas-lockup-blanco.svg`, `logo.png`) y `public/favicon.svg`.
- Precios siempre referenciales con fecha (`fechaPrecio` del barrido, leyenda "Precio referencial al DD-MM-AAAA — ver precio vigente en Mercado Libre"). Nunca se publica stock.
- Promociones y cupones sí se publican, pero SOLO desde `src/data/promociones.json`, dato de negocio curado a mano: nunca se autogeneran desde el barrido. Cada promo lleva ventana de vigencia explícita, la aclaración de que el beneficio se obtiene comprando directamente en Mercado Libre, y filtrado por fecha en build y en cliente para que nunca se muestre una promo vencida. No se publican porcentajes ni precios promocionales derivados del barrido: el estado `candidate`/`started` de ML no garantiza que el descuento esté aplicado (ver `docs/adr/0001-promociones-curadas.md`).
- El código no lleva comentarios de ningún tipo; única excepción, directivas funcionales (`// @ts-check`, `@ts-expect-error`, shebangs). La documentación va en Markdown.
- Tras cualquier cambio, `npm run build`, `npm run test:unit` y `npm run test:e2e` deben quedar en verde. Tras tocar el script generador, además `npm run generar` seguido de `npm run build`.

## Versionado

SemVer manual con `CHANGELOG.md` (Keep a Changelog). Todo cambio notable se anota en `[Unreleased]` en el mismo commit que lo introduce. Los releases se cortan según el flujo de `README.md`, sección "Versionado y releases" (`npm run release:patch|minor|major` + `git push --follow-tags`), solo cuando el usuario lo pida.

## Refresco del catálogo

El flujo de actualización está documentado en `README.md`, sección "Refresco del catálogo": regenerar `../agas-context` → `npm run generar` → `npm run build`. Sin trabajo manual intermedio.

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
