# seo-geo Specification

## Purpose
Indexación, metadatos, datos estructurados, `llms.txt` y acceso de rastreadores del sitio.

## Requirements

### Requirement: Sitio estático canónico
El sitio SHALL generarse 100 % estático con origen `https://agassoluciones.cl` y URLs con barra final, y toda página indexable SHALL declarar `link[rel=canonical]` absoluto a su propia URL en ese origen.

#### Scenario: Canonical de cada página
- **WHEN** se abre cualquier URL del sitemap
- **THEN** su canonical es absoluto, está en `https://agassoluciones.cl`, termina en `/` y es igual a la URL abierta

### Requirement: Metadatos por página
Toda página SHALL tener `html[lang=es-CL]`, `title` no vacío, `meta description` no vacía de a lo más 160 caracteres, canonical (o `meta robots` con `noindex` y sin canonical en la 404), Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` absoluta en JPG o PNG de a lo más 630 px de ancho, con `og:image:width` y `og:image:height` iguales a las dimensiones reales del archivo y `og:locale` `es_CL`), Twitter `summary_large_image`, `favicon.svg` y `apple-touch-icon.png`.

#### Scenario: Páginas del sitemap
- **WHEN** se abre cualquier URL del sitemap
- **THEN** cumple todos los metadatos anteriores

#### Scenario: Página 404
- **WHEN** se abre una ruta inexistente
- **THEN** la página trae `noindex` y no trae canonical

### Requirement: Títulos y descripciones únicos
Ninguna pareja de páginas indexables SHALL compartir `title` ni `meta description`.

#### Scenario: Recorrido del sitemap
- **WHEN** se recorren todas las URL del sitemap
- **THEN** no hay dos con el mismo `title` ni con la misma `meta description`

### Requirement: Descripción propia de cada ficha
`src/data/textos-productos.json` (`{ <slug>: { descripcion, metaDescription } }`) MUST tener exactamente una entrada por ficha; la ficha SHALL usar `descripcion` como texto visible y como `description` de su JSON-LD, y `metaDescription` de a lo más 160 caracteres como `meta description`; ningún texto MUST citar un promedio de estrellas ni una cantidad de reseñas distintos de los de la ficha.

#### Scenario: Ficha sin texto propio
- **WHEN** existe una ficha sin entrada en `textos-productos.json`
- **THEN** la suite falla

#### Scenario: Meta de la ficha
- **WHEN** se abre una ficha
- **THEN** su `meta description` es igual a su `metaDescription`

#### Scenario: Estrellas inventadas
- **WHEN** un texto cita «4.9★» y la ficha tiene otro promedio o no tiene reseñas
- **THEN** la suite falla

### Requirement: JSON-LD por tipo de página
Cada página SHALL emitir los bloques JSON-LD de esta tabla y ninguno con valores `undefined` o `null`; `Organization` SHALL llevar `@id` `https://agassoluciones.cl/#organizacion`, `name`, `legalName`, `url`, `logo` absoluto, `address` (localidad, región y país de `site.json`) y `sameAs` con la tienda y la página oficial de Mercado Libre; ningún bloque MUST ser `LocalBusiness` ni `Service`, y la home MUST NOT llevar `aggregateRating` ni `Review`.

| Página | JSON-LD |
| --- | --- |
| `/` | `Organization`, `WebSite` |
| `/productos/` | `Organization`, `ItemList` |
| `/productos/<slug>/` | `Organization`, `Product` o `ProductGroup`, `BreadcrumbList`, `FAQPage` si la ficha trae `faqs` |
| `/categorias/<slug>/` | `Organization`, `ItemList` |
| `/guias/` | `Organization` |
| `/guias/<slug>/` | `Organization`, `Article` |
| `/preguntas-frecuentes/` | `Organization`, `FAQPage` |
| `/promociones/` | `Organization`, `FAQPage`, un `SaleEvent` por campaña publicable |
| `/contacto/`, `/terminos-y-condiciones/`, 404 | `Organization` |

#### Scenario: Home
- **WHEN** se abre `/`
- **THEN** hay `Organization` y `WebSite` y ningún `aggregateRating`

#### Scenario: Tipos por página
- **WHEN** se abre cualquier URL del sitemap
- **THEN** los `@type` de sus bloques son exactamente los de la tabla para su tipo de página

### Requirement: Oferta de producto
Toda `Offer` SHALL llevar `url` al link de Mercado Libre de su opción, `price` igual al precio referencial, `priceCurrency` `CLP`, `availability` `https://schema.org/InStock`, `itemCondition` mapeado desde `condicion` (`new` → `NewCondition`, `used` → `UsedCondition`, `refurbished` → `RefurbishedCondition`) y `seller` con `@id` de la organización.

#### Scenario: Oferta completa
- **WHEN** se serializa la oferta de una ficha con `condicion: new`
- **THEN** trae `availability` `InStock`, `itemCondition` `NewCondition` y `seller` `{"@id": "https://agassoluciones.cl/#organizacion"}`

