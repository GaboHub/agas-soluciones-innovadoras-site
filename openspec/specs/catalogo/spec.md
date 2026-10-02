# catalogo Specification

## Purpose
Generar fichas, imágenes y reseñas del catálogo desde el barrido de Mercado Libre.

## Requirements

### Requirement: Entrada desde el barrido
El generador del catálogo SHALL leer el barrido de `$AGAS_CONTEXT_DIR` (default `../agas-context` relativo a la raíz) en solo lectura y MUST terminar con código distinto de 0, sin tocar ninguna salida, si falta `publicaciones/` o `empresa.md`.

#### Scenario: Barrido ausente
- **WHEN** el directorio del barrido no tiene `publicaciones/`
- **THEN** el proceso termina con código 1 y `content/productos/` queda intacto

#### Scenario: Directorio configurable
- **WHEN** `AGAS_CONTEXT_DIR=/x`
- **THEN** el generador lee `/x`

### Requirement: Regeneración total e idempotente
El generador SHALL borrar y recrear `content/productos/` y `src/assets/images/productos/` y sobrescribir `src/data/resenas.json`; MUST NOT escribir ningún otro archivo del repo ni el directorio del barrido.

#### Scenario: Ficha huérfana
- **WHEN** existe `content/productos/huerfano.md` y el barrido no lo produce
- **THEN** tras la corrida el archivo no existe

#### Scenario: Dos corridas iguales
- **WHEN** corre dos veces sobre el mismo barrido
- **THEN** las salidas son idénticas byte a byte

#### Scenario: Archivos curados intactos
- **WHEN** corre
- **THEN** `content/guias/`, `content/paginas/`, `public/`, los JSON de `src/data/` distintos de `resenas.json` y el barrido no cambian

### Requirement: Solo publicaciones activas
El generador SHALL descartar publicaciones sueltas y miembros de familia con `Estado` distinto de `active` antes de detectar duplicados y de armar familias, avisando cada descarte; una familia sin miembros activos MUST omitirse con aviso.

#### Scenario: Gemela de catálogo cerrada
- **WHEN** una publicación de catálogo `closed` y una activa comparten `user_product_id`
- **THEN** la ficha apunta al permalink de la activa

#### Scenario: Miembro pausado
- **WHEN** un miembro de familia está `paused`
- **THEN** no aparece en `miembros` ni en `grupos`

### Requirement: Duplicados de catálogo
Entre publicaciones sueltas activas con el mismo `user_product_id` donde al menos una es de catálogo, el generador SHALL descartar las que no son de catálogo sin generarles ficha ni aviso de mapeo faltante.

#### Scenario: Par catálogo y no catálogo
- **WHEN** A (catálogo) y B (no catálogo) comparten `user_product_id`
- **THEN** solo A genera ficha y B no produce aviso «Carpeta sin mapeo explícito»

#### Scenario: Ninguna de catálogo
- **WHEN** dos publicaciones comparten `user_product_id` y ninguna es de catálogo
- **THEN** ambas se procesan

### Requirement: Mapeo de carpetas a fichas
El generador SHALL asignar slug y título según la entrada de `SLUG_MAP` cuyo `prefijo` es prefijo del nombre de la carpeta (la primera carpeta activa que calce); un prefijo sin carpeta MUST avisarse y omitirse, y una carpeta activa sin entrada SHALL recibir slug `slugificar(título)` (sufijo `-2` ante colisión) y aviso.

#### Scenario: Prefijo sin carpeta
- **WHEN** `SLUG_MAP` tiene el prefijo `MLC9` y ninguna carpeta lo calza
- **THEN** se avisa «No se encontró carpeta para el prefijo MLC9» y no se genera ficha

#### Scenario: Carpeta sin mapeo
- **WHEN** aparece una carpeta activa «Funda X» sin entrada en `SLUG_MAP`
- **THEN** se genera la ficha `funda-x` y se avisa «Carpeta sin mapeo explícito»

