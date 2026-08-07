# 0005. Paleta «Acero y cobre» y assets de marca reproducibles

## Estado

Aceptada, 2026-08-06. Anula parcialmente al
[ADR 0003](0003-identidad-visual-serena-e-innovadora.md). Anulada parcialmente
por el [ADR 0006](0006-la-bajada-del-lockup-se-deriva-de-los-tokens.md).

## Contexto

El ADR 0003 fijó la identidad "serena e innovadora" sobre una paleta de
petróleo, cian y menta. Esa paleta nunca llegó a un release: se introdujo en
`a749d42`, posterior a `v1.0.0`, y se reemplaza antes de cortar el siguiente
(`git tag --list` → solo `v1.0.0`). Ya implementada y vista en el sitio, el
dueño la rechazó por genérica, y señaló al verde como la causa.

El mismo ADR 0003 dejó dos deudas abiertas que este cambio salda: los
rasters de marca seguían en la identidad anterior —el sitio convivía con dos
paletas en sus PNG— y no había forma reproducible de regenerarlos, porque
los de `marca/mercadolibre/` se habían producido a mano una sola vez.

A eso se sumaron dos defectos visuales reportados por el dueño sobre el
sitio ya construido: la leyenda de `ConstelacionMarca` se solapaba con las
baldosas de la rejilla rotada, y la marca mezclaba dos colores distintos en
el travesaño de la "A" según el asset.

## Decisión

**Paleta «Acero y cobre».** Se reemplazan los valores del bloque `@theme` de
`src/styles/global.css`; los roles de los tokens no cambian, solo sus
valores, así que ningún componente se toca (invariante de `AGENTS.md`).
Valores vigentes con `grep -n -- "--color-" src/styles/global.css`; los que
reemplaza, con `git show a749d42:src/styles/global.css`.

| Token | Petróleo (ADR 0003) | Acero y cobre |
| :--- | :--- | :--- |
| `primario` | `#0e3a43` | `#24455c` |
| `primario-oscuro` | `#082830` | `#16303f` |
| `primario-claro` | `#dce9e7` | `#dce6ed` |
| `acento` | `#0f7a8a` | `#9e5220` |
| `acento-oscuro` | `#0a5560` | `#8a4517` |
| `destacado` | `#7fe8c3` | `#e9c49a` |
| `destacado-oscuro` | `#0b6b4f` | `#7a5220` |
| `tinta` | `#10262e` | `#14232e` |
| `fondo` | `#f2f4f3` | `#f5f3f0` |

`--color-meli-tinta` (`#2d3277`) no es de la identidad AGAS sino el azul de
Mercado Libre, y no cambia.

El dueño eligió esta dirección entre cinco exploradas en una maqueta
interactiva con selector de paletas, todas construidas para cumplir AA.
Descartó violeta/lavanda, carbón/hielo, índigo/oro y mantener
petróleo/menta.

**Contraste.** Los pares de color sólido —token de primer plano sobre token
de superficie— cumplen AA (4.5:1). El peor de ellos que lleva texto es
`destacado` sobre `primario` en el hero, 6.16:1; el peor de todos es `acento`
sobre `fondo`, 5.15:1, y son los glifos de estrellas, que son `aria-hidden`
(`grep -rn "text-acento[^-]" src/` → `Estrellas.astro`,
`BuscadorProductos.tsx` y un glifo de `ConstelacionMarca.astro`, los tres
decorativos). Dentro de los assets de marca, la bajada "SOLUCIONES
INNOVADORAS" del lockup del header queda en 6.11:1 y se trata en la
desviación registrada de más abajo. Cada cifra se reproduce con:

```sh
python3 -c "
import sys
def l(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
    return .2126*c[0]+.7152*c[1]+.0722*c[2]
a,b=sorted(map(l,sys.argv[1:]),reverse=True)
print(round((a+.05)/(b+.05),2))
" '#e9c49a' '#24455c'
```

**Lo que ese barrido de pares sólidos no cubre.** Las utilidades con alfa
(`text-tinta/NN`, `text-white/NN`, `grep -rn "text-white/\|text-tinta/" src/`)
no son pares de tokens: hay que componer el color sobre su superficie antes
de medirlo, agregando al script de arriba

```py
def mezcla(fg, bg, alfa):
    return '#%02x%02x%02x' % tuple(
        round(alfa * int(fg[i:i+2], 16) + (1 - alfa) * int(bg[i:i+2], 16)) for i in (1, 3, 5)
    )
```