Rationale: el sitio publica solo publicaciones activas en Mercado Libre, que son las que tienen stock disponible.

### Requirement: Producto simple
Una ficha `simple` SHALL emitir `Product` con `name`, `description`, `brand`, hasta 4 imágenes absolutas, una `Offer` y `aggregateRating` solo si la ficha tiene reseñas con cantidad mayor que 0.

#### Scenario: Sin reseñas
- **WHEN** la ficha no tiene reseñas
- **THEN** el `Product` no trae `aggregateRating`

#### Scenario: Con reseñas
- **WHEN** la ficha tiene 10 reseñas con promedio 4.8
- **THEN** `aggregateRating` trae `ratingValue: 4.8` y `reviewCount: 10`

### Requirement: Grupo de productos con variantes
Una ficha `variantes` o `familia` SHALL emitir `ProductGroup` con `name`, `description`, `brand`, imágenes, `productGroupID` igual al slug, `variesBy` con las propiedades de schema.org que distinguen sus opciones (`Color` → `https://schema.org/color`, `Diseño` → `https://schema.org/pattern`; un eje sin propiedad equivalente no se declara) (si ningún eje tiene equivalente, `variesBy` se omite) y un `hasVariant` por opción de compra, cada uno `Product` con `name` «<título> (<opción>)» (en una familia agrupada, «<título> (<grupo>, <opción>)»), su imagen principal, el valor de cada eje declarado y una `Offer` con el link y el precio de esa opción; `aggregateRating` va en el `ProductGroup` solo si la ficha tiene reseñas.

#### Scenario: Familia agrupada
- **WHEN** una ficha con ejes «Diseño» y «Color» tiene 2 diseños con 9 colores cada uno
- **THEN** el `ProductGroup` trae `variesBy` con `pattern` y `color` y 18 `hasVariant`, cada uno con su `pattern`, su `color` y una `Offer` a su link

#### Scenario: Ejes sin equivalente
- **WHEN** una familia agrupada declara los ejes «Funda» y «Grips»
- **THEN** el `ProductGroup` no trae `variesBy` y cada `hasVariant` se llama «<título> (<funda>, <grips>)»

#### Scenario: Variantes por color
- **WHEN** una ficha `variantes` tiene atributo `Color` con 3 valores
- **THEN** `variesBy` es `["https://schema.org/color"]` y hay 3 `hasVariant`

#### Scenario: Opciones iguales al selector
- **WHEN** se abre una ficha con variantes
- **THEN** cada `Offer.url` de `hasVariant` es el link de una opción del selector visible y cada opción tiene su `hasVariant`

### Requirement: Miga de pan
La ficha SHALL mostrar «Inicio › <categoría> › <producto>» y emitir un `BreadcrumbList` con los mismos nombres, posiciones 1 a 3, `item` absoluto en las dos primeras y sin `item` en la última.

#### Scenario: Miga visible igual al JSON-LD
- **WHEN** se abre una ficha
- **THEN** los nombres del `BreadcrumbList` son los de la miga visible, en el mismo orden

### Requirement: FAQPage solo con preguntas visibles
Una página SHALL emitir `FAQPage` solo si todas sus preguntas están visibles en la misma página; la home muestra preguntas frecuentes sin emitir `FAQPage`.

#### Scenario: Página de preguntas frecuentes
- **WHEN** se abre `/preguntas-frecuentes/`
- **THEN** cada `Question.name` del `FAQPage` es texto visible de la página

#### Scenario: Home
- **WHEN** se abre `/`
- **THEN** no hay `FAQPage`

### Requirement: SaleEvent por campaña publicable
`/promociones/` SHALL emitir un `SaleEvent` por campaña publicable con `name`, `description`, `startDate` igual a `desde`, `endDate` igual a `hasta`, `eventAttendanceMode` online y `location` virtual con la URL de la tienda, sin `offers` ni precios.

#### Scenario: Campaña próxima
- **WHEN** hay una campaña próxima
- **THEN** existe su `SaleEvent` con sus fechas y sin `offers`

### Requirement: Article de cada guía
Cada guía SHALL emitir `Article` con `headline`, `description`, `inLanguage` `es-CL`, `publisher` (la organización), `mainEntityOfPage` igual a su canonical, `datePublished` y `dateModified` desde `publicado` y `actualizado` de su frontmatter.

#### Scenario: Fechas de la guía
- **WHEN** una guía declara `publicado: 2026-08-10` y `actualizado: 2026-09-02`
- **THEN** su `Article` trae `datePublished: 2026-08-10` y `dateModified: 2026-09-02`

### Requirement: ItemList en listados
`/productos/` y cada `/categorias/<slug>/` SHALL emitir `ItemList` con un `ListItem` por ficha listada, con `position` desde 1 en el orden visible y `url` absoluta de la ficha.

