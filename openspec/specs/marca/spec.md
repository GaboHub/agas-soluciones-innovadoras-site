# marca Specification

## Purpose
Tokens, tipografía, assets y generadores de la identidad visual.

## Requirements

### Requirement: Tokens de rol como única paleta de la UI
La UI SHALL usar solo los tokens de rol de `@theme` en `src/styles/global.css`; ningún archivo `*.astro`, `*.tsx`, `*.ts` o `*.css` de `src/` fuera de `global.css` MUST contener un color literal (hex, `rgb[a]()`, `hsl[a]()`).

| Token | Valor | Rol |
| --- | --- | --- |
| `primario` / `primario-oscuro` / `primario-claro` | `#24455c` / `#16303f` / `#dce6ed` | marca, superficies oscuras, CTA |
| `acento` / `acento-oscuro` | `#9e5220` / `#8a4517` | estrellas y detalles; `acento-oscuro` para texto sobre claro |
| `destacado` / `destacado-oscuro` | `#e9c49a` / `#7a5220` | realces; sobre claro, `destacado-oscuro` |
| `tinta` | `#14232e` | texto |
| `fondo` | `#f5f3f0` | superficie |
| `meli-tinta` | `#2d3277` | azul de Mercado Libre, solo en elementos de Mercado Libre |

#### Scenario: Escaneo de fuentes
- **WHEN** se escanea `src/` salvo `global.css`
- **THEN** no hay colores literales

### Requirement: Contraste AA de los pares de tokens
Cada par permitido de texto y superficie SHALL tener contraste de al menos 4.5:1 calculado desde los valores de `@theme`; ningún componente MUST usar como texto un token sobre una superficie fuera de esta tabla.

| Texto | Superficies |
| --- | --- |
| `tinta`, `primario`, `primario-oscuro`, `acento-oscuro`, `destacado-oscuro`, `meli-tinta` | `fondo`, `white`, `primario-claro` |
| `acento` | `fondo`, `white` |
| `white`, `fondo`, `primario-claro`, `destacado` | `primario`, `primario-oscuro` |

#### Scenario: Tabla calculada
- **WHEN** se calcula el contraste de cada par de la tabla desde `global.css`
- **THEN** todos dan al menos 4.5:1

#### Scenario: Token degradado
- **WHEN** un valor de `@theme` cambia y un par de la tabla baja de 4.5:1
- **THEN** la suite falla

### Requirement: Tipografía
Los titulares SHALL usar Sora 600 o 700 y el cuerpo Inter 400, 600 o 700, importadas en `global.css`; MUST NOT usarse `font-extrabold` ni pesos fuera de esos.

#### Scenario: Escaneo de pesos
- **WHEN** se escanea `src/`
- **THEN** no aparece `font-extrabold` ni `font-black`

### Requirement: Firma baldosa AGAS
El isotipo SHALL dibujarse con `rx="24"` en `public/favicon.svg` y en los dos lockups de `src/assets/images/`, y los elementos de la UI que lo citan SHALL usar `rounded-[26%]`.

#### Scenario: Radio del isotipo
- **WHEN** se leen el favicon y los lockups
- **THEN** los tres declaran `rx="24"`

### Requirement: Colores de los assets de marca
Los hex de `public/favicon.svg`, de los lockups y de los scripts de marca MUST pertenecer a los valores de `@theme` más `#FFFFFF` y `#C8813F` (y `#000000` solo en la medición de texto de los scripts); la bajada «SOLUCIONES INNOVADORAS» SHALL ser `primario` sobre superficies claras y `primario-claro` sobre oscuras; el travesaño de la «A» SHALL ser `#9E5220` sobre claro y `#C8813F` sobre oscuro; `#C8813F` MUST NOT ser token de `@theme` y SHALL usarse solo en elementos gráficos o en texto de 24 px o más.

#### Scenario: Hex permitidos
- **WHEN** se barren los hex de los assets y scripts de marca
- **THEN** todos pertenecen al conjunto permitido

#### Scenario: Bajada del lockup
- **WHEN** se lee el lockup para fondo claro
- **THEN** la bajada usa el hex de `primario`

Rationale: `#C8813F` da 3.20:1 sobre `primario`, suficiente para gráficos y texto grande.

### Requirement: Paleta de los scripts igual a la de la UI
Las constantes de paleta de `scripts/generar-marca-ml.mjs` y `scripts/generar-marca-redes.mjs` MUST tener, para cada rol que repiten, el mismo hex que `@theme`.

#### Scenario: Token cambiado
- **WHEN** cambia `--color-primario` y no la paleta de un script
- **THEN** la suite falla

### Requirement: Rasters de marca generados
Los rasters de esta tabla SHALL producirse solo con `node scripts/generar-marca-ml.mjs` y `node scripts/generar-marca-redes.mjs`, con estas dimensiones, menos de 10 MB cada uno y de forma determinista.