Compuestas sobre `fondo`, `text-tinta/80` da 7.84:1 y `text-tinta/70` 5.70:1,
pero `text-tinta/60` queda en 4.17:1 y `text-tinta/50` en 3.12:1, bajo el
4.5:1 de AA para texto normal; `text-white/60` sobre `primario` —la leyenda
de la constelación— da 4.80:1, y `text-white/55` 4.28:1. **Es una condición
anterior a este cambio**: esas utilidades y esos niveles ya estaban en el
release `v1.0.0` (`git grep -c "text-tinta/50\|text-white/60" v1.0.0 -- src/`)
y la paleta nueva mueve las cifras décimas, siempre hacia arriba
(`text-tinta/50` sobre `fondo`: 3.09:1 con petróleo, 3.12:1 con acero). No se
toca aquí porque no es lo que se decidió, y queda anotada como revisión
aparte: la invariante de `AGENTS.md` "todos los pares de texto cumplen
contraste AA" vale para los pares de tokens, no para estas opacidades.

**Travesaños "todo cobre" en la marca.** El travesaño de la "A" del isotipo
y del wordmark usa cobre en todos los assets: `#9E5220` sobre superficies
claras y `#C8813F` (cobre claro) sobre superficies oscuras. Antes se mezclaba
arena con cobre según el asset. La arena `#E9C49A` sale del logo y queda solo
como color de UI —chips, badges y realces— dentro del token `destacado`. El
recoloreo alcanza a la baldosa, al travesaño y al wordmark; la bajada
"SOLUCIONES INNOVADORAS" de los dos lockups es la excepción y queda como
desviación registrada. Barrido de los hex de marca con
`grep -n "#" public/favicon.svg src/assets/images/agas-lockup.svg src/assets/images/agas-lockup-blanco.svg`.

`#C8813F` sobre la baldosa `#24455C` da 3.20:1 (mismo comando de arriba con
`'#c8813f' '#24455c'`), por debajo del 4.5:1 que AA pide para texto y apenas
por encima del 3:1 que pide para objetos gráficos. Se acepta explícitamente:
el travesaño es un elemento gráfico dentro del logotipo, no texto. `#C8813F`
**no es un token de `@theme`**: existe solo en los assets de marca (los SVG y
el script de generación), que son la excepción de siempre a la invariante de
color literal.

**El hero deja de llevar color literal.** Los dos resplandores radiales de
`src/pages/index.astro` estaban escritos como `rgba()` decimal con los
valores de la paleta petróleo; sobrevivieron al recoloreo y viajaban a
`dist/` porque ningún grep de hex los veía. Pasan a
`color-mix(in srgb, var(--color-acento) 35%, transparent)` y
`color-mix(in srgb, var(--color-destacado) 12%, transparent)`. El sitio queda
sin ningún color literal fuera de `global.css` y de los assets:

```sh
grep -rnE "rgba?\(|hsla?\(|#[0-9a-fA-F]{3,8}\b" src/ \
  --include="*.astro" --include="*.tsx" --include="*.ts" --include="*.css" \
  | grep -v "src/styles/global.css" | wc -l
```

→ `0`.

**La constelación deja de solaparse con su leyenda.** La rejilla de
`ConstelacionMarca.astro` está rotada 45°, así que su caja de layout es
menor que su huella visual y la leyenda de abajo se le montaba encima. Se
compensa con margen vertical explícito
(`grep -n "my-\[3.1rem\]" src/components/ConstelacionMarca.astro`). La
regresión queda cubierta por `e2e/constelacion.spec.ts`, que mide el área de
intersección entre la leyenda y cada una de las cuatro baldosas y exige `0`
en los dos projects de Playwright, desktop y mobile. El spec falló contra el
bug real antes del fix, con una intersección del orden de 2.500 px²;
reproducible quitando las clases de margen de esa línea y corriendo
`npx playwright test e2e/constelacion.spec.ts`.

**Assets de marca por script, no a mano.** `scripts/generar-marca-ml.mjs`
(sharp) genera los tres assets de Mercado Libre y regenera los rasters del
sitio:

```sh
node scripts/generar-marca-ml.mjs
```

que imprime las dimensiones de cada salida: `marca/mercadolibre/logo.png`
1000×1000, `banner-escritorio.png` 3840×200, `banner-movil.png` 1440×320,
`public/apple-touch-icon.png` 180×180, `public/logo.png` y
`src/assets/images/logo.png` 512×512. Las salidas son deterministas: correr
el script dos veces deja los seis archivos byte a byte iguales
(`md5sum marca/mercadolibre/*.png public/logo.png public/apple-touch-icon.png src/assets/images/logo.png > /tmp/antes.txt && node scripts/generar-marca-ml.mjs && md5sum -c /tmp/antes.txt`).

