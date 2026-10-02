# sitio Specification

## Purpose
Rutas, fichas, navegación y datos de negocio de la vitrina estática hacia Mercado Libre.

## Requirements

### Requirement: Rutas generadas desde datos
El sitio SHALL generar una ficha `/productos/<slug>/` por archivo de `content/productos/`, una página `/categorias/<slug>/` por categoría de `src/data/site.json` (el build MUST fallar si falta su `content/paginas/<slug>.md`), una guía `/guias/<slug>/` por archivo de `content/guias/`, más `/`, `/productos/`, `/guias/`, `/promociones/`, `/preguntas-frecuentes/`, `/contacto/`, `/terminos-y-condiciones/` y la página 404.

#### Scenario: Cada ficha tiene su ruta
- **WHEN** se construye el sitio
- **THEN** cada archivo de `content/productos/` tiene su `/productos/<slug>/` y cada categoría de `site.json` su `/categorias/<slug>/`

#### Scenario: Ruta inexistente
- **WHEN** se pide una ruta que no existe
- **THEN** responde la página 404

### Requirement: Precio referencial con fecha y sin stock
Las fichas y las tarjetas SHALL mostrar el precio como `$` con miles separados por punto, y la ficha SHALL acompañarlo de «Precio referencial al DD-MM-AAAA — ver precio vigente en Mercado Libre»; ninguna página MUST mostrar stock ni cantidad disponible.

#### Scenario: Formato del precio
- **WHEN** una ficha tiene `precioReferencial: 4490` y `fechaPrecio: 2026-10-01`
- **THEN** muestra «$4.490» y «Precio referencial al 01-10-2026 — ver precio vigente en Mercado Libre»

#### Scenario: Sin stock
- **WHEN** se lee el contenido principal de cualquier ficha
- **THEN** no contiene «stock»

### Requirement: Opciones de compra por tipo de ficha
La ficha SHALL construir grupos y opciones de compra así: con `grupos`, un grupo por diseño con una opción por color, precio base y ejes `etiquetaGrupo` (default «Diseño») y `etiquetaOpcion` (default «Color»); con `miembros`, un grupo con una opción por miembro llamada `atributos.color` o, si falta, su título, con precio propio y eje «Opción»; con `variantes`, un grupo con una opción por variante, precio base y eje igual al `atributo` de la primera; sin ninguno, una opción con el permalink. La opción inicial SHALL ser la primera del primer grupo.

#### Scenario: Familia agrupada
- **WHEN** la ficha tiene 2 diseños con 9 colores cada uno
- **THEN** hay 2 grupos de 9 opciones con ejes «Diseño» y «Color»

#### Scenario: Miembro sin color
- **WHEN** un miembro no trae `atributos.color`
- **THEN** su opción se llama como su título

#### Scenario: Destinos de compra
- **WHEN** se construyen las opciones de cualquier ficha
- **THEN** todas apuntan a `mercadolibre.cl` y la opción inicial tiene link

### Requirement: Selector y CTA de la ficha
El CTA principal de la ficha (`data-cta="ver-en-mercado-libre"`) SHALL apuntar al link de la opción activa con `target=_blank` y `rel=noopener`; el selector de grupo SHALL existir solo con más de un grupo y el de opción solo con más de una opción; con más de 10 opciones el selector SHALL ser un `<select>` y si no botones con `aria-pressed`; elegir otro grupo SHALL volver a su primera opción, y la galería SHALL mostrar las fotos de la opción activa.

#### Scenario: Cambio de color
- **WHEN** se elige otro color
- **THEN** el `href` del CTA cambia al link de ese color

#### Scenario: Cambio de grupo
- **WHEN** se elige otro diseño
- **THEN** la opción activa vuelve a la primera de ese diseño y el CTA apunta a su link

#### Scenario: Muchas opciones
- **WHEN** una ficha tiene 12 variantes
- **THEN** el selector es un `<select>` y no hay botones con esos nombres

### Requirement: Burbuja de Mercado Libre
Toda página SHALL mostrar en todos los viewports un enlace fijo abajo a la derecha (`#burbuja-mercadolibre`, `target=_blank`, `rel=noopener`) que lleva a la tienda con la etiqueta `ctaHeader`; en una ficha SHALL llevar al link de la opción activa con la etiqueta `ctaBurbujaProducto` y seguir al CTA cuando cambia la opción.

#### Scenario: Fuera de una ficha
- **WHEN** se abre `/`
- **THEN** la burbuja apunta a la tienda y su nombre accesible es `ctaHeader`

