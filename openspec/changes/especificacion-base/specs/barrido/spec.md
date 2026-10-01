## ADDED Requirements

### Requirement: Configuración por entorno
El barrido SHALL leer su configuración del entorno y de `.env` en la raíz del repo; una variable ya exportada MUST prevalecer sobre el archivo, y un `AGAS_ML_USER_ID` no numérico MUST terminar el proceso con mensaje y sin escribir.

| Variable | Default | Uso |
| --- | --- | --- |
| `AGAS_ML_USER_ID` | `3016787556` | fila de `ml_account` |
| `AGAS_CONTEXT_DIR` | `../agas-context` relativo a la raíz | default de `--output`; la misma variable la lee el generador |
| `AGAS_PG_CONTAINER` / `AGAS_PG_USER` / `AGAS_PG_DB` | `pg-dev` / `agas` / `mi_app_ml` | `docker exec … psql --csv` |

#### Scenario: El entorno manda sobre el archivo
- **WHEN** `.env` define `AGAS_PG_DB=x` y el entorno exporta `AGAS_PG_DB=y`
- **THEN** las consultas usan la base `y`

#### Scenario: Id de vendedor inválido
- **WHEN** `AGAS_ML_USER_ID=abc`
- **THEN** el proceso termina con código distinto de 0 y no crea el directorio de salida

### Requirement: Lectura de la base de mi-app-ml
El barrido SHALL obtener cuenta, publicaciones, variantes y familias virtuales con `docker exec <contenedor> psql -U <usuario> -d <base> --csv`; un contenedor ausente, un timeout de 30 s o un error SQL MUST terminar el proceso mostrando el stderr de `psql`.

#### Scenario: Contenedor caído
- **WHEN** `docker exec` devuelve código distinto de 0
- **THEN** el proceso termina con «Database container … is not running or the query failed» y el stderr recibido

#### Scenario: Cuenta inexistente
- **WHEN** la consulta de `ml_account` no devuelve filas
- **THEN** el proceso termina con «No ml_account row found…»

### Requirement: Token vigente antes de escribir
El barrido MUST abortar antes de crear el directorio de salida si `token_expires_at` es menor o igual al instante actual en UTC.

#### Scenario: Token vencido
- **WHEN** `token_expires_at` ya pasó
- **THEN** el proceso termina con «Access token … expired» y el directorio de `--output` no se crea

### Requirement: Universo de publicaciones
El barrido SHALL procesar todas las filas de `listing` de la cuenta en orden de id, como familias (`virtual_family` con sus miembros) o como sueltas (las que no son miembro de ninguna familia); con `--only` SHALL procesar solo los ids indicados, como sueltas.

#### Scenario: Miembro de familia
- **WHEN** una publicación es miembro de una familia virtual
- **THEN** se escribe dentro de la carpeta `familia-…/` y no como carpeta suelta

#### Scenario: Ids repetibles y separados por coma
- **WHEN** se pasa `--only A,B --only C`
- **THEN** se procesan exactamente A, B y C como sueltas

### Requirement: La base manda sobre la API
El barrido SHALL tomar título, estado, permalink, catálogo, familia, `user_product_id`, precio, stock, vendidos y SKU de la base, y de la API de Mercado Libre solo cuando el campo de la base viene vacío; `original_price` y la condición SHALL venir solo de la API.

#### Scenario: Estado discordante
- **WHEN** la base dice `active` y la API `closed`
- **THEN** `publicacion.md` declara `Estado: active`

#### Scenario: Precio ausente en la base
- **WHEN** la base no trae precio
- **THEN** se usa el precio de la API

### Requirement: Datos de la API de Mercado Libre
El barrido SHALL consultar por publicación `/items/{id}`, `/items/{id}/description`, `/seller-promotions/items/{id}?app_version=v2` y `/reviews/item/{id}` paginado de a 50, y `/users/{id}` para `empresa.md`; una descripción 404 MUST quedar como «Sin descripción.» sin registrar error, y un 4xx de promociones o de reseñas MUST NOT contar como error.

#### Scenario: Reseñas paginadas
- **WHEN** una publicación tiene 120 reseñas
- **THEN** se piden 3 páginas de 50

#### Scenario: Descripción inexistente
- **WHEN** la descripción responde 404
- **THEN** el bloque Descripción dice «Sin descripción.» y la corrida no registra error

### Requirement: Publicación no disponible
Una publicación cuyo `/items/{id}` responde 403 o 404 SHALL informarse en el resumen como no disponible, MUST NOT contar como error, MUST NOT escribirse y su carpeta MUST NOT quedar protegida de la poda; cualquier otra respuesta distinta de 200 SHALL registrarse como error y omitir la publicación.

#### Scenario: Publicación eliminada que la base sigue listando
- **WHEN** la base lista X y `/items/X` responde 403 en un barrido completo sin otros errores
- **THEN** el resumen lista X como no disponible, la corrida no tiene errores y la carpeta previa de X se poda

#### Scenario: Error del servidor
- **WHEN** `/items/X` responde 500 tras agotar los reintentos
- **THEN** el resumen lista el error de X y la poda se omite

### Requirement: Reintentos con backoff
Cada petición HTTP SHALL reintentarse hasta 3 intentos ante 429, 500, 502, 503, 504 o excepción de red, esperando `0.3·2^(n-1) + U(0, 0.3)` segundos o `Retry-After` si es mayor; agotados los intentos MUST devolver la última respuesta o lanzar `RuntimeError` si solo hubo excepciones.

#### Scenario: Retry-After respetado
- **WHEN** la API responde 429 con `Retry-After: 2`
- **THEN** la espera antes del siguiente intento es de al menos 2 s