Los textos de los banners no están en el script: salen de
`src/data/site.json` (`hero.chip` y `envio`), que son datos de negocio.

El renderizado de texto de sharp depende de las fuentes que encuentre el
sistema, y un fallback silencioso a serif produciría un banner que parece
correcto y no lo es. Por eso el script instala un `fonts.conf` propio
apuntando a `marca/fuentes/` y, antes de generar nada, renderiza "AGAS" con
Sora y con serif y aborta si los dos buffers son idénticos. `marca/fuentes/`
lleva `Sora-SemiBold.ttf` e `Inter-Regular.ttf` convertidos desde
`node_modules/@fontsource/{sora,inter}`, con sus licencias SIL OFL 1.1 al
lado (`OFL-Sora.txt`, `OFL-Inter.txt`).

### Decisiones del dueño del sitio (2026-08-06)

1. Elige «Acero y cobre» entre las cinco direcciones de la maqueta. Rechaza
   mantener petróleo/menta porque el verde le da un aire genérico.
2. Pide unificar los travesaños de la marca en cobre, al notar que unos
   assets los llevaban en arena y otros en cobre.
3. Acepta el 3.20:1 de `#C8813F` sobre la baldosa `#24455C` por tratarse de
   un elemento gráfico del logotipo y no de texto.
4. Aprueba las maquetas de los assets de Mercado Libre antes de generarlos.

### Desviación registrada, pendiente de revisión

La bajada "SOLUCIONES INNOVADORAS" de los lockups no se recoloreó con el
resto de la marca y quedó con los grises azulverdosos de la etapa petróleo,
además con tres valores distintos para el mismo elemento según dónde se
dibuje:

| Superficie | Hex | Dónde | Contraste |
| :--- | :--- | :--- | :--- |
| Lockup sobre claro (header) | `#4E5E63` | `src/assets/images/agas-lockup.svg` | 6.11:1 sobre `fondo` |
| Lockup sobre oscuro (footer) | `#9BB6BC` | `src/assets/images/agas-lockup-blanco.svg` | 6.42:1 sobre `primario-oscuro` |
| Banners de Mercado Libre | `#B9C9CF` | `arenaTexto` en `scripts/generar-marca-ml.mjs` | 5.92:1 sobre `primario` |

`grep -rn "4E5E63\|9BB6BC\|B9C9CF" src/ scripts/` los lista los tres. Los
tres cumplen AA como texto, así que no hay un problema de accesibilidad; lo
que hay es una divergencia de identidad: el nombre de la constante del
script, `arenaTexto`, dice arena y el valor es un gris frío, señal de que
ninguno de los tres se derivó de la paleta nueva. Queda registrado como
desviación y no como decisión aprobada: la decisión del dueño del 2026-08-06
fue sobre el travesaño, y la bajada nunca entró en su alcance. La vía de
arreglo, cuando se revise, es unificar los tres en un valor derivado de la
paleta vigente y decidir de una vez si merece token.

### Afirmaciones del ADR 0003 que dejan de valer

De la **Decisión** del ADR 0003:

1. «Se adopta la identidad "serena e innovadora": petróleo profundo como
   primario, cian como acento, menta como destacado, sobre fondo casi
   neutro» (párrafo de apertura de la Decisión). La identidad "serena e
   innovadora" sigue en pie como dirección; sus tres colores no. El puente
   token a token está en la tabla de arriba.
2. La misma sección remite a `git show 400df19:src/styles/global.css` para
   "los anteriores". Hoy el estado anterior inmediato es
   `git show a749d42:src/styles/global.css`; `400df19` es el azul/naranja
   original, dos paletas atrás.

De las **Consecuencias** del ADR 0003:

3. «El menta (`destacado`, `#7fe8c3`) es un color de texto sobre fondo
   oscuro. Sobre fondo claro no alcanza contraste AA como texto, así que
   esos pares usan `destacado-oscuro` (`#0b6b4f`)». Los hex ya no existen:
   `destacado` es `#e9c49a` y `destacado-oscuro` es `#7a5220`. La **regla**
   sobrevive intacta —`destacado` sobre claro sigue sin llegar a AA y esos
   pares siguen usando `destacado-oscuro`— y por eso el barrido de
   `text-destacado` que hizo el ADR 0003 no se rehace.
4. «Quedan pendientes de regenerar con la paleta nueva todos los rasters de
   marca […] Hasta que se regeneren, esos archivos conservan la identidad
   anterior y el sitio convive con dos paletas en sus rasters». El pendiente
   queda cerrado: los seis rasters salen hoy de
   `node scripts/generar-marca-ml.mjs` en «Acero y cobre».