#### Scenario: Ficha con opción cambiada
- **WHEN** en una ficha se elige otra opción
- **THEN** el `href` de la burbuja es igual al del CTA principal

#### Scenario: Móvil
- **WHEN** el viewport es móvil
- **THEN** la burbuja es visible dentro del cuadrante inferior derecho

Rationale: la compra se cierra en la publicación y variante exactas de Mercado Libre.

### Requirement: Galería de la ficha
La galería SHALL mostrar una foto principal cargada con `fetchpriority=high` y miniaturas que la reemplazan (`aria-pressed`); la foto principal SHALL abrir un visor modal con cerrar, anterior y siguiente, que se cierra con Escape y devuelve el foco al control que lo abrió; cada foto SHALL llevar alt «Foto N de <alt>».

#### Scenario: Miniatura
- **WHEN** se activa la tercera miniatura
- **THEN** la foto principal pasa a ser la tercera y su miniatura queda con `aria-pressed=true`

#### Scenario: Visor modal
- **WHEN** se abre el visor y se pulsa Escape
- **THEN** el visor se cierra y el foco vuelve al botón que lo abrió

### Requirement: Buscador del catálogo
`/productos/` SHALL listar todas las fichas sin consulta y, con consulta, solo las que contienen todos sus términos normalizados (minúsculas, sin tildes) en el título, el nombre de la categoría o sus atributos (nombres de variantes, valores de `atributos` de miembros, diseños y colores); sin resultados SHALL mostrar «No encontramos productos para tu búsqueda» y un botón que restablece el catálogo.

#### Scenario: Sin tildes ni mayúsculas
- **WHEN** se busca «LAMINA»
- **THEN** aparecen las fichas cuyo título contiene «Lámina»

#### Scenario: Atributo de familia
- **WHEN** se busca «camo urbano»
- **THEN** aparece la familia que tiene ese diseño

#### Scenario: Sin resultados
- **WHEN** se busca «zzz-no-existe» y se activa «Ver catálogo completo»
- **THEN** vuelven a listarse todas las fichas

### Requirement: Orden de productos
Los listados SHALL ordenar las fichas según el orden de `categorias[].productos` de `site.json`.

#### Scenario: Catálogo
- **WHEN** se abre `/productos/`
- **THEN** las tarjetas siguen el orden de `site.json`

### Requirement: Home
La home SHALL mostrar el hero de `site.hero` con su palabra `acentuada` resaltada y sus sellos de confianza, una tarjeta por categoría con su glifo, las 4 fichas con más reseñas, el resumen de `resenas.json` («<promedio con 1 decimal> de 5 estrellas con <total> reseñas…») con las reseñas destacadas enlazadas a su ficha, 3 preguntas frecuentes globales y un enlace a la tienda.

#### Scenario: Estructura
- **WHEN** se abre `/`
- **THEN** hay un solo `h1` igual a `hero.titulo` y una tarjeta por categoría de `site.json`

#### Scenario: Más reseñadas
- **WHEN** hay más de 4 fichas con reseñas
- **THEN** la home muestra las 4 de mayor cantidad de reseñas

#### Scenario: Reseñas destacadas
- **WHEN** se abre `/`
- **THEN** cada reseña destacada enlaza a la ficha de su `productoSlug`

### Requirement: Página de categoría
Cada categoría SHALL mostrar el contenido de su `content/paginas/<slug>.md`, sus fichas y enlaces a las demás categorías; su `og:image` SHALL ser la primera imagen de su primera ficha.

#### Scenario: Interlinking
- **WHEN** se abre una categoría
- **THEN** lista sus fichas y enlaza a cada una de las otras categorías

### Requirement: Navegación global
El header SHALL ser `sticky` y enlazar Inicio, Productos, Promociones, Guías, Preguntas frecuentes, Contacto y la tienda; en móvil el menú SHALL ser un `<details>` que se cierra al elegir un enlace, al tocar fuera o con Escape. El footer SHALL enlazar catálogo, categorías, tienda, página oficial, Instagram, promociones, guías, preguntas frecuentes, contacto y términos, y mostrar ubicación, cobertura, el correo de ventas por volumen y la razón social.

#### Scenario: Enlaces del header
- **WHEN** se abre cualquier página en escritorio
- **THEN** el header enlaza las seis secciones y la tienda