| Archivo | Px | Script |
| --- | --- | --- |
| `marca/mercadolibre/logo.png` | 1000×1000 | `generar-marca-ml.mjs` |
| `marca/mercadolibre/banner-escritorio.png` | 3840×200 | `generar-marca-ml.mjs` |
| `marca/mercadolibre/banner-movil.png` | 1440×320 | `generar-marca-ml.mjs` |
| `public/apple-touch-icon.png` | 180×180 | `generar-marca-ml.mjs` |
| `public/logo.png`, `src/assets/images/logo.png` | 512×512 | `generar-marca-ml.mjs` |
| `marca/redes/avatar.png` | 1080×1080 | `generar-marca-redes.mjs` |
| `marca/redes/carrusel-presentacion-{1..6}.png` | 1080×1350 | `generar-marca-redes.mjs` |

#### Scenario: Dimensiones comprometidas
- **WHEN** se leen los PNG del repo
- **THEN** cada uno tiene las dimensiones de la tabla y pesa menos de 10 MB

#### Scenario: Determinismo
- **WHEN** un script corre dos veces sobre un directorio de salida temporal
- **THEN** los PNG de ambas corridas son idénticos byte a byte

### Requirement: Guardas de los generadores de marca
Cada script de marca SHALL terminar con código 1, sin escribir rasters, ante: archivo de fuente Sora ausente o cuya tabla `name` no declara la familia Sora y el estilo del archivo (nombre de familia `Sora` o `Sora <estilo>`), fuente Sora no aplicada (render igual al de `serif`; en redes, además, Bold igual a SemiBold), render vacío de cualquier raster (ningún píxel distinto del fondo), primera oración de `hero.bajada` no extraíble, texto que excede su caja, dimensiones de salida distintas de la tabla o peso de 10 MB o más; el de redes además ante un número de categorías distinto de 3.

#### Scenario: Render vacío
- **WHEN** el render de un raster no tiene ningún píxel distinto del fondo
- **THEN** el script termina con código 1

#### Scenario: Fuente ausente
- **WHEN** Sora no está disponible y el render es igual al de `serif`
- **THEN** el script termina con código 1

#### Scenario: Fuente inválida
- **WHEN** los archivos de Sora existen pero no son fuentes válidas de la familia Sora
- **THEN** el script termina con código 1 sin escribir ningún PNG

### Requirement: Textos de los assets desde los datos
Los textos de identidad y las cifras de los assets SHALL salir de `src/data/site.json`: los banners de Mercado Libre usan `hero.chip` y `envio`; el carrusel usa `hero.titulo`, `hero.acentuada`, `hero.chip`, la primera oración de `hero.bajada`, `sellosConfianza`, `direccion.localidad`, `dominio`, una frase de presentación propia de `site.json` y, por categoría, `nombre`, `resumen` y la cantidad de productos. Los rótulos de sección de las láminas pueden vivir en el script.

#### Scenario: Copy cambiado
- **WHEN** cambia `hero.chip` en `site.json`
- **THEN** el siguiente render de banners y carrusel usa el texto nuevo

#### Scenario: Conteo por categoría
- **WHEN** una categoría pasa a tener otra cantidad de productos
- **THEN** la lámina de catálogo del carrusel muestra la cantidad nueva

### Requirement: Avatar sin baldosa
`marca/redes/avatar.png` SHALL llevar el monograma sobre el degradado acero sin la baldosa, con todo píxel de luminancia mayor que 140 dentro del círculo inscrito.

#### Scenario: Monograma dentro del círculo
- **WHEN** se mide el PNG comprometido
- **THEN** ningún píxel de luminancia mayor que 140 queda fuera del círculo de radio 540 centrado

Rationale: el recorte circular de las redes se come las esquinas de la baldosa.

### Requirement: Carpeta marca fuera del build
Nada de `marca/` SHALL publicarse en el sitio.

#### Scenario: Ruta de marca
- **WHEN** se pide `/marca/redes/avatar.png` al sitio construido
- **THEN** responde 404

### Requirement: Hero de marca
La constelación del hero SHALL animarse solo bajo `prefers-reduced-motion: no-preference` y detenerse a más tardar a los 5 s de cargar; su leyenda MUST NOT intersectar ninguna de las cuatro baldosas en escritorio ni en móvil, y las tarjetas de categoría de la home SHALL usar el glifo SVG de su slug.

#### Scenario: Leyenda libre
- **WHEN** se abre `/` en escritorio y en móvil
- **THEN** el rectángulo de la leyenda no intersecta el de ninguna baldosa

#### Scenario: Animación acotada
- **WHEN** se abre `/` sin preferencia de movimiento reducido y pasan 5 s
- **THEN** no queda ninguna animación en curso en la constelación

#### Scenario: Movimiento reducido
- **WHEN** se abre `/` con `prefers-reduced-motion: reduce`
- **THEN** no hay animaciones en curso

### Requirement: Copy de identidad agnóstico de categoría
`tagline`, `descripcion`, `hero.titulo` y `hero.bajada` de `site.json` SHALL definir a AGAS por su criterio de selección y nombrar el rubro actual solo con el marcador temporal «hoy»; ningún texto público MUST aludir a una expansión futura del giro.

#### Scenario: Marcador temporal
- **WHEN** se leen los cuatro campos
- **THEN** `descripcion` y `hero.bajada` contienen «hoy» y ninguno contiene «accesorios tech» ni «tienda de accesorios de tecnología»