### Requirement: Categoría por reglas
El generador SHALL asignar la categoría de la primera regla de `REGLAS_CATEGORIA` que calce el título, en orden audio, playstation-5, nintendo-switch, y `otros` con aviso si ninguna calza.

#### Scenario: Audio antes que consola
- **WHEN** el título es «Audífonos para control PS5»
- **THEN** la categoría es `audio`

#### Scenario: Sin regla
- **WHEN** el título es «Lámpara»
- **THEN** la categoría es `otros` y se avisa

### Requirement: Tipo de ficha
El generador SHALL marcar `familia` toda carpeta cuyo `publicacion.md` empieza con `# Familia:`, `variantes` una publicación suelta con tabla de Variantes, y `simple` el resto.

#### Scenario: Suelta con variantes
- **WHEN** una publicación suelta trae la sección `### Variantes`
- **THEN** su ficha tiene `tipo: variantes`

### Requirement: Variantes con deep-link
Por cada fila de la tabla de Variantes el generador SHALL emitir `nombre` (valores de atributos unidos por « / »), `atributo` (claves unidas por « / »), `link` = `<permalink>?variation=<id>` con el id del sufijo de la carpeta de imágenes (sin id, el permalink) e imágenes propias; las `imagenes` de la ficha SHALL ser la concatenación de las de sus variantes.

#### Scenario: Variante con id
- **WHEN** la fila es `Color: Rojo` con carpeta `variante-rojo-123/imagenes/`
- **THEN** la variante es `{nombre: "Rojo", atributo: "Color", link: "<permalink>?variation=123"}`

### Requirement: Familia agrupada por diseño
Para entradas de `SLUG_MAP` con `agruparPorDiseno`, el generador SHALL tomar el sufijo del título de cada miembro tras el título crudo de la familia, con la última palabra como color y el resto como diseño sin el sufijo «grip» o «grips»; un sufijo de una sola palabra que es color conocido SHALL dar diseño igual al color; los grupos SHALL ir en orden de aparición, `etiquetaGrupo`/`etiquetaOpcion` SHALL emitirse solo si la entrada declara `etiquetas`, y la ficha MUST NOT llevar `reviews`.

#### Scenario: Diseño y color
- **WHEN** un miembro se titula «<familia> Blanco Grip Gris»
- **THEN** pertenece al grupo `Blanco` con color `Gris`

#### Scenario: Etiquetas declaradas
- **WHEN** la entrada declara `etiquetas: {grupo: "Funda", opcion: "Grips"}`
- **THEN** el frontmatter trae `etiquetaGrupo: Funda` y `etiquetaOpcion: Grips`, y sin la declaración no trae ninguna de las dos

### Requirement: Familia genérica con color por miembro
Para familias sin `agruparPorDiseno`, el generador SHALL emitir un miembro por miembro activo con título, link, precio propio, imágenes y `atributos.color` igual a `coloresMiembros[itemId]` si la entrada lo declara, o si no la última palabra del sufijo del título (y `atributos.diseno` el resto).

#### Scenario: Color declarado
- **WHEN** la entrada declara `coloresMiembros: {MLC1: "Transparente"}` y el título de MLC1 no termina en un color
- **THEN** el miembro MLC1 tiene `atributos.color: Transparente`

Rationale: hay familias cuyos títulos de miembro no terminan en un color reconocible.

### Requirement: Reseñas de familia deduplicadas por firma
El generador SHALL agregar las reseñas de los miembros no de catálogo de una familia genérica sumando cada bloque una sola vez por firma (promedio, cantidad, distribución y comentarios): cantidad y distribución sumadas, promedio ponderado a 1 decimal y comentarios concatenados.

#### Scenario: Bloque replicado
- **WHEN** dos miembros traen el mismo bloque 5.0★ con 1 reseña
- **THEN** la ficha tiene `reviews.cantidad: 1`

#### Scenario: Bloques distintos
- **WHEN** un miembro trae 5★ con 1 reseña y otro 4★ con 1 reseña
- **THEN** la ficha tiene `cantidad: 2` y `promedio: 4.5`