#### Scenario: Menú móvil
- **WHEN** el menú móvil está abierto y se elige un enlace
- **THEN** el menú se cierra

#### Scenario: Footer
- **WHEN** se abre cualquier página
- **THEN** el footer enlaza todas las superficies listadas y el Instagram oficial

### Requirement: Contacto y ventas por volumen
`/contacto/` SHALL enlazar la tienda, la página oficial y el Instagram y mostrar `contacto.ventasVolumen` con un enlace `mailto:` a `contacto.email`; el footer SHALL repetir ese `mailto:`.

#### Scenario: Correo de ventas
- **WHEN** se abre `/contacto/`
- **THEN** hay un enlace `mailto:` a `contacto.email` de `site.json`

### Requirement: Guías
Cada guía SHALL tener el frontmatter de esta tabla y publicarse con un `h1`, título `metaTitulo` o si falta `titulo`, y enlaces a sus productos relacionados, que MUST existir como fichas; `/guias/` SHALL listarlas todas, y la ficha de un producto citado SHALL mostrar «Guías que te pueden servir» con un enlace a cada guía que lo cita.

| Campo | Tipo |
| --- | --- |
| `titulo`, `slug`, `descripcion` | string |
| `metaTitulo` | string opcional |
| `publicado`, `actualizado` | `AAAA-MM-DD`, `actualizado ≥ publicado` |
| `productosRelacionados` | slugs de fichas |

#### Scenario: Producto citado
- **WHEN** una guía cita `lamina-vidrio-nintendo-switch`
- **THEN** esa ficha enlaza a la guía

#### Scenario: Slug inexistente
- **WHEN** una guía cita un slug que no es ficha
- **THEN** la suite falla

### Requirement: Reseñas en la ficha
Con `reviews.cantidad` mayor que 0, la ficha SHALL mostrar estrellas con promedio y cantidad, la distribución por nivel y los comentarios que tienen texto.

#### Scenario: Ficha con reseñas
- **WHEN** una ficha tiene reseñas con comentarios
- **THEN** muestra su promedio, su distribución y cada comentario con texto

### Requirement: Caché de assets con hash
Los archivos de `/_astro/*` SHALL servirse con `Cache-Control: public, max-age=31536000, immutable`.

#### Scenario: Cabeceras del build
- **WHEN** se construye el sitio
- **THEN** `dist/_headers` declara esa cabecera para `/_astro/*`

### Requirement: Layout de la ficha
Desde el breakpoint `md` la ficha SHALL mostrarse en dos columnas, con la galería a la izquierda y el precio y el CTA a la derecha.

#### Scenario: Escritorio
- **WHEN** se abre una ficha a 1280 px
- **THEN** la galería queda a la izquierda del precio y del CTA en la misma fila

### Requirement: Datos de negocio fuera de los componentes
URLs externas, correos, precios, promociones, textos de identidad y los textos de los CTA que llevan a Mercado Libre SHALL venir de `src/data/*.json` o de `content/`; ningún archivo de `src/components`, `src/layouts` o `src/pages` MUST contener URLs de Mercado Libre o de Instagram ni correos. Los CTA hacia Mercado Libre usan `ctaHeader` (tienda: header, burbuja por defecto, campañas, reseñas de la home y página de promociones sin publicables), `ctaBurbujaProducto`, `ctaFicha` (CTA principal de la ficha), `ctaCupon` (cupones) y `ctaPaginaOficial` (enlace a la página oficial en contacto); el botón de tienda de contacto usa `ctaHeader`. El microcopy de navegación interna puede vivir en los componentes.

#### Scenario: Escaneo de fuentes
- **WHEN** se escanean `src/components`, `src/layouts` y `src/pages`
- **THEN** no hay URLs `http(s)://` salvo las de `schema.org`, `googletagmanager.com` y `w3.org`, ni direcciones de correo

#### Scenario: Textos de CTA
- **WHEN** se abre una ficha y la página de promociones
- **THEN** el texto del CTA principal es `ctaFicha` y el de cada cupón es `ctaCupon`

### Requirement: Venta solo en Mercado Libre
El sitio MUST NOT ofrecer carrito, checkout ni formularios de pago; toda acción de compra SHALL llevar al permalink de la publicación, o de su variante, en Mercado Libre.

#### Scenario: Sin formularios
- **WHEN** se recorre el build
- **THEN** ninguna página tiene un `<form>`

Rationale: Mercado Libre no permite precargar un carrito desde un sitio externo; el permalink con variante es el destino más preciso.
