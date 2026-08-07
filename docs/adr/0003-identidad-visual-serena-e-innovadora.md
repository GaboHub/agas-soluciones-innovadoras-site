# 0003. Identidad visual serena e innovadora

## Estado

Aceptada, 2026-08-06. Anulada parcialmente por el
[ADR 0004](0004-burbuja-mercado-libre-en-todos-los-viewports.md) y por el
[ADR 0005](0005-paleta-acero-y-cobre-y-assets-de-marca-reproducibles.md).

## Contexto

La identidad visual del sitio hasta el commit `400df19` era la del logo
original: primario azul, acento naranja, destacado gris azulado y titulares
en Manrope 700/800 (`git show 400df19:src/styles/global.css`, bloque
`@theme`). El home la apoyaba en un lockup grande sobre degradado azul, un
badge de reputación enlazado a Mercado Libre y una decoración flotante
abstracta.

El dueño del sitio pidió un rebrand. Sobre una maqueta iterada rechazó una
primera propuesta ("vidrio templado") porque construía la identidad
alrededor de un producto del catálogo: AGAS puede expandir su giro más allá
de la venta de accesorios, y una identidad atada a un producto envejece con
el catálogo. Pidió, en cambio, una identidad innovadora, gamer sensata,
serena y profesional, anclada en la marca.

La invariante de tokens de `AGENTS.md` hace que retematizar el sitio sea
editar valores de `@theme`; el trabajo de este ADR es más amplio que eso
porque además cambia la firma visual del home, los glifos de categoría y la
forma en que el sitio ofrece el salto a Mercado Libre en móvil.

## Decisión

Se adopta la identidad "serena e innovadora": petróleo profundo como
primario, cian como acento, menta como destacado, sobre fondo casi neutro.
Los valores vigentes están en el bloque `@theme` de `src/styles/global.css`
(`grep -n -- "--color-\|--font-" src/styles/global.css`); los anteriores, en
`git show 400df19:src/styles/global.css`. Los roles de los tokens no
cambian: solo sus valores.

**Tipografía.** Los titulares pasan de Manrope a Sora (`@fontsource/sora`,
`@fontsource/manrope` desinstalado); Inter se mantiene como texto de cuerpo.
Se importan solo dos pesos de Sora, 600 y 700 (`grep -n "fontsource/sora"
src/styles/global.css`), aunque el paquete trae de 100 a 800
(`ls node_modules/@fontsource/sora/*.css`). Como consecuencia directa, los
titulares topan en `font-bold` y el sitio ya no usa `font-extrabold`
(`grep -rn "font-extrabold" src/ | wc -l` → `0`).

**Firma "baldosa AGAS".** El cuadrado de esquinas muy redondeadas del
isotipo se vuelve el elemento repetible de la identidad: `rx="24"` en los
SVG de marca (antes `20`, única modificación de geometría; el trazado del
logo no se tocó) y `rounded-[26%]` en los elementos que la citan en el sitio.

**Hero anclado en la marca, no en un producto.** El copy del hero
(`titulo`, `acentuada`, `bajada`, `chip`, `leyendaConstelacion`) y los
`sellosConfianza` son datos de negocio en `src/data/site.json`, tipados en
`src/lib/site.ts`. La pieza gráfica es `ConstelacionMarca.astro`: un rombo
de cuatro baldosas — marca, gamepad, audífonos, escudo — con flotación
declarada en el keyframe `flotar` de `global.css` y aplicada solo bajo
`motion-safe`. Todos sus colores salen de tokens vía `currentColor`. Las
tarjetas de categoría del home reemplazan el emoji por glifos SVG
(`GlifoCategoria.astro`), resueltos por slug.

**Salto a Mercado Libre por dispositivo.** En móvil, una barra fija inferior
(`BarraMercadoLibre.astro`, `md:hidden`, montada en `BaseLayout`); en
escritorio, la burbuja de siempre, ahora `hidden md:flex`. El evento
`clic_saliente` no requiere cambios: el listener de `Analitica.astro`
engancha por `href` hacia Mercado Libre, no por componente.

### Decisiones del dueño del sitio (2026-08-06)