#### Scenario: Orden visible
- **WHEN** se abre una categoría
- **THEN** las `url` del `ItemList` son las de sus tarjetas, en el mismo orden

### Requirement: Contenido legible sin JavaScript
El HTML servido de cada ficha SHALL contener, sin ejecutar JavaScript, el título, la descripción, el precio referencial con su fecha, el nombre de cada opción de compra y el enlace a Mercado Libre de la opción inicial.

#### Scenario: Ficha sin JavaScript
- **WHEN** se carga una ficha con JavaScript deshabilitado
- **THEN** el documento contiene su título, su precio, el nombre de cada opción y un enlace a `mercadolibre.cl`

### Requirement: Acceso de rastreadores
`robots.txt` SHALL declarar `User-agent: *`, `Allow: /`, `Content-Signal: search=yes, ai-input=yes` y `Sitemap: https://agassoluciones.cl/sitemap-index.xml`, y MUST NOT contener ninguna regla `Disallow` ni bloqueo de agentes de IA.

#### Scenario: robots.txt servido
- **WHEN** se pide `/robots.txt`
- **THEN** responde 200 con esas líneas y sin `Disallow`

### Requirement: Sitemap con fechas reales
`sitemap-index.xml` SHALL listar toda página indexable y ninguna página `noindex`; `lastmod` SHALL salir solo de fuentes fechadas y omitirse en las demás páginas.

| Página | `lastmod` |
| --- | --- |
| `/productos/<slug>/` | `fechaPrecio` de la ficha |
| `/`, `/productos/`, `/categorias/<slug>/` | la mayor `fechaPrecio` de las fichas que lista |
| `/guias/<slug>/` | `actualizado` de la guía |
| `/guias/` | la mayor `actualizado` de las guías |
| resto | sin `lastmod` |

#### Scenario: Ficha
- **WHEN** una ficha tiene `fechaPrecio: 2026-10-01`
- **THEN** su entrada del sitemap trae `lastmod` 2026-10-01

#### Scenario: Página sin fuente fechada
- **WHEN** se lee la entrada de `/contacto/`
- **THEN** no trae `lastmod`

#### Scenario: Sin 404
- **WHEN** se lee el sitemap
- **THEN** no hay ninguna URL de la página 404 y toda URL listada responde 200

### Requirement: llms.txt construido con el sitio
`/llms.txt` SHALL generarse en cada build desde la colección de fichas, la de guías, `src/data/site.json` y `src/data/promociones.json`, con esta estructura en Markdown.

| Bloque | Formato |
| --- | --- |
| Cabecera | `# <site.nombre>`, `> <site.descripcion>`, líneas `Tienda en Mercado Libre: <mercadolibre.tienda>` y `Página oficial en Mercado Libre: <mercadolibre.paginaOficial>` |
| `## Catálogo` | un `### <nombre de categoría>` por categoría de `site.json`, en su orden, y bajo cada uno una línea por ficha en el orden declarado: `- [<titulo>](https://agassoluciones.cl/productos/<slug>/): precio referencial $<miles es-CL> al <DD-MM-AAAA>; en Mercado Libre: <permalink>` |
| `## Guías` | si hay guías, ordenadas por título: `- [<titulo>](https://agassoluciones.cl/guias/<slug>/): <descripcion>` |
| `## Promociones` | ver requirement de promociones en `llms.txt` |
| `## Más información` | `- [Preguntas frecuentes](https://agassoluciones.cl/preguntas-frecuentes/)` y `- [Contacto](https://agassoluciones.cl/contacto/)` |

#### Scenario: Una línea por ficha
- **WHEN** se construye el sitio
- **THEN** `/llms.txt` tiene una línea de catálogo por ficha, bajo el encabezado de su categoría, y ninguna otra

#### Scenario: Datos de cabecera
- **WHEN** se lee la cabecera
- **THEN** la descripción y las URL son exactamente las de `site.json`

#### Scenario: Sin guías
- **WHEN** no hay guías
- **THEN** no hay sección `## Guías`

### Requirement: Promociones en llms.txt
La sección `## Promociones` de `/llms.txt` SHALL enlazar `https://agassoluciones.cl/promociones/` y listar las promociones publicables con la misma clasificación que la página: `- Cupón: <nombre>, <porcentaje>% (<estado> del <DD-MM-AAAA> al <DD-MM-AAAA>)` y `- Campaña: <nombre> (<estado> del <DD-MM-AAAA> al <DD-MM-AAAA>)`, con `<estado>` «vigente» o «próximamente»; sin publicables SHALL decir que no hay promociones activas.

#### Scenario: Campaña próxima
- **WHEN** se construye antes de `desde` de una campaña
- **THEN** su línea dice «próximamente» y no «vigente»

#### Scenario: Campaña vencida
- **WHEN** se construye después de `hasta` de una campaña
- **THEN** la campaña no aparece
