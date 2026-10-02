# interfaz Specification

## Purpose
Accesibilidad, legibilidad y comportamiento responsive de la UI.

## Requirements

### Requirement: Contraste del texto renderizado
Todo texto visible, incluidos los placeholders, SHALL tener contraste de al menos 4.5:1 contra el fondo sobre el que se compone (3:1 si mide 24 px o más, o 18.66 px o más en negrita); las utilidades de texto con opacidad MUST NOT bajar de `/70` sobre `tinta` o `white`.

#### Scenario: Páginas de muestra
- **WHEN** se analiza con la regla `color-contrast` de axe la home, el catálogo, una ficha simple, una ficha de familia, promociones, una guía y contacto, en móvil y en escritorio
- **THEN** no hay violaciones

#### Scenario: Escaneo de utilidades
- **WHEN** se escanea `src/`
- **THEN** no hay `text-tinta/NN`, `text-white/NN` ni `placeholder:text-*/NN` con `NN` menor que 70

### Requirement: Foco visible y no tapado
Todo elemento del orden de tabulación SHALL mostrar al enfocarse con teclado un `outline` propio de al menos 2 px con contraste de al menos 3:1 contra la superficie donde aparece, y MUST NOT quedar tapado por el header sticky ni por la burbuja; el documento SHALL reservar `scroll-padding-top` de al menos la altura del header.

#### Scenario: Retroceso con Shift+Tab
- **WHEN** se recorre cada página de muestra con Shift+Tab en móvil y en escritorio
- **THEN** en cada paso el rectángulo del elemento enfocado no intersecta el del header

#### Scenario: Indicador propio
- **WHEN** un enlace o botón recibe foco de teclado
- **THEN** su `outline-style` no es `none` ni `auto` y su `outline-width` es de al menos 2 px

### Requirement: Enlace para saltar al contenido
Cada página SHALL tener como primer elemento enfocable un enlace «Saltar al contenido» que es visible al enfocarse y lleva el foco a `<main id="contenido">`, que queda fuera del orden de tabulación (`tabindex="-1"`) y sin outline.

#### Scenario: Primer Tab
- **WHEN** se carga cualquier página y se pulsa Tab
- **THEN** el foco queda en un enlace visible a `#contenido`

#### Scenario: Activación
- **WHEN** se activa ese enlace
- **THEN** el foco queda en `main`

### Requirement: Anuncio de cambios dinámicos
El buscador SHALL anunciar en una región `role="status"` la cantidad de resultados o el mensaje de búsqueda vacía tras cada cambio de consulta, y la ficha SHALL anunciar en una región `aria-live="polite"` el precio y la opción activa cuando cambia la opción.

#### Scenario: Búsqueda
- **WHEN** se escribe una consulta en el buscador
- **THEN** la región de estado contiene «N productos» o el mensaje sin resultados

#### Scenario: Cambio de opción
- **WHEN** se elige otra opción en una ficha
- **THEN** la región `polite` contiene el nombre de la opción y su precio

### Requirement: Objetivos táctiles
En viewport móvil, todo enlace, botón, `summary` y `select` visible fuera de un párrafo de texto SHALL ofrecer un área activable de al menos 44×44 px, y dos objetivos de menos de 44 px de alto MUST quedar separados por al menos 8 px.

#### Scenario: Recorrido móvil
- **WHEN** se miden los objetivos de cada página de muestra a 390×844
- **THEN** cada uno fuera de un párrafo tiene un área activable de al menos 44×44 px

#### Scenario: Chips de variante
- **WHEN** se mide un chip de opción de una ficha en móvil
- **THEN** su alto es de al menos 44 px

#### Scenario: Footer y menú
- **WHEN** se miden los enlaces del footer y del menú móvil
- **THEN** cumplen el área mínima o la separación de 8 px

### Requirement: Cursor en controles
Todo `button`, `select` y `summary` habilitado SHALL mostrar `cursor: pointer`.

#### Scenario: Controles de la ficha
- **WHEN** se inspeccionan los botones y el `select` de una ficha y del visor
- **THEN** su cursor calculado es `pointer`

### Requirement: Imágenes del primer viewport
Ninguna imagen que intersecta el primer viewport MUST cargarse con `loading="lazy"`, y ninguna imagen SHALL servirse con un ancho natural mayor que el doble de su ancho mostrado por la densidad de píxeles, salvo que traiga `srcset`.

#### Scenario: Logo y primera fila
- **WHEN** se carga cualquier página de muestra en móvil y en escritorio
- **THEN** el logo y las imágenes visibles sin hacer scroll no son `lazy`

#### Scenario: Miniaturas
- **WHEN** se carga una ficha
- **THEN** cada miniatura trae `srcset` o un ancho natural de a lo más el doble de su ancho mostrado por la densidad

#### Scenario: Toda imagen de las páginas de muestra
- **WHEN** se cargan las páginas de muestra con densidad 1 en móvil y en escritorio
- **THEN** cada imagen visible trae `srcset` o un ancho natural de a lo más el doble de su ancho mostrado

### Requirement: Íconos SVG sin emoji
Los íconos de la UI SHALL ser SVG con `currentColor` y `aria-hidden="true"`, y los de controles, viñetas, flechas y datos de contacto SHALL salir de un único set de trazo uniforme; ningún texto visible fuera de las reseñas de clientes MUST contener emoji, y ningún nombre accesible de enlace, botón o encabezado MUST contener emoji ni glifos usados como ícono (✕, ✔, ★, +, →, ←, ›).