#### Scenario: Miembro de catálogo
- **WHEN** el miembro es publicación de catálogo
- **THEN** sus reseñas no suman

Rationale: Mercado Libre replica el mismo bloque de reseñas en todos los miembros de una familia.

### Requirement: Lectura del bloque de reseñas
El generador SHALL tratar «Sin reviews aún.» y «Sin datos de reviews.» como ausencia de reseñas y SHALL quitar del texto de cada comentario el sufijo `[L likes]`, `[D dislikes]` o `[L likes, D dislikes]`.

#### Scenario: Reseñas no disponibles
- **WHEN** el bloque dice «Sin datos de reviews.»
- **THEN** la ficha no trae `reviews` y el build no falla

#### Scenario: Sufijo de votos
- **WHEN** un comentario termina en `[3 likes, 1 dislikes]`
- **THEN** el texto publicado no contiene el sufijo

### Requirement: Precio referencial y fecha
El generador SHALL publicar como `precioReferencial` el precio original cuando la línea de precio trae `(precio original $Y)` y si no el precio, como entero en CLP; una familia SHALL tomar el precio de su primer miembro y cada miembro el suyo; `fechaPrecio` SHALL ser la fecha de `_Generado el` de `empresa.md`.

#### Scenario: Precio con original
- **WHEN** la línea es `Precio: $8.000 (precio original $10.000)`
- **THEN** `precioReferencial: 10000`

#### Scenario: Fecha del barrido
- **WHEN** `empresa.md` dice `_Generado el 2026-10-01 00:17:16_`
- **THEN** `fechaPrecio: 2026-10-01`

Rationale: el sitio no publica precios rebajados; el precio vigente se ve en Mercado Libre.

### Requirement: Condición del producto
El generador SHALL emitir `condicion` con el valor de `Condición` del barrido (`new`, `used` o `refurbished`); una familia SHALL tomar la de su primer miembro activo.

#### Scenario: Producto nuevo
- **WHEN** la publicación declara `Condición: new`
- **THEN** la ficha tiene `condicion: new`

### Requirement: Limpieza de la descripción
Del bloque Descripción el generador SHALL derivar un cuerpo sin párrafos de plantilla («¡bienvenid…», «somos una tienda online…», «aquí tienes la redacción…», `---`) ni líneas-etiqueta y cortado antes de «condiciones de venta»; `faqs` desde «preguntas frecuentes» (formatos `P:`/`R:`, `¿…?` o línea terminada en `?`); `caracteristicas` desde las viñetas; `incluye` desde la lista tras «qué incluye» o «contenido del paquete» o desde frases «el/este/cada kit|set|pack… incluye»; y `resumen` con las 2 primeras oraciones del primer párrafo que no es viñeta.

#### Scenario: Condiciones de venta
- **WHEN** la descripción trae «Condiciones de venta: …»
- **THEN** el cuerpo termina antes de esa línea

#### Scenario: Preguntas frecuentes
- **WHEN** la descripción trae «Preguntas frecuentes: P: a R: b»
- **THEN** `faqs` es `[{pregunta: "a", respuesta: "b"}]`

#### Scenario: Frase de contenido del kit
- **WHEN** la descripción dice «El kit incluye 2 fundas, 4 grips y 1 estuche.»
- **THEN** `incluye` tiene 3 ítems

### Requirement: Imágenes de producto
El generador SHALL convertir las imágenes a WebP calidad 80 dentro de 800×800 sin agrandar, a lo más 7 por producto simple, por variante y por miembro, nombradas `01.webp`, `02.webp`… en `src/assets/images/productos/<slug>/[<variante>|<itemId>/]`, omitiendo con aviso las que no existen; toda ruta referenciada por una ficha MUST existir.

#### Scenario: Más de siete imágenes
- **WHEN** la publicación trae 9 imágenes
- **THEN** se escriben 7 WebP

#### Scenario: Sin agrandar
- **WHEN** una fuente mide 1600×1200 y otra 400×300
- **THEN** salen de 800×600 y 400×300