1. Rechaza la propuesta v1 "vidrio templado" por girar en torno a un
   producto. La identidad debe ser innovadora, gamer sensata, serena y
   profesional, y sobrevivir a una expansión futura del giro de AGAS más
   allá de la venta de productos.
2. Aprueba la v2 "serena e innovadora" con tres ajustes:
   - el sitio no hace ninguna referencia a "lo que viene" ni a la expansión
     futura del giro; la identidad la anticipa, el copy no la anuncia;
   - las superficies públicas dicen "Desde Santiago a todo Chile" en vez de
     Macul (`ubicacion` y `direccion.localidad` en `src/data/site.json`,
     `content/paginas/inicio.md` y `content/paginas/contacto.md`);
   - `agassolucionesinnovadoras@gmail.com` es el contacto para ventas por
     volumen fuera de Mercado Libre, publicado en el footer y en
     `/contacto/`.

### Desviación registrada, pendiente de revisión

El glifo del gamepad de `ConstelacionMarca` usa `primario-claro` (`#dce9e7`)
y no el `#7cc8d4` de la maqueta aprobada: ese valor no es un token y la
invariante de `AGENTS.md` prohíbe color literal en componentes. La
sustitución se decidió en implementación, después de la aprobación, y el
dueño del sitio todavía no la ha visto. Queda registrada como desviación, no
como decisión aprobada: si se quiere el tono de la maqueta, la vía es
agregarlo como token, no literalizarlo en el componente.

## Consecuencias

- Retematizar sigue siendo editar `@theme`: ningún componente lleva color
  literal. Las excepciones son, como siempre, los SVG de marca
  (`src/assets/images/agas-lockup.svg`, `agas-lockup-blanco.svg`,
  `public/favicon.svg`), que son assets y llevan sus hex propios.
- El menta (`destacado`, `#7fe8c3`) es un color de texto sobre fondo oscuro.
  Sobre fondo claro no alcanza contraste AA como texto, así que esos pares
  usan `destacado-oscuro` (`#0b6b4f`). El barrido de `text-destacado` sobre
  superficies claras se hizo en este cambio; el par menta-sobre-primario
  sigue siendo válido.
- Quedan pendientes de regenerar con la paleta nueva todos los rasters de
  marca (`ls public/*.png src/assets/images/*.png marca/mercadolibre/*.png`):
  `src/assets/images/logo.png` (el que resuelve `resolveLogo` en
  `src/lib/images.ts` y termina en el JSON-LD `Organization` y en las
  imágenes Open Graph), `public/logo.png`, `public/apple-touch-icon.png`
  (derivado del anterior) y los tres de `marca/mercadolibre/`. Hasta que se
  regeneren, esos archivos conservan la identidad anterior y el sitio
  convive con dos paletas en sus rasters. `marca/mercadolibre/README.md`
  describe esos PNG en la paleta vieja y sigue siendo exacto por eso mismo.
- `docs/analisis-performance-2026-08-03.md` mide el costo de las fuentes con
  Manrope 700/800. Es un análisis fechado del estado de ese día y se deja
  como está; sus cifras de tipografía dejan de describir el bundle vigente a
  partir de este cambio.
- El home pierde el badge de reputación que enlazaba a Mercado Libre
  (`BadgeMercadoLibre.astro`, eliminado): la reputación verde ahora es un
  sello de texto del hero, sin enlace. El home mantiene enlaces salientes a
  la tienda en el CTA del hero, en el CTA de cierre, en el header, en el
  footer y en la burbuja o la barra según el dispositivo.
- `DecoracionFlotante.astro` y `BadgeMercadoLibre.astro` quedan sin uso tras
  el hero nuevo y se eliminan; no los referencia ningún archivo de código ni
  de tests (`grep -rn "DecoracionFlotante\|BadgeMercadoLibre" src/ e2e/
  tests/ | wc -l` → `0`; las únicas menciones que quedan en el repo son las
  de este ADR y las del `CHANGELOG`).
- Los ADR 0001 y 0002 tratan de promociones y no afirman nada sobre paleta,
  tipografía ni componentes del home: este cambio no anula ninguno.