#### Scenario: Recorrido de páginas
- **WHEN** se recorren las páginas de muestra
- **THEN** ningún nodo de texto fuera de las reseñas contiene `\p{Extended_Pictographic}`

#### Scenario: Nombres accesibles
- **WHEN** se calculan los nombres accesibles de enlaces, botones y encabezados
- **THEN** ninguno contiene emoji ni glifos de ícono

### Requirement: Header de una fila
Desde 768 px de ancho el header SHALL ocupar una sola fila de a lo más 72 px de alto con todos sus elementos dentro del viewport, y en ningún ancho MUST superar el 20 % del alto de la ventana en orientación horizontal.

#### Scenario: Anchos intermedios
- **WHEN** se mide el header a 768, 820, 844, 900 y 1100 px de ancho
- **THEN** mide a lo más 72 px de alto y ningún elemento suyo excede el borde derecho

#### Scenario: Móvil apaisado
- **WHEN** se mide el header a 844×390
- **THEN** su alto es de a lo más 78 px

### Requirement: Reflow sin scroll horizontal
Ninguna página SHALL tener elementos fuera del viewport horizontal a 320, 390, 768, 820, 1024 y 1280 px de ancho.

#### Scenario: Recorrido de anchos
- **WHEN** se abre cada página de muestra en cada ancho
- **THEN** todo elemento visible cumple `left ≥ 0` y `right ≤ innerWidth`

### Requirement: Elementos fijos sin tapar contenido
La burbuja SHALL respetar las safe areas (`max(1.25rem, env(safe-area-inset-*))`) y el final de cada página SHALL reservar espacio para que, con el scroll al máximo, la burbuja no intersecte ningún texto ni objetivo.

#### Scenario: Final de página en móvil
- **WHEN** se hace scroll al final de cualquier página a 390×844
- **THEN** el rectángulo de la burbuja no intersecta ninguna línea de texto ni objetivo

### Requirement: Visor modal centrado
El visor de fotos SHALL abrirse centrado en el viewport.

#### Scenario: Centrado
- **WHEN** se abre el visor en móvil y en escritorio
- **THEN** sus márgenes izquierdo y derecho difieren en a lo más 1 px, y también el superior y el inferior

### Requirement: Unidades de viewport dinámicas
Las alturas relativas al viewport SHALL usar unidades dinámicas (`dvh`).

#### Scenario: Escaneo de fuentes
- **WHEN** se escanea `src/`
- **THEN** no hay `min-h-screen`, `h-screen` ni valores arbitrarios en `vh`

### Requirement: Texto legible en móvil
En viewport móvil todo `input` y `select` SHALL tener tamaño de fuente de al menos 16 px, y el resumen de la ficha también.

#### Scenario: Selector de opciones
- **WHEN** se mide el `select` de opciones de una ficha a 390 px
- **THEN** su tamaño de fuente es de al menos 16 px

### Requirement: Largo de línea
Los párrafos y elementos de lista de la prosa SHALL limitarse a 70 caracteres por línea (`max-width: 70ch`).

#### Scenario: Guía en escritorio
- **WHEN** se mide la prosa de una guía a 1280 px
- **THEN** ningún párrafo supera 75 caracteres por línea

### Requirement: Interlineado
Todo párrafo, elemento de lista o cita de más de 60 caracteres SHALL tener interlineado de al menos 1.5.

#### Scenario: Texto chico
- **WHEN** se miden los párrafos de las páginas de muestra
- **THEN** cada uno de más de 60 caracteres tiene `lineHeight / fontSize` de al menos 1.5

### Requirement: Movimiento reducido
Con `prefers-reduced-motion: reduce`, el scroll SHALL ser instantáneo y ningún elemento MUST animar transformaciones en hover ni en transiciones.

#### Scenario: Preferencia activa
- **WHEN** se abre cada página de muestra con `prefers-reduced-motion: reduce`
- **THEN** `scroll-behavior` de `html` es `auto` y ningún elemento tiene transición de `transform` con duración mayor que 0

### Requirement: Estado activo de la navegación
El enlace del header y del menú móvil de la sección actual SHALL llevar `aria-current="page"` y distinguirse del resto por algo más que el color; una ficha o una guía SHALL marcar su sección padre.

#### Scenario: Ficha
- **WHEN** se abre `/productos/<slug>/`
- **THEN** el enlace «Productos» del header y del menú móvil tiene `aria-current="page"` y un indicador visual distinto del color

#### Scenario: Sección raíz
- **WHEN** se abre `/promociones/`
- **THEN** solo el enlace «Promociones» tiene `aria-current="page"`

### Requirement: Estado de búsqueda y opción en la URL
Escribir una consulta en el buscador SHALL reflejarla en `?q=` y elegir una opción en la ficha en `?opcion=<slug de la opción>`, con `history.replaceState`; cargar una URL con esos parámetros SHALL restaurar el mismo estado, y el canonical MUST seguir siendo la URL sin parámetros.

#### Scenario: Búsqueda compartida
- **WHEN** se carga `/productos/?q=lamina`
- **THEN** el campo contiene «lamina» y se listan solo los resultados de esa búsqueda

#### Scenario: Opción compartida
- **WHEN** se carga una ficha con `?opcion=` de su segunda opción
- **THEN** la opción activa y el CTA son los de esa opción y el canonical no trae parámetros
