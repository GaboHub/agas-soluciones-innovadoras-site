# Assets de marca para redes sociales

Imágenes listas para subir a las redes sociales de la tienda, generadas a partir
del logo y de la paleta «Acero y cobre» del sitio: acero `#24455C` y `#16303F`
(degradado de fondo, a 170°), cobre `#9E5220` (resplandor y travesaño de la
baldosa de la constelación), cobre claro `#C8813F` (travesaño del monograma,
palabra acentuada del título, barra de progreso y las marcas de los sellos),
acero claro `#DCE6ED` (texto de apoyo) y arena `#E9C49A` (los eyebrows), con
Sora para los titulares e Inter para el texto de apoyo. Cada uso se ubica con
`grep -n "PALETA\." scripts/generar-marca-redes.mjs`.

| Archivo | Uso | Tamaño |
| :--- | :--- | :--- |
| `avatar.png` | Foto de perfil de Instagram y del resto de las redes | 1080×1080 px |
| `carrusel-presentacion-1.png` … `-6.png` | Post de presentación de la tienda, en carrusel | 1080×1350 px c/u |

El avatar no lleva la baldosa redondeada del logo: las redes recortan la foto de
perfil en círculo y ese recorte se comería justo las esquinas `rounded-[26%]`
que son la firma AGAS, así que va el monograma solo sobre el degradado, medido
para caer entero dentro del círculo.

**Las seis láminas del carrusel se publican en orden, de la 1 a la 6.** No son
intercambiables: cuentan una secuencia (marca → quiénes somos → las tres
categorías → compra segura), la barra de progreso del pie marca la posición de
cada una, y las baldosas decorativas cruzan los cortes entre láminas para que la
decoración se lea continua al deslizar. Publicadas en otro orden, se nota.

## Cómo se regeneran

```sh
node scripts/generar-marca-redes.mjs
```

El script vuelve a producir los siete archivos de esta carpeta e imprime las
dimensiones de cada salida al terminar; verifica además que ninguno pase de
10 MB y aborta si alguna dimensión no da. No se editan a mano: un cambio de
paleta se hace en el script, y un cambio de textos o de cifras en
`src/data/site.json` —de donde salen el título y la bajada del hero, el chip,
los sellos de confianza, la localidad, el dominio y el nombre, el resumen y el
conteo de productos de cada categoría— y se vuelve a correr. Las salidas son
deterministas, así que una corrida sin cambios de entrada deja los archivos
idénticos:

```sh
md5sum marca/redes/*.png > /tmp/antes.txt && node scripts/generar-marca-redes.mjs && md5sum -c /tmp/antes.txt
```

**Los conteos de productos quedan horneados en las láminas 3, 4 y 5.** Son dato
perecedero: al 2026-08-14 son 14 en Nintendo Switch, 7 en PlayStation 5 y 2 en
Audio, recontables con

```sh
node -e "require('./src/data/site.json').categorias.forEach(c => console.log(c.slug, c.productos.length))"
```

Después de un refresco del catálogo (`npm run generar`) que mueva esas cifras,
hay que regenerar estos assets **y volver a publicarlos**: el que está subido a
la red social no se actualiza solo, y ninguna suite del repo lo revisa.

Necesita las fuentes convertidas de `marca/fuentes/` —`Sora-SemiBold.ttf`,
`Sora-Bold.ttf` e `Inter-Regular.ttf`—; sin ellas el script aborta en vez de
caer a una tipografía de sistema. También aborta si el catálogo deja de tener
exactamente 3 categorías, porque el reparto de las seis láminas lo asume.

Esta carpeta NO forma parte del build del sitio: Astro solo publica `src/` y
`public/`, así que nada de `marca/` llega a `dist/` ni al deploy.

Contexto y decisiones en
`docs/adr/0007-assets-de-marca-para-redes-sociales-reproducibles.md`, y la
identidad de la que salen los colores en
`docs/adr/0005-paleta-acero-y-cobre-y-assets-de-marca-reproducibles.md`.
