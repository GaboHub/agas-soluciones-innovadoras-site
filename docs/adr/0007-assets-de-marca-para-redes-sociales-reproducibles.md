# 0007. Assets de marca para redes sociales reproducibles por script

## Estado

Aceptada, 2026-08-14. Anula parcialmente al
[ADR 0005](0005-paleta-acero-y-cobre-y-assets-de-marca-reproducibles.md).

## Contexto

El ADR 0005 dejó la identidad «Acero y cobre» aplicada al sitio y a los tres
assets de Mercado Libre, todos generados por script. Las redes sociales
quedaban fuera: no había avatar de marca ni pieza de presentación, y la única
vía disponible era volver a lo que ese mismo ADR había cerrado —abrir un editor
de imágenes y producir los PNG a mano una vez.

El encargo es doble: una foto de perfil para Instagram y el resto de las redes,
y un carrusel de presentación de la tienda. Las dos piezas repiten textos y
cifras que ya son dato de negocio en `src/data/site.json`, así que transcribirlos
al script los habría duplicado en un lugar donde nadie los ve envejecer.

El diseño se acordó sobre una maqueta contractual aprobada por el dueño del
sitio el 2026-08-13
(https://claude.ai/code/artifact/7b404708-0b28-47e8-ba88-34f3c812fe9b): la
maqueta fija la composición, la jerarquía tipográfica y el reparto de las seis
láminas, y el script la reproduce en PNG. Es el mismo procedimiento que el ADR
0005 registró para los banners de Mercado Libre —maqueta aprobada primero,
generación después—, no una decisión nueva.

## Decisión

**Los assets de redes también son rasters generados, nunca editados a mano.**
`scripts/generar-marca-redes.mjs` (sharp, mismo patrón que
`scripts/generar-marca-ml.mjs`) produce los siete PNG de `marca/redes/`:

```sh
node scripts/generar-marca-redes.mjs
```

que imprime las dimensiones de cada salida: `marca/redes/avatar.png`
1080×1080 y `carrusel-presentacion-1.png` … `carrusel-presentacion-6.png`
1080×1350 cada una. Las salidas son deterministas: correr el script dos veces
deja los siete archivos byte a byte iguales

```sh
md5sum marca/redes/*.png > /tmp/antes.txt && node scripts/generar-marca-redes.mjs && md5sum -c /tmp/antes.txt
```

**Los textos y las cifras salen de `src/data/site.json`, no del script.** El
título, la palabra acentuada, el chip y la bajada del hero, los sellos de
confianza, la localidad, el dominio y el nombre, el resumen y el conteo de
productos de cada categoría se leen en runtime. Los conteos por categoría son
`categorias[i].productos.length`:

```sh
node -e "require('./src/data/site.json').categorias.forEach(c => console.log(c.slug, c.productos.length))"
```

→ al 2026-08-14, `nintendo-switch 14`, `playstation-5 7`, `audio 2`. **Son
cifras perecederas y quedan horneadas en el PNG**: un refresco del catálogo las
mueve y los assets publicados pasan a mentir hasta que se regeneren (ver
Consecuencias).

**El carrusel se renderiza como una tira continua y se rebana.** Las seis
láminas no se dibujan por separado: el script arma un solo SVG de 6480×1350 —
`ANCHO_LAMINA * NUMERO_LAMINAS` — y lo corta en seis con `sharp().extract()`
(`grep -n "ANCHO_TIRA\|extract(" scripts/generar-marca-redes.mjs`). El motivo
es la continuidad visual: las baldosas decorativas de la constelación cruzan
los cortes entre láminas, de modo que al deslizar el carrusel la decoración se
lee como una sola pieza que continúa de una imagen a la siguiente. Dibujando
lámina por lámina habría que calcular a mano los dos fragmentos de cada baldosa
que cae en un borde, y cualquier reordenamiento posterior rompería el calce; con
la tira, la geometría es una sola y el corte es aritmético. El fondo sí se pinta
por lámina, con un `clipPath` por rebanada, para que el degradado y el
resplandor arranquen de nuevo en cada imagen en vez de estirarse a lo largo de
los 6480 px.

**El avatar no usa la baldosa del logo.** Instagram y el resto de las redes
recortan la foto de perfil en círculo, y ese recorte se come exactamente las
esquinas redondeadas `rounded-[26%]` que son la firma AGAS (ADR 0003). Un
avatar con la baldosa se vería como un monograma sobre un cuadrado al que le
faltan las esquinas: la firma no se lee y encima se pierde. Así que el avatar
descarta la baldosa y lleva el monograma directo sobre el degradado acero de
170° con el resplandor cobre, la misma superficie que los banners, con el
travesaño en cobre claro `#C8813F` de la regla todo-cobre del ADR 0005. El
monograma se dimensiona para caer entero dentro del círculo inscrito en el
lienzo de 1080×1080, con holgura:

```sh
node -e "
const sharp=require('sharp');
(async()=>{
  const {data,info}=await sharp('marca/redes/avatar.png').raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c}=info, cx=(w-1)/2, cy=(h-1)/2;
  let r=0;
  for(let i=0;i<w*h;i++){
    if(0.2126*data[i*c]+0.7152*data[i*c+1]+0.0722*data[i*c+2]>140){
      const d=Math.hypot(i%w-cx,((i/w)|0)-cy); if(d>r) r=d;
    }
  }
  console.log('radio del monograma:', Math.round(r), '| radio inscrito:', w/2);
})()"
```

→ `radio del monograma: 411 | radio inscrito: 540`. El umbral de luminancia
`140` separa el monograma —blanco y cobre claro— del degradado acero de atrás;
la cifra depende de ese umbral y por eso va con él.

**Los anchos de texto se miden escaneando el canal alfa, no con `trim()`.** El
script necesita medir cuánto ocupa un texto renderizado para partirlo en líneas
y para dimensionar las pastillas. `anchoVisible()` rasteriza a raw y busca la
columna más a la derecha con alfa por encima de 10
(`grep -n "anchoVisible" scripts/generar-marca-redes.mjs`).

La vía obvia —`sharp(buffer).trim().metadata()`, que es la que usa
`generar-marca-ml.mjs`— **no mide lo que parece medir**. `trim()` funciona: lo
que no funciona es leerlo con `.metadata()`. El resultado medido es que
`.metadata()` sobre un pipeline con `trim()` pendiente devuelve el ancho del
lienzo, y solo materializando el pipeline con `toBuffer()` aparece el ancho de
la tinta:

```sh
node -e "
const sharp=require('sharp');
const svg='<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"120\"><text x=\"10\" y=\"90\" font-size=\"72\" fill=\"#000\">AGAS</text></svg>';
(async()=>{
  const buf=await sharp(Buffer.from(svg)).png().toBuffer();
  console.log('trim().metadata() ->', (await sharp(buf).trim().metadata()).width);
  console.log('trim().toBuffer() ->', (await sharp(await sharp(buf).trim().png().toBuffer()).metadata()).width);
})()"
```

→ `trim().metadata() -> 400` y `trim().toBuffer() -> 191`, con sharp
`0.35.3` (`node -p "require('./node_modules/sharp/package.json').version"`).
El escaneo de alfa evita el problema de raíz porque no depende de que el
pipeline se haya materializado.

**Guardas que abortan con exit 1**, en vez de producir un asset que parece
correcto y no lo es (misma filosofía que la guarda de fuente del ADR 0005,
ampliada):

| Guarda | Qué atrapa |
| :--- | :--- |
| Sora ≠ serif y Sora bold ≠ semibold, por render | Fallback tipográfico silencioso |
| Ancho cero del render de prueba | Motor de texto que no dibuja nada |
| Exactamente 3 categorías | El layout de 6 láminas asume 3; una cuarta rompería el reparto |
| Primera oración de `hero.bajada` extraíble | Bajada sin punto, o cuyo primer punto es una abreviatura |
| Pastillas dentro de la caja de contenido de 888 px | Chip o CTA que se sale del margen |
| Palabra sola más ancha que el máximo | Texto que no se puede partir en líneas |
| Dimensiones exactas de los 7 PNG | Rebanado o lienzo mal calculado |
| Peso < 10 MB por archivo | Límite de subida de las plataformas |

La guarda de bold es la que motiva la fuente nueva: los titulares del carrusel
usan Sora 700 y `marca/fuentes/` solo tenía la SemiBold. Se agrega
`marca/fuentes/Sora-Bold.ttf`, convertida con fontTools desde
`node_modules/@fontsource/sora/files/sora-latin-700-normal.woff`, bajo la misma
licencia SIL OFL 1.1 ya presente en `marca/fuentes/OFL-Sora.txt`. En fontconfig
las dos no se nombran igual: la SemiBold declara la familia `Sora SemiBold` y la
Bold resuelve como familia `Sora` con `font-weight` 700. El script no lo asume:
`detectarFamiliaBold()` prueba las dos formas y se queda con la que produce un
render distinto de serif y de la SemiBold, y aborta si ninguna lo hace. La
corrida imprime cuál eligió (`Fuente bold detectada: {"family":"Sora","weight":"700"}`).

### Decisiones del dueño del sitio (2026-08-13)

1. Aprueba la maqueta contractual del avatar y del carrusel de seis láminas
   (https://claude.ai/code/artifact/7b404708-0b28-47e8-ba88-34f3c812fe9b)
   antes de generar los assets, igual que hizo con los de Mercado Libre.
2. El carrusel se publica como pieza de presentación de la tienda, con las
   láminas en orden 1→6.

### Afirmaciones del ADR 0005 que dejan de valer

Las dos son pérdidas de exhaustividad, no errores: lo que el ADR 0005 afirmó
sobre `generar-marca-ml.mjs` sigue siendo cierto de sus seis rasters. Lo que
dejó de valer es que esos seis fueran todos.

1. De la sección **Assets de marca por script, no a mano**: «`marca/fuentes/`
   lleva `Sora-SemiBold.ttf` e `Inter-Regular.ttf` convertidos desde
   `node_modules/@fontsource/{sora,inter}`»
   (`grep -n "Sora-SemiBold" docs/adr/0005-*.md`). Hoy son tres TTF: se suma
   `Sora-Bold.ttf`, convertida del mismo modo desde el `.woff` de peso 700 de
   `@fontsource/sora`. El puente:
   `ls marca/fuentes/*.ttf | wc -l` → `2` en `v1.1.0`
   (`git ls-tree --name-only v1.1.0 marca/fuentes/ | grep -c ttf`), `3` hoy. Las
   licencias no cambian: la Bold cae bajo la misma `OFL-Sora.txt` que ya estaba.
2. De las **Afirmaciones del ADR 0003 que dejan de valer**, punto 4: «El
   pendiente queda cerrado: los seis rasters salen hoy de
   `node scripts/generar-marca-ml.mjs`», y de la sección **Assets de marca por
   script, no a mano** la nota de determinismo, «correr el script dos veces deja
   los seis archivos byte a byte iguales».
   `generar-marca-ml.mjs` deja de ser el único generador de rasters de marca del
   repo, y «seis» deja de ser el total. El puente: 6 rasters de marca en
   `v1.1.0`, 13 hoy —los mismos 6 más los 7 de `marca/redes/`—, repartidos en
   dos scripts que se corren por separado:

   ```sh
   ls marca/mercadolibre/*.png public/logo.png public/apple-touch-icon.png src/assets/images/logo.png | wc -l
   ls marca/redes/*.png | wc -l
   ```

   → `6` y `7`. La afirmación del ADR 0005 sobre determinismo y guardas de
   `generar-marca-ml.mjs` sigue valiendo tal cual para sus seis salidas; el
   script de redes tiene las suyas, verificadas con su propio `md5sum -c`.

El ADR 0006 restata la enumeración al listar lo que sigue vigente del 0005
(«la generación de los seis rasters por script con su guarda de fuente y sus
salidas deterministas», `grep -n "seis rasters" docs/adr/*.md`). Esa frase
queda alcanzada por el punto 2 de arriba con el mismo puente, y el ADR 0006 no
se toca: su decisión —la bajada derivada de los tokens— no la afecta este
cambio, porque ninguno de los siete assets de redes dibuja la bajada
(`grep -c "SOLUCIONES INNOVADORAS" scripts/generar-marca-redes.mjs` → `0`).

Sigue vigente todo lo demás del ADR 0005: la paleta «Acero y cobre» y su tabla
token a token, los travesaños todo cobre con el `#C8813F` y su 3.20:1 aceptado
por ser elemento gráfico, la duplicación deliberada de `PALETA` fuera de
`@theme`, el hero sin colores literales, la constelación con su margen y su
spec e2e, las utilidades con opacidad bajo AA desde `v1.0.0` y la lección de
barrido de color. Por eso la anulación es parcial.

## Consecuencias

- **Los conteos por categoría quedan horneados en píxeles.** Es la primera vez
  que un dato del catálogo viaja dentro de un raster de marca: los banners de
  Mercado Libre solo llevaban chip y línea de envío, que no cambian con el
  barrido. Un refresco del catálogo que mueva `productos.length` de cualquier
  categoría deja las láminas 3, 4 y 5 desactualizadas sin que nada avise, porque
  el asset publicado vive en Instagram y no en el repo. La regla que queda: tras
  un `npm run generar` que cambie los conteos, hay que volver a correr
  `node scripts/generar-marca-redes.mjs` y **republicar** el carrusel; regenerar
  sin republicar no arregla nada. Ninguna suite lo atrapa: `marca/` está fuera
  del build y fuera de los tests.
- La guarda de exactamente 3 categorías es una **atadura de layout, no de
  datos**. Si el catálogo suma una cuarta categoría, el script aborta en vez de
  producir un carrusel mudo sobre ella; el arreglo es rediseñar el reparto de
  láminas, y por eso la guarda dice qué asume y no solo que falló.
- La deuda de `generar-marca-ml.mjs` queda registrada y **no se toca aquí**: ese
  script sigue midiendo con `sharp(buffer).trim().metadata()` en dos lugares
  (`grep -n "trim()" scripts/generar-marca-ml.mjs` → líneas 93 y 110), así que
  su `medirAnchoTexto` devuelve el ancho del lienzo
  (`fontSize * texto.length + fontSize * 4`) en vez del ancho de la tinta, y su
  guarda de ancho cero lee ese mismo lienzo y **no puede fallar nunca**. Lo
  segundo es lo grave: es una guarda vacua, que da la señal de "el motor de
  texto dibujó algo" sin haberlo comprobado. Lo primero es un sesgo
  conservador —el ancho inflado achica `escalaChip` y `escalaEnvio`, así que el
  texto sale más chico de lo que podría—, no un defecto visible: los banners
  vigentes se aprobaron mirándolos. No se afirma aquí que estén mal; se afirma
  que la medición no mide lo que su nombre dice y que la guarda no guarda. El
  arreglo, cuando se haga, es materializar el pipeline (`toBuffer()`) o pasar al
  escaneo de alfa de este script, no dejar de usar `trim()`.
- La duplicación de paleta que el ADR 0005 registró para `PALETA` se extiende a
  un script más: `scripts/generar-marca-redes.mjs` tiene su propia constante con
  los mismos hex (`grep -n "24455C\|9E5220\|C8813F" scripts/generar-marca-redes.mjs`).
  Un cambio de paleta futuro ahora toca tres lugares —`@theme` y los dos
  scripts— y exige correr los dos generadores.
- Dentro del propio script hay una duplicación menor del mismo tipo: los stops
  del degradado de 170° están calculados en `svgDefsFondoRedes()` y escritos
  literales (`41.32%`, `0.76%`, `58.68%`, `99.24%`) en `svgAvatar()`. Es
  deliberado —el avatar usa un `viewBox` propio de 96 unidades para compartir la
  geometría del isotipo— y es el punto a vigilar si el ángulo cambia.
- `marca/` sigue fuera del build: los siete PNG nuevos y el TTF nuevo no pesan
  en `dist/` ni en el deploy, igual que los de Mercado Libre. El invariante de
  `AGENTS.md` se amplía para nombrar los dos generadores.
- El carrusel depende del orden de publicación: las láminas están numeradas y la
  barra de progreso del pie marca la posición, así que publicarlas desordenadas
  se nota. Queda escrito en `marca/redes/README.md`.
- Los ADR 0001, 0002 y 0004 tratan de promociones y del alcance de la burbuja de
  Mercado Libre: ninguno afirma nada sobre assets de marca y este cambio no los
  toca.
