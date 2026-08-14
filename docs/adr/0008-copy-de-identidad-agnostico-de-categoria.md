# 0008. El copy de identidad es agnóstico de categoría

## Estado

Aceptada, 2026-08-14. No anula a ningún ADR anterior: el
[ADR 0003](0003-identidad-visual-serena-e-innovadora.md) dejó el copy del hero
—`titulo`, `acentuada`, `bajada`, `chip`, `leyendaConstelacion`— como dato de
negocio en `src/data/site.json`, y esta decisión usa ese mecanismo tal cual, sin
cambiarlo. Lo que cambia son los valores, no dónde viven ni quién los tipa.

## Contexto

El copy de identidad del sitio describía a AGAS por su catálogo: el `tagline`
decía «Soluciones innovadoras en accesorios tech», el `<h1>` del home
«Soluciones innovadoras para tu mundo tech» y la `descripcion` —que es la meta
description del home y el `description` del JSON-LD de `WebSite`
(`grep -n "site.descripcion" src/pages/index.astro src/lib/seo.ts`)— abría con
«Tienda online chilena de accesorios de tecnología». La misma frase estaba
copiada en la cabecera de `public/llms.txt` y en el párrafo «Quiénes somos» de
`content/paginas/inicio.md`.

El dueño del sitio decidió el 2026-08-14 que ese encuadre es más chico que el
negocio: AGAS hoy vende tecnología, pero el giro podría abarcar rubros como
hogar u organización, y una identidad que se declara «tienda de accesorios de
tecnología» obliga a reescribirla el día que entre la primera categoría que no
lo sea. Lo tech pasa a ser **el catálogo actual**, no la identidad.

La restricción que acota la solución ya estaba tomada y sigue vigente: el
ADR 0003, «Decisiones del dueño del sitio (2026-08-06)», punto 2, primer ajuste
—«el sitio no hace ninguna referencia a "lo que viene" ni a la expansión futura
del giro; la identidad la anticipa, el copy no la anuncia». Así que el copy
nuevo no puede prometer categorías futuras: tiene que ser agnóstico sin aludir a
la expansión.

## Decisión

**El copy de identidad describe el criterio de selección, no el rubro; el rubro
aparece como catálogo de hoy.** Los cuatro campos de `src/data/site.json` que lo
sostienen quedan así:

| Campo | Valor |
| :--- | :--- |
| `tagline` | Productos elegidos con criterio para tu día a día |
| `descripcion` | Tienda chilena que elige con criterio productos para tu día a día —hoy gaming y audio— y vende por Mercado Libre con reputación verde y despacho a todo Chile. |
| `hero.titulo` | Soluciones innovadoras para tu día a día |
| `hero.bajada` | Seleccionamos con criterio productos que resuelven de verdad: hoy, los que cuidan tus consolas y tu música. Compra protegida por Mercado Libre y despacho el mismo día a todo Chile. |

El patrón es el mismo en los cuatro: la marca se define por **cómo elige**
(«con criterio», «que resuelven de verdad») y para qué («tu día a día»), y lo
tech entra con un marcador temporal explícito —«hoy»— que lo deja como estado
del catálogo. No hay ninguna mención a rubros futuros ni a expansión, según el
ADR 0003.

**La `descripcion` se recortó para no romper el gate de SEO.** La meta
description del home sale de ese campo, y `e2e/seo.spec.ts` exige 160
caracteres como máximo (`grep -n "toBeLessThanOrEqual(160)" e2e/seo.spec.ts` →
línea 34). La versión vigente mide 158:

```sh
node -e "console.log(require('./src/data/site.json').descripcion.length)"
```

Los 2 caracteres de margen son el motivo de que la frase diga «—hoy gaming y
audio—» y no una enumeración más larga: cualquier reescritura futura de este
campo tiene que volver a pasar por ese comando antes de que la suite lo atrape.

**El mismo texto en `llms.txt` se sincroniza en el generador, no en el archivo.**
`public/llms.txt` es salida de `npm run generar`, así que la frase de cabecera
vive en el string de `construirLlmsTxt()` de `scripts/generar-catalogo.mjs`
(`grep -n "elige con criterio" scripts/generar-catalogo.mjs src/data/site.json`).
Ahí quedó la misma frase que la `descripcion`, con la coma antes de «con
reputación verde» que ese string ya traía y que la `descripcion` no tiene: es
una diferencia preexistente de puntuación, no dos textos distintos. El archivo
generado no se edita a mano; se regeneró.

**La categoría de descarte también deja de ser tech.** El resumen del fallback
`otros` de `CATEGORIAS` en el mismo script pasa de «Otros accesorios de
tecnología de nuestra tienda.» a «Otros productos de nuestra tienda.»
(`grep -n "Otros productos de nuestra tienda" scripts/generar-catalogo.mjs`).
Es la categoría que recibiría un producto de un rubro nuevo, y era justamente la
que lo habría llamado tech.