#### Scenario: Excepciones seguidas
- **WHEN** los tres intentos lanzan excepción de red
- **THEN** se lanza `RuntimeError`

### Requirement: Estructura y contrato de salida
El barrido SHALL escribir bajo `--output` la estructura y el formato de esta tabla, con carpetas de slug ASCII de a lo más 40 caracteres; es el contrato que consume el generador del catálogo.

| Ruta bajo `--output` | Contenido |
| --- | --- |
| `empresa.md` | `# <nickname>`, `**Seller ID:**`, `**Tienda:**`, `**Página oficial:**`, `**Nivel:**`, `**Transacciones totales:**`, `**Transacciones completadas:**`, totales por estado y `_Generado el AAAA-MM-DD HH:MM:SS_` |
| `indice.md` | tabla de publicaciones y familias |
| `publicaciones/familia-<slug>/publicacion.md` | `# Familia: <nombre>` y un `## <título>` por miembro |
| `publicaciones/familia-<slug>/<MLC>-<slug>/imagenes/NN-<pictureId>.jpg` | imágenes de cada miembro |
| `publicaciones/<MLC>-<slug>/publicacion.md` | `# <título>` de una publicación suelta |
| `…/variante-<slug>-<variationId>/imagenes/NN-<pictureId>.jpg` | imágenes por variante |

| Elemento de `publicacion.md` que consume el generador | Formato |
| --- | --- |
| `- **ML Item ID:**` | `MLC…` |
| `- **Link:**` | permalink |
| `- **Estado:**` | `active`, `closed`, `paused`… |
| `- **Condición:**` | `new`, `used`… |
| `- **Catálogo:**` | `Sí` o `No` |
| `- **Familia ML:**` | `<nombre> (user_product_id <id>)` |
| `- **Precio:**` | `$X` con miles separados por punto, más ` (precio original $Y)` si la API trae `original_price` distinto |
| `### Descripción` | texto plano o «Sin descripción.» |
| `### Promociones y cupones` | lista de referencia o «Sin promociones vigentes al …» |
| `### Reviews` | `N.N★ — T reviews, C con comentario`, distribución `- k★: n`, comentarios `- ★★★ «título» — texto (AAAA-MM-DD)` con sufijo opcional `[L likes, D dislikes]`; o «Sin reviews aún.» o «Sin datos de reviews.» |
| `### Variantes` | tabla `Atributos \| Precio \| Stock \| SKU \| Carpeta` |
| `### Imágenes por variante`, `### Imágenes sin variante asignada`, `### Imágenes` | `**<etiqueta>**` y lista `- <ruta>` |

#### Scenario: Carpeta de publicación suelta
- **WHEN** se barre «Lámina Vidrio Switch 2» con id `MLC1`
- **THEN** existe `publicaciones/MLC1-lamina-vidrio-switch-2/publicacion.md`

#### Scenario: Precio original
- **WHEN** la API trae `original_price` distinto del precio
- **THEN** la línea de precio termina en `(precio original $Y)`

#### Scenario: Sin reseñas
- **WHEN** el total de reseñas es 0
- **THEN** el bloque Reviews dice «Sin reviews aún.»

### Requirement: Imágenes y videos
El barrido SHALL descargar imágenes de forma atómica (archivo temporal y reemplazo), saltar las existentes salvo `--force-images`, no descargar ninguna con `--skip-images` y exportar `video_id` como referencia salvo `--skip-videos`; `--skip-images` junto a `--force-images` MUST terminar el proceso.

#### Scenario: Imagen existente
- **WHEN** la imagen ya existe en disco y no se pasa `--force-images`
- **THEN** no se pide a la red y cuenta como saltada

#### Scenario: Flags excluyentes
- **WHEN** se pasan `--skip-images` y `--force-images`
- **THEN** el proceso termina con «mutually exclusive»

### Requirement: Poda conservadora
El barrido SHALL eliminar de `publicaciones/` las carpetas fuera del conjunto protegido solo en un barrido completo, con listado de la base no vacío y cero errores; el conjunto protegido MUST calcularse antes de las consultas a la API a partir de lo que la corrida pretende escribir, y con `--only` MUST NOT podar.

#### Scenario: Corrida con errores
- **WHEN** la corrida registra un error
- **THEN** no se borra ninguna carpeta y el resumen dice que se omite la poda

#### Scenario: Listado vacío
- **WHEN** la base no lista publicaciones
- **THEN** no se borra ninguna carpeta y el resumen lo informa

#### Scenario: Corrida limpia
- **WHEN** la corrida termina sin errores y existe una carpeta que no corresponde a ninguna publicación listada
- **THEN** la carpeta se borra y cuenta en «Carpetas obsoletas eliminadas»

### Requirement: Resumen de la corrida
El barrido SHALL imprimir al final publicaciones procesadas, familias, imágenes descargadas y saltadas, videos, publicaciones no disponibles, carpetas obsoletas eliminadas y la lista de errores.

#### Scenario: Errores listados
- **WHEN** la corrida registra errores
- **THEN** cada uno aparece en el resumen con su publicación

### Requirement: Página oficial desde los datos del sitio
El barrido SHALL escribir la «Página oficial» de `empresa.md` desde `mercadolibre.paginaOficial` de `src/data/site.json`.

#### Scenario: URL cambiada en los datos
- **WHEN** `site.json` cambia `mercadolibre.paginaOficial`
- **THEN** el siguiente barrido escribe la URL nueva en `empresa.md`

### Requirement: Escritura acotada al directorio de salida
El barrido SHALL escribir solo bajo el directorio de `--output`.

#### Scenario: Salida a un directorio temporal
- **WHEN** corre con `--output <tmp>`
- **THEN** ningún archivo fuera de `<tmp>` cambia