#### Scenario: Imagen faltante
- **WHEN** falta la segunda imagen listada
- **THEN** se omite con aviso y la numeración sigue sin hueco

### Requirement: Frontmatter conforme al contrato
Cada ficha de `content/productos/<slug>.md` SHALL llevar el frontmatter de esta tabla y el build MUST fallar si una ficha no valida el esquema de la colección `productos`.

| Campo | Tipo | Presencia |
| --- | --- | --- |
| `titulo`, `slug` | string | siempre |
| `categoria` | slug de `site.json` `categorias` | siempre |
| `tipo` | `simple` \| `variantes` \| `familia` | siempre |
| `permalink` | URL | siempre |
| `precioReferencial` | entero > 0 (CLP) | siempre |
| `fechaPrecio` | `AAAA-MM-DD` | siempre |
| `condicion` | `new` \| `used` \| `refurbished` | siempre |
| `resumen` | string | siempre |
| `imagenes` | string[] bajo `src/assets/images/` | siempre |
| `caracteristicas`, `incluye` | string[] | si no vacíos |
| `faqs` | `{pregunta, respuesta}[]` | si no vacío |
| `reviews` | `{promedio 1..5, cantidad, distribucion{"1".."5"}, comentarios[{estrellas 1..5, titulo, texto, fecha}]}` | si hay reseñas |
| `variantes` | `{nombre, atributo, link, imagenes}[]` | `tipo: variantes` |
| `miembros` | `{titulo, link, precio, imagenes, atributos{color?, diseno?}}[]` | familia genérica |
| `grupos` | `{diseno, colores[{color, link, imagenes}]}[]` | familia agrupada |
| `etiquetaGrupo`, `etiquetaOpcion` | string | familia agrupada con `etiquetas` |

#### Scenario: Precio inválido
- **WHEN** una ficha trae `precioReferencial: 0`
- **THEN** `astro build` falla

#### Scenario: Reseñas fuera de rango
- **WHEN** una ficha trae `reviews.promedio: 6`
- **THEN** `astro build` falla

### Requirement: Fichas sin stock
Las fichas MUST NOT contener stock, cantidad disponible ni vendidos.

#### Scenario: Stock en el barrido
- **WHEN** el barrido trae stock y vendidos
- **THEN** ninguna ficha contiene esos valores

### Requirement: Reseñas agregadas del sitio
El generador SHALL escribir `src/data/resenas.json` calculado sobre las fichas con reseñas propias (no de publicación de catálogo): `totalReviews` como suma, `promedioGeneral` como promedio ponderado a 2 decimales, `destacadas` con los comentarios de 4★ o más ordenados por largo de texto descendente, a lo más 1 por ficha y 8 en total, y `mercadolibre` con nivel, transacciones y página oficial de `empresa.md`.

| Campo | Tipo |
| --- | --- |
| `mercadolibre` | `{nivel, transacciones, url}` |
| `promedioGeneral` | número |
| `totalReviews` | entero |
| `destacadas` | `{productoSlug, productoTitulo, estrellas, titulo, texto, fecha}[]` |

#### Scenario: Reseñas de catálogo excluidas
- **WHEN** una ficha simple viene de publicación de catálogo con reseñas
- **THEN** no suma a `totalReviews` ni aporta destacadas

#### Scenario: Una destacada por ficha
- **WHEN** una ficha tiene 3 comentarios de 5★
- **THEN** aporta solo el más largo

### Requirement: Consistencia de categorías y fichas
Todo slug de `categorias[].productos` de `src/data/site.json` MUST existir como ficha y toda ficha MUST estar declarada exactamente una vez, en la categoría que dice su frontmatter.

#### Scenario: Ficha nueva sin declarar
- **WHEN** el generador produce una ficha que `site.json` no declara
- **THEN** la suite falla

#### Scenario: Categoría discordante
- **WHEN** una ficha dice `categoria: audio` y `site.json` la declara en otra categoría
- **THEN** la suite falla