**El párrafo «Quiénes somos» de `content/paginas/inicio.md`** pasa a nombrar
primero el criterio y después el catálogo: «tienda online chilena que selecciona
con criterio productos para tu día a día. Hoy: láminas de vidrio templado…». El
listado de productos concretos no se toca: describe lo que hay hoy y es
correcto.

**Solo `hero.titulo` queda fijado por tests de contenido.** Dos aserciones lo
exigen literal —`tests/unit/site.test.ts` sobre el dato y `e2e/navegacion.spec.ts`
sobre el `<h1>` renderizado
(`grep -rn "Soluciones innovadoras para tu día a día" tests/ e2e/`)—, y se
actualizaron con el copy. `tagline`, `descripcion` y `hero.bajada` no tienen
aserción de contenido: lo único que los observa es la cota de longitud de la
meta description y un `bajada.length > 0`
(`grep -rn "site.tagline\|site.descripcion\|hero.bajada" tests/ e2e/` → una
sola línea).

### Decisiones del dueño del sitio (2026-08-14)

1. AGAS no se limita al rubro tech. El copy de identidad tiene que ser agnóstico
   de categoría: lo tech es el catálogo de hoy, no lo que la marca es.
2. Sigue en pie el ajuste del ADR 0003: nada de aludir públicamente a la
   expansión futura del giro. El copy se vuelve agnóstico sin anunciar rubros
   nuevos.
3. La primera publicación de Instagram sale con este copy, no con el anterior.

## Consecuencias

- **Las láminas del carrusel de redes hornean `hero.titulo` y `hero.bajada`**, así
  que cambiar el copy obliga a regenerar los siete PNG de `marca/redes/` con
  `node scripts/generar-marca-redes.mjs` (ADR 0007). Se regeneraron en este mismo
  cambio. Es la segunda clase de dato que viaja horneada en esos assets, después
  de los conteos por categoría: la regla del ADR 0007 —regenerar **y**
  republicar— aplica igual al copy.
- **`marca/redes/primera-publicacion/` es un registro de instantánea, no una
  copia viva.** Guarda las seis láminas tal como salieron al aire más el caption
  (`texto-del-post.txt`). Cuando el copy o el catálogo cambien y se regeneren las
  canónicas de `marca/redes/`, esa carpeta **no** se actualiza: su valor es decir
  qué se publicó el 2026-08-14. Quien la confunda con las canónicas va a
  republicar una versión vieja.
- **El copy de identidad quedó agnóstico; el copy de catálogo no, y no tenía por
  qué.** Superficies que siguen diciendo «accesorios» describen correctamente lo
  que hay hoy y no se tocaron:
  `grep -rn "accesorios" src/pages/productos/index.astro src/pages/404.astro src/pages/preguntas-frecuentes/index.astro content/paginas/nintendo-switch.md`.
  El límite del cambio es la identidad, no el catálogo.
- **`hero.leyendaConstelacion` —«Gaming · Audio · Compra protegida»— queda como la
  última cadena del hero atada a categorías** (`grep -n "leyendaConstelacion"
  src/data/site.json`). Es un pie de la pieza gráfica que nombra las categorías
  vigentes, y no se cambió aquí: qué hacer con ella es decisión del dueño, no de
  la implementación. Mientras siga así, el hero es agnóstico en el titular y
  específico en la leyenda.
- La regeneración del catálogo que acompañó al cambio **sacó dos campañas de
  `public/llms.txt`**: «Oferta vigente julio–agosto» (hasta el 2026-08-12) y «Día
  de la Niñez 2026» (hasta el 2026-08-08). No es efecto del copy: el propio
  generador filtra por fecha al construir la sección de promociones
  (`grep -n "hasta >= hoy" scripts/generar-catalogo.mjs` → líneas 939 y 940), y
  las dos ventanas ya habían vencido. Es la contraparte, en el archivo generado,
  del filtrado en build que el ADR 0002 fijó para las páginas.
- Los conteos por categoría **no** se movieron con este cambio —al 2026-08-14,
  `nintendo-switch 14`, `playstation-5 7`, `audio 2`, cifras perecederas que se
  recuentan con
  `node -e "require('./src/data/site.json').categorias.forEach(c => console.log(c.slug, c.productos.length))"`—,
  así que la diferencia entre los PNG viejos y los nuevos es solo de textos.
- El copy sigue siendo dato de negocio en `src/data/site.json` y en `content/`:
  ningún componente lo lleva hardcodeado, y una futura reescritura vuelve a ser
  editar esos archivos, correr `npm run generar` y regenerar los assets de redes.
  Las suites quedaron en verde tras el cambio (`npm run build`, `npm test`).
- Los ADR 0001, 0002, 0004, 0005, 0006 y 0007 no afirman nada sobre el texto del
  copy de identidad: ninguno cita los valores viejos
  (`grep -rn "mundo tech\|accesorios tech\|de accesorios de tecnología" docs/adr/000[1-7]*.md`
  no devuelve líneas), así que este cambio no los falsifica y ninguno se toca. El
  ADR 0003 sí habla del copy, pero de dónde vive y de qué no puede decir, no de su
  texto: las dos cosas siguen valiendo tal cual.