5. «`marca/mercadolibre/README.md` describe esos PNG en la paleta vieja y
   sigue siendo exacto por eso mismo». Deja de ser exacto y se reescribe al
   estado vigente en este mismo cambio. Su tabla de medidas no cambia: los
   tamaños de los tres assets son los mismos.
6. La **desviación registrada** del glifo del gamepad (`primario-claro`,
   citado como `#dce9e7`) sigue vigente como desviación, con el hex
   actualizado a `#dce6ed`
   (`grep -n "text-primario-claro" src/components/ConstelacionMarca.astro`).
   Este cambio no la re-litiga: el glifo sigue usando el token y la vía para
   el tono de la maqueta sigue siendo agregarlo como token.

Sigue vigente todo lo demás del ADR 0003: la tipografía Sora 600/700 con
Inter de cuerpo, la firma "baldosa AGAS" (`rx="24"`, `rounded-[26%]`), la
estructura del hero anclado en la marca con `ConstelacionMarca` y los datos
de `site.hero`, los glifos de categoría, las decisiones del dueño del sitio
de esa fecha (identidad no producto-céntrica, sin alusiones a la expansión,
"Desde Santiago a todo Chile", contacto de ventas por volumen) y la
consecuencia de que retematizar sigue siendo editar `@theme`. Por eso la
anulación es parcial.

## Consecuencias

- La paleta queda **duplicada**: los mismos hex viven en el bloque `@theme`
  de `src/styles/global.css` y en la constante `PALETA` de
  `scripts/generar-marca-ml.mjs`
  (`grep -n "24455C\|9E5220\|16303F" scripts/generar-marca-ml.mjs`). Es
  deliberado —el script corre fuera de Astro y no puede leer los tokens de
  Tailwind— y es el punto de desincronización a vigilar: un cambio de paleta
  futuro tiene que tocar los dos lugares y volver a correr el script.
- `#C8813F` vive fuera de `@theme` **a propósito**: es un color de asset,
  aprobado con su 3.20:1 por ser gráfico, y darle token invitaría a usarlo
  como color de UI, que es justo lo que no debe pasar.
- Los grises de la bajada del lockup (`#4E5E63`, `#9BB6BC`, `#B9C9CF`)
  también están fuera de `@theme`, pero eso **no** es una decisión: es la
  desviación registrada más arriba, y su falta de token es parte de lo que
  hay que resolver cuando se revise.
- **Lección de barrido, ya aplicada:** un barrido de color que enumera una
  sola notación deja fuera lo que está escrito en otra. Pasó dos veces en
  este mismo trabajo: la paleta anterior sobrevivió en `rgba()` decimal
  dentro de un atributo `style` y llegó a `dist/`, y el chequeo de contraste
  por pares de tokens no veía las utilidades con alfa, que son texto real y
  hay que componer. De aquí en adelante, el barrido de color cubre hex **y**
  notación decimal `rgb`/`rgba`/`hsl`, y el de contraste cubre pares de
  tokens **y** utilidades con opacidad, con los greps y el compositor que
  quedaron documentados más arriba.
- Los rasters de marca dejan de ser artesanales: cualquier cambio de
  identidad futuro es editar la paleta del script y volver a correrlo, no
  reabrir un editor de imágenes. La contracara es una dependencia nueva del
  entorno: sharp con librsvg/pango y los dos TTF versionados en el repo.
- `marca/` sigue fuera del build —Astro solo publica `src/` y `public/`—, así
  que las fuentes TTF y los banners no pesan en `dist/` ni en el deploy. Los
  tres rasters que sí llegan al sitio (`public/logo.png`,
  `public/apple-touch-icon.png`, `src/assets/images/logo.png`) los produce el
  mismo script.
- `public/apple-touch-icon.png` deja de derivarse de `public/logo.png`: hoy
  cada raster se rasteriza directo del SVG del isotipo a su tamaño, así que
  el de 180 px ya no arrastra el remuestreo del de 512.
- Los ADR 0001 y 0002 tratan de promociones y el ADR 0004 del alcance de la
  burbuja de Mercado Libre: ninguno afirma nada sobre paleta ni sobre assets
  de marca, y este cambio no los anula: lo que el ADR 0004 decidió sobre el
  alcance de la burbuja sigue en pie.
- `docs/analisis-performance-2026-08-03.md` sigue siendo un análisis fechado
  y no se actualiza; sus cifras de tipografía ya habían dejado de describir
  el bundle vigente desde el ADR 0003.
